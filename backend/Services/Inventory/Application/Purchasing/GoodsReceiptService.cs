using System.Security.Claims;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Messaging.IntegrationEvents;
using InventoryModule.Application.Stock;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace InventoryModule.Application.Purchasing;

/// <summary>Kết quả xác nhận một phiếu nhập — đủ để FE hiển thị mà không phải query lại.</summary>
public sealed record GoodsReceiptResult(
    Guid GrnId,
    string DocumentNumber,
    Guid? PurchaseOrderId,
    string? PoStatus,
    int AcceptedTotal,
    int RejectedTotal,
    int SerialsCreated,
    Guid? PurchaseReturnId,
    IReadOnlyList<GoodsReceiptLineResult> Lines);

public sealed record GoodsReceiptLineResult(
    Guid ProductId,
    string ProductName,
    int AcceptedQty,
    int RejectedQty,
    decimal UnitCost,
    decimal AverageCostAfter,
    Guid WarehouseId);

/// <summary>
/// W2-12 bước 1 — xác nhận phiếu nhập kho. Đây là ĐƯỜNG NHẬP KHO DUY NHẤT từ nhà cung cấp
/// (ngoại lệ duy nhất là tồn đầu kỳ, D10).
///
/// <para>
/// Trước W2-12 việc xác nhận GRN gọi thẳng <c>InventoryItem.AdjustStock()</c>: không đặt giá vốn
/// (<c>AverageCost</c> đứng ở 0 nên COGS và giá trị tồn kho đều sai), không sinh serial, không
/// cập nhật số đã nhận hay trạng thái PO, và không publish gì cho Kế toán. Toàn bộ những việc đó
/// nằm ở đây, trong MỘT transaction của sổ cái.
/// </para>
/// </summary>
public sealed partial class GoodsReceiptService
{
    private readonly InventoryDbContext _db;
    private readonly IStockLedger _ledger;
    private readonly GoodsReceiptCatalogFacts _catalogFacts;
    private readonly IPublishEndpoint _bus;
    private readonly ILogger<GoodsReceiptService> _logger;

    public GoodsReceiptService(
        InventoryDbContext db,
        IStockLedger ledger,
        GoodsReceiptCatalogFacts catalogFacts,
        IPublishEndpoint bus,
        ILogger<GoodsReceiptService> logger)
    {
        _db = db;
        _ledger = ledger;
        _catalogFacts = catalogFacts;
        _bus = bus;
        _logger = logger;
    }

    public async Task<GoodsReceiptResult> ConfirmAsync(Guid grnId, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var grn = await _db.GoodsReceivedNotes.Include(g => g.Items).FirstOrDefaultAsync(g => g.Id == grnId, ct)
            ?? throw NotFoundException.For("phiếu nhập kho", grnId);

        return await ConfirmLoadedAsync(grn, user, ct);
    }

    /// <summary>
    /// Xác nhận một phiếu ĐÃ nằm trong ChangeTracker (nhập nhanh D10 tạo PO + GRN rồi xác nhận
    /// ngay trong cùng transaction).
    /// </summary>
    public async Task<GoodsReceiptResult> ConfirmLoadedAsync(
        GoodsReceivedNote grn, ClaimsPrincipal user, CancellationToken ct = default)
    {
        if (grn.Status != GRNStatus.Draft)
            throw new ConflictException("Chỉ phiếu nhập ở trạng thái nháp mới được xác nhận.");
        if (grn.Items.Count == 0)
            throw new DomainException("Phiếu nhập phải có ít nhất một dòng hàng.");
        if (grn.Source == GRNSource.Purchase && grn.PurchaseOrderId is null)
            throw new DomainException(
                "Phiếu nhập từ nhà cung cấp phải gắn với một đơn mua hàng. Dùng \"Nhập nhanh\" nếu mua trực tiếp không qua đơn đặt.");

        var facts = await _catalogFacts.LoadAsync(grn.Items.Select(i => i.ProductId).Distinct().ToList(), ct);
        var missing = grn.Items.Where(i => !facts.ContainsKey(i.ProductId)).Select(i => i.ProductId).Distinct().ToList();
        if (missing.Count > 0)
            throw new RequestValidationException("items", $"Sản phẩm không tồn tại: {string.Join(", ", missing)}.");

        var po = grn.PurchaseOrderId is null
            ? null
            : await _db.PurchaseOrders.Include(p => p.Items)
                .FirstOrDefaultAsync(p => p.Id == grn.PurchaseOrderId.Value, ct);
        if (grn.PurchaseOrderId is not null && po is null)
            throw new RequestValidationException("purchaseOrderId", "Đơn mua hàng không tồn tại.");

        if (po is not null)
        {
            // Kiểm duyệt là kiểm soát gian lận của mua hàng: một đơn chưa duyệt / đã từ chối / đã
            // huỷ mà vẫn nhập được hàng thì hạn mức duyệt chỉ còn là trang trí. Chỉ đơn đã đi qua
            // duyệt (Approved/Sent) hoặc đang nhận dở (PartialReceived) mới được ghi phiếu nhập.
            if (po.Status is POStatus.Draft or POStatus.PendingApproval or POStatus.Rejected or POStatus.Cancelled)
                throw new ConflictException(
                    $"Đơn mua hàng {po.PONumber} đang ở trạng thái {po.Status} — phải được duyệt trước khi nhập kho.");

            // NCC trên phiếu nhập phải đúng NCC của đơn: khác nhau nghĩa là công nợ sẽ ghi sai người.
            if (grn.SupplierId.HasValue && grn.SupplierId.Value != po.SupplierId)
                throw new RequestValidationException(
                    "supplierId", "Nhà cung cấp của phiếu nhập không khớp nhà cung cấp của đơn mua hàng.");
        }

        var defectiveWarehouseId = await _db.Warehouses
            .Where(w => w.Type == WarehouseType.Defective && w.IsActive)
            .Select(w => (Guid?)w.Id)
            .FirstOrDefaultAsync(ct);

        return await _ledger.InTransactionAsync(
            token => PostAsync(grn, po, facts, defectiveWarehouseId, user, token), ct);
    }
}
