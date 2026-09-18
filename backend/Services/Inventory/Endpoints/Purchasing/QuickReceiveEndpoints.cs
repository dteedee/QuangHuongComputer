using BuildingBlocks.Documents;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using BuildingBlocks.Validation;
using Catalog.Infrastructure;
using InventoryModule.Application.Purchasing;
using InventoryModule.Application.Stock;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using MassTransit;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Claims;

namespace InventoryModule.Endpoints.Purchasing;

/// <summary>
/// D10 quy tắc 10 — NHẬP NHANH. Sau lần nhập tồn đầu kỳ, thực tế hằng ngày là mua một thanh RAM
/// của nhà phân phối ngay sáng nay: không có đơn đặt hàng nào cả. Trước đây không có cách nào ghi
/// việc đó nếu GRN bắt buộc phải có PO.
///
/// <para>
/// Thay vì mở đường ghi tồn kho thứ hai, endpoint này tạo TRONG MỘT TRANSACTION: một PO
/// (đã duyệt bởi chính người nhập, trạng thái <c>Sent</c>) + một GRN gắn vào PO đó, rồi đi tiếp
/// đúng con đường cũ — <c>IStockLedger.Receive</c> đặt giá vốn bình quân, serial được sinh,
/// <c>POReceivedEvent</c> được publish nên công nợ NCC và hoá đơn mua vào vẫn phát sinh.
/// </para>
/// </summary>
public sealed class QuickReceiveEndpoints : IInventorySubmodule
{
    public int Order => 56;

    public void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory/receipts")
            .RequirePermission(Permissions.Inventory.QuickReceive);

        group.MapPost("quick", async (
            QuickReceiveDto dto, ClaimsPrincipal user, InventoryDbContext db, CatalogDbContext catalog,
            IStockLedger ledger, IPublishEndpoint bus, InventoryDocumentNumbers numbers,
            ILoggerFactory loggers, CancellationToken ct) =>
        {
            var userId = PurchasingGuards.RequireUserId(user);
            var warehouseId = await ResolveWarehouseAsync(db, dto.WarehouseId, ct);

            Guid supplierId;
            if (dto.SupplierId.HasValue)
            {
                await PurchasingGuards.EnsureSupplierUsableAsync(db, dto.SupplierId.Value, ct: ct);
                supplierId = dto.SupplierId.Value;
            }
            else
            {
                // NCC mới được Add (chưa SaveChanges) để cùng chung transaction với phiếu nhập:
                // phiếu hỏng thì không để lại một nhà cung cấp mồ côi.
                supplierId = await AddSupplierAsync(db, dto.NewSupplier, ct);
            }

            var poNumber = await numbers.NextAsync(DocumentNumberTypes.PurchaseOrder, ct);
            var grnNumber = await numbers.NextAsync(DocumentNumberTypes.GoodsReceivedNote, ct);

            var po = PurchaseOrder.CreateDirectPurchase(
                supplierId,
                dto.Items.Select(i => new PurchaseOrderItem(i.ProductId, i.Quantity, i.UnitCost, i.ProductName ?? string.Empty)).ToList(),
                userId);
            po.SetNumber(poNumber);

            var grn = new GoodsReceivedNote
            {
                DocumentNumber = grnNumber,
                DocumentDate = DateTime.UtcNow,
                SupplierId = supplierId,
                WarehouseId = warehouseId,
                PurchaseOrderId = po.Id,
                ReceivedBy = PurchasingGuards.ResolveUserName(user),
                Notes = string.IsNullOrWhiteSpace(dto.Notes) ? "Nhập nhanh (mua trực tiếp)" : dto.Notes,
                Status = GRNStatus.Draft,
                Items = dto.Items.Select(i => new GRNItem
                {
                    ProductId = i.ProductId,
                    ProductName = i.ProductName ?? string.Empty,
                    Quantity = i.Quantity,
                    UnitCost = i.UnitCost,
                    SerialNumbers = i.SerialNumbers,
                    AcceptedQty = i.Quantity,
                    RejectedQty = 0
                }).ToList()
            };

            db.PurchaseOrders.Add(po);
            db.GoodsReceivedNotes.Add(grn);

            // Một transaction cho cả PO + GRN + bút toán kho: hoặc có đủ chứng từ, hoặc không có gì.
            var service = GrnInspectionEndpoints.BuildService(db, catalog, ledger, bus, loggers);
            var result = await ledger.InTransactionAsync(async token =>
            {
                await db.SaveChangesAsync(token);
                return await service.ConfirmLoadedAsync(grn, user, token);
            }, ct);

            return Results.Created($"/api/inventory/grn/{grn.Id}", new
            {
                purchaseOrderId = po.Id,
                purchaseOrderNumber = po.PONumber,
                receipt = result
            });
        }).WithValidation<QuickReceiveDto>();
    }

    private static async Task<Guid> ResolveWarehouseAsync(InventoryDbContext db, Guid? requested, CancellationToken ct)
    {
        if (requested.HasValue)
        {
            await PurchasingGuards.EnsureWarehouseUsableAsync(db, requested.Value, ct: ct);
            return requested.Value;
        }

        return await db.Warehouses.Where(w => w.IsDefault && w.IsActive).Select(w => (Guid?)w.Id).FirstOrDefaultAsync(ct)
            ?? throw new DomainException("Chưa cấu hình kho mặc định. Chọn kho nhận hàng trước khi nhập nhanh.");
    }

    /// <summary>D10: NCC bắt buộc — chọn sẵn hoặc tạo nhanh tại chỗ.</summary>
    private static async Task<Guid> AddSupplierAsync(InventoryDbContext db, QuickSupplierDto? dto, CancellationToken ct)
    {
        if (dto is null || string.IsNullOrWhiteSpace(dto.Name))
            throw new RequestValidationException("supplierId", "Phải chọn nhà cung cấp hoặc nhập thông tin nhà cung cấp mới.");

        var code = string.IsNullOrWhiteSpace(dto.Code)
            ? $"NCC-{DateTime.UtcNow:yyMMddHHmmss}"
            : dto.Code.Trim();

        if (await db.Suppliers.AnyAsync(s => s.Code == code, ct))
            throw new RequestValidationException("newSupplier.code", "Mã nhà cung cấp đã tồn tại.");

        var supplier = new Supplier(
            code,
            dto.Name.Trim(),
            string.IsNullOrWhiteSpace(dto.ContactPerson) ? dto.Name.Trim() : dto.ContactPerson.Trim(),
            dto.Email?.Trim() ?? string.Empty,
            dto.Phone?.Trim() ?? string.Empty,
            dto.Address?.Trim() ?? string.Empty);

        db.Suppliers.Add(supplier);
        return supplier.Id;
    }
}

public record QuickReceiveDto(
    Guid? SupplierId,
    QuickSupplierDto? NewSupplier,
    Guid? WarehouseId,
    string? Notes,
    List<QuickReceiveItemDto> Items);

public record QuickSupplierDto(
    string Name,
    string? Code,
    string? ContactPerson,
    string? Phone,
    string? Email,
    string? Address);

public record QuickReceiveItemDto(
    Guid ProductId,
    string? ProductName,
    int Quantity,
    decimal UnitCost,
    string? SerialNumbers);
