using BuildingBlocks.Endpoints;
using BuildingBlocks.Messaging.IntegrationEvents;
using InventoryModule.Application.Stock;
using InventoryModule.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Claims;

namespace InventoryModule.Application.Purchasing;

/// <summary>
/// Phần ghi sổ của <see cref="GoodsReceiptService"/>: chạy BÊN TRONG transaction của sổ cái —
/// bút toán nhập, serial, tiến độ nhận của PO, phiếu trả hàng lỗi và sự kiện cho kế toán.
/// Tách file để mỗi nửa ở dưới ngưỡng 200 dòng.
/// </summary>
public sealed partial class GoodsReceiptService
{
    private async Task<GoodsReceiptResult> PostAsync(
        GoodsReceivedNote grn,
        PurchaseOrder? po,
        IReadOnlyDictionary<Guid, ProductReceiptFacts> facts,
        Guid? defectiveWarehouseId,
        ClaimsPrincipal user,
        CancellationToken ct)
    {
        var ctx = StockLedgerContext.From(
            user, grn.Id.ToString(), "GRN", grn.DocumentNumber, $"Nhập kho theo phiếu {grn.DocumentNumber}");

        var lines = new List<GoodsReceiptLineResult>();
        var returnItems = new List<PurchaseReturnItem>();
        var serialCount = 0;
        var accepted = 0;
        var rejected = 0;

        foreach (var line in grn.Items)
        {
            var (acceptedQty, rejectedQty) = SplitInspection(line);
            var fact = facts[line.ProductId];
            var warehouseId = line.TargetWarehouseId ?? grn.WarehouseId
                ?? throw new DomainException("Phiếu nhập chưa chỉ định kho nhận hàng.");

            if (acceptedQty > 0)
            {
                var entry = await _ledger.ReceiveAsync(
                    new StockLocation(line.ProductId, null, warehouseId),
                    acceptedQty, line.UnitCost, ctx, StockMovementReason.GoodsReceipt, ct);

                var existing = await ExistingSerialsAsync(line, ct);
                var serials = GoodsReceiptSerials.Build(
                    line, fact, acceptedQty, warehouseId, grn.PurchaseOrderId, existing);
                if (serials.Count > 0)
                {
                    _db.SerialNumbers.AddRange(serials);
                    serialCount += serials.Count;
                }

                po?.Items.FirstOrDefault(i => i.ProductId == line.ProductId)?.Receive(acceptedQty);

                lines.Add(new GoodsReceiptLineResult(
                    line.ProductId, fact.Name, acceptedQty, rejectedQty,
                    line.UnitCost, entry.AverageCost, warehouseId));
            }
            else
            {
                lines.Add(new GoodsReceiptLineResult(
                    line.ProductId, fact.Name, 0, rejectedQty, line.UnitCost, 0m, warehouseId));
            }

            if (rejectedQty > 0)
            {
                if (defectiveWarehouseId is not null)
                {
                    await _ledger.ReceiveAsync(
                        new StockLocation(line.ProductId, null, defectiveWarehouseId.Value),
                        rejectedQty, line.UnitCost, ctx with
                        {
                            Notes = $"Hàng lỗi phiếu {grn.DocumentNumber}: {line.RejectReason}"
                        },
                        StockMovementReason.GoodsReceipt, ct);
                }

                returnItems.Add(new PurchaseReturnItem(
                    line.ProductId, fact.Name, rejectedQty, line.UnitCost, line.RejectReason, line.SerialNumbers));
            }

            accepted += acceptedQty;
            rejected += rejectedQty;
        }

        grn.Status = GRNStatus.Confirmed;
        po?.ApplyReceiptProgress();

        Guid? returnId = null;
        if (returnItems.Count > 0 && grn.SupplierId.HasValue)
        {
            var autoReturn = new PurchaseReturn(
                grn.SupplierId.Value, returnItems, grn.Id, grn.PurchaseOrderId,
                $"Tự sinh từ phiếu nhập {grn.DocumentNumber}");
            _db.PurchaseReturns.Add(autoReturn);
            returnId = autoReturn.Id;
        }

        await _db.SaveChangesAsync(ct);

        if (po is not null)
            await PublishReceivedAsync(grn, po, facts, ct);

        return new GoodsReceiptResult(
            grn.Id, grn.DocumentNumber, grn.PurchaseOrderId, po?.Status.ToString(),
            accepted, rejected, serialCount, returnId, lines);
    }

    /// <summary>
    /// Chia số nhận thành đạt/lỗi. Dòng đã kiểm phải thoả <c>accepted + rejected == quantity</c>;
    /// dòng chưa kiểm (cả hai bằng 0) coi như đạt toàn bộ, giữ đúng luồng "bỏ qua bước kiểm".
    /// </summary>
    private static (int Accepted, int Rejected) SplitInspection(GRNItem line)
    {
        if (line.Quantity <= 0)
            throw new DomainException($"Dòng hàng \"{line.ProductName}\" có số lượng không hợp lệ.");

        if (line.AcceptedQty == 0 && line.RejectedQty == 0)
            return (line.Quantity, 0);

        if (line.AcceptedQty + line.RejectedQty != line.Quantity)
            throw new DomainException(
                $"Dòng \"{line.ProductName}\": tổng kiểm ({line.AcceptedQty}+{line.RejectedQty}) phải bằng số nhận ({line.Quantity}).");

        return (line.AcceptedQty, line.RejectedQty);
    }

    private async Task<IReadOnlyCollection<string>> ExistingSerialsAsync(GRNItem line, CancellationToken ct)
    {
        var serials = GoodsReceiptSerials.Parse(line.SerialNumbers);
        if (serials.Count == 0) return Array.Empty<string>();

        return await _db.SerialNumbers
            .Where(s => serials.Contains(s.Serial))
            .Select(s => s.Serial)
            .ToListAsync(ct);
    }

    /// <summary>
    /// <c>POReceivedEvent</c> — W2-14 (kế toán) nghe để ghi công nợ NCC và hoá đơn mua vào.
    /// D01 mục 7: giá mua là giá CHƯA VAT, nên <c>VatRate</c> đi kèm từng dòng để bên kia tự tính.
    /// </summary>
    private async Task PublishReceivedAsync(
        GoodsReceivedNote grn,
        PurchaseOrder po,
        IReadOnlyDictionary<Guid, ProductReceiptFacts> facts,
        CancellationToken ct)
    {
        var items = grn.Items
            .Select(i => new POItemDto(
                i.ProductId,
                facts.TryGetValue(i.ProductId, out var f) ? f.Name : i.ProductName,
                i.AcceptedQty + i.RejectedQty == 0 ? i.Quantity : i.AcceptedQty,
                i.UnitCost,
                0m))
            .Where(i => i.Quantity > 0)
            .ToList();

        try
        {
            await _bus.Publish(new POReceivedEvent(
                po.Id, po.PONumber, po.SupplierId, grn.Id, items,
                items.Sum(i => i.Quantity * i.UnitPrice), DateTime.UtcNow), ct);
        }
        catch (Exception ex)
        {
            // Bút toán kho đã commit; không được ném lỗi bus ra ngoài làm hỏng phiếu nhập.
            _logger.LogWarning(ex, "Không publish được POReceivedEvent cho phiếu nhập {Grn}", grn.DocumentNumber);
        }
    }
}
