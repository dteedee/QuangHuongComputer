using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
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
/// Kiểm hàng + xác nhận phiếu nhập (W2-12 bước 1-2).
///
/// <para>
/// Route kiểm hàng theo lô <c>POST /api/inventory/grn/{id}/inspect</c> là route mà
/// <c>frontend/src/api/inventory.ts</c> (<c>grnInspectionApi.inspect</c>) đã gọi từ trước nhưng
/// backend chưa từng có — integration request #39 của đợt 0. Route theo từng dòng được giữ lại cho
/// các màn hình cũ.
/// </para>
/// </summary>
public sealed class GrnInspectionEndpoints : IInventorySubmodule
{
    public int Order => 55;

    public void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory/grn").RequireModulePermissions(PermissionModules.Inventory);

        // POST /api/inventory/grn/{id}/items/{itemId}/inspect — ghi kết quả kiểm cho 1 dòng.
        group.MapPost("{id:guid}/items/{itemId:guid}/inspect", async (
            Guid id, Guid itemId, InspectItemDto dto, InventoryDbContext db, CancellationToken ct) =>
        {
            var grn = await LoadDraftAsync(db, id, ct);
            var item = grn.Items.FirstOrDefault(i => i.Id == itemId)
                ?? throw NotFoundException.For("dòng phiếu nhập", itemId);

            await InspectLineAsync(db, item, dto.AcceptedQty, dto.RejectedQty, dto.Reason, dto.TargetWarehouseId, ct);
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { item.Id, item.AcceptedQty, item.RejectedQty, item.RejectReason });
        });

        // POST /api/inventory/grn/{id}/inspect — kiểm cả phiếu trong một lần (đúng body FE gửi).
        group.MapPost("{id:guid}/inspect", async (
            Guid id, InspectGrnDto dto, InventoryDbContext db, CancellationToken ct) =>
        {
            if (dto.Items is null || dto.Items.Count == 0)
                throw new RequestValidationException("items", "Phải có ít nhất một dòng kiểm hàng.");

            var grn = await LoadDraftAsync(db, id, ct);

            foreach (var line in dto.Items)
            {
                var item = grn.Items.FirstOrDefault(i => i.Id == line.ItemId)
                    ?? throw new RequestValidationException("items", $"Dòng {line.ItemId} không thuộc phiếu nhập này.");

                await InspectLineAsync(db, item, line.AcceptedQty, line.RejectedQty, line.Reason, line.TargetWarehouseId, ct);
            }

            await db.SaveChangesAsync(ct);
            return Results.Ok(new
            {
                message = "Đã ghi nhận kết quả kiểm hàng.",
                isFullyInspected = grn.IsFullyInspected,
                hasRejectedItems = grn.HasRejectedItems
            });
        });

        // POST /api/inventory/grn/{id}/confirm — đường nhập kho DUY NHẤT từ NCC.
        group.MapPost("{id:guid}/confirm", async (
            Guid id, ClaimsPrincipal user, InventoryDbContext db, CatalogDbContext catalog,
            IStockLedger ledger, IPublishEndpoint bus, ILoggerFactory loggers, CancellationToken ct) =>
        {
            var service = BuildService(db, catalog, ledger, bus, loggers);
            var result = await service.ConfirmAsync(id, user, ct);
            return Results.Ok(result);
        })
        .RequireAuthorization(Permissions.Inventory.ReceivePurchaseOrder);
    }

    /// <summary>
    /// Dựng tay thay vì đăng ký DI: <c>DependencyInjection.cs</c> thuộc quyền sở hữu của W2-5,
    /// còn mọi phụ thuộc ở đây đều đã có sẵn trong container (cùng scope ⇒ cùng DbContext và cùng
    /// transaction với sổ cái).
    /// </summary>
    internal static GoodsReceiptService BuildService(
        InventoryDbContext db, CatalogDbContext catalog, IStockLedger ledger,
        IPublishEndpoint bus, ILoggerFactory loggers)
        => new(db, ledger, new GoodsReceiptCatalogFacts(catalog), bus,
               loggers.CreateLogger<GoodsReceiptService>());

    private static async Task<GoodsReceivedNote> LoadDraftAsync(InventoryDbContext db, Guid id, CancellationToken ct)
    {
        var grn = await db.GoodsReceivedNotes.Include(g => g.Items).FirstOrDefaultAsync(g => g.Id == id, ct)
            ?? throw NotFoundException.For("phiếu nhập kho", id);
        if (grn.Status != GRNStatus.Draft)
            throw new ConflictException("Chỉ phiếu nhập ở trạng thái nháp mới được kiểm hàng.");
        return grn;
    }

    private static async Task InspectLineAsync(
        InventoryDbContext db, GRNItem item, int acceptedQty, int rejectedQty,
        string? reason, Guid? targetWarehouseId, CancellationToken ct)
    {
        if (targetWarehouseId.HasValue)
            await PurchasingGuards.EnsureWarehouseUsableAsync(db, targetWarehouseId.Value, "targetWarehouseId", ct);

        try
        {
            item.Inspect(acceptedQty, rejectedQty, reason, targetWarehouseId);
        }
        catch (Exception ex) when (ex is InvalidOperationException or ArgumentException)
        {
            // Quy tắc nghiệp vụ của aggregate -> 400 theo đúng hợp đồng lỗi (docs/api-conventions.md §1).
            throw new DomainException(ex.Message);
        }
    }
}

/// <summary>Body kiểm hàng theo lô — khớp đúng <c>InspectGrnDto</c> của frontend.</summary>
public record InspectGrnDto(List<InspectGrnLineDto> Items);

public record InspectGrnLineDto(
    Guid ItemId,
    int AcceptedQty,
    int RejectedQty,
    string? Reason,
    Guid? TargetWarehouseId);
