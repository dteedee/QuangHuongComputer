using System.Security.Claims;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Paging;
using BuildingBlocks.Security;
using Catalog.Infrastructure;
using InventoryModule.Application.Stock;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Endpoints;

/// <summary>
/// Kiểm kê kho (W2-5 bước 6).
///
/// <para>
/// Ba sửa chữa so với bản cũ: dòng kiểm kê ghim <c>InventoryItemId</c> (bản cũ chỉ có
/// <c>ProductId</c> nên khi duyệt nó điều chỉnh "dòng tồn đầu tiên trùng sản phẩm" — sai kho, sai
/// biến thể); bộ lọc <c>Scope</c>/<c>CategoryId</c> thật sự được áp dụng (bản cũ nhận rồi bỏ qua);
/// và bút toán điều chỉnh đi qua sổ cái với người duyệt lấy từ JWT, người duyệt phải khác người mở
/// phiên.
/// </para>
/// </summary>
public sealed class InventoryCountEndpoints : IInventorySubmodule
{
    public int Order => 40;

    public void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory/count")
            .RequireModulePermissions(PermissionModules.Inventory);

        group.MapPost("", async (
            CreateCountSessionDto dto, InventoryDbContext db, CatalogDbContext catalogDb,
            InventoryDocumentNumbers numbers, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var inventoryItems = await InventoryCountProjection.EnrolRowsAsync(db, catalogDb, dto, ct);
            if (inventoryItems.Count == 0)
                throw new DomainException("Không có dòng tồn nào khớp phạm vi kiểm kê.");

            var productIds = inventoryItems.Select(i => i.ProductId).Distinct().ToList();
            var productNames = await catalogDb.Products
                .Where(p => productIds.Contains(p.Id))
                .Select(p => new { p.Id, p.Name })
                .ToDictionaryAsync(p => p.Id, p => p.Name, ct);

            var session = new InventoryCountSession
            {
                DocumentNumber = await numbers.NextAsync(InventoryDocumentNumbers.InventoryCount, ct),
                CountDate = dto.CountDate ?? DateTime.UtcNow,
                WarehouseId = dto.WarehouseId,
                Scope = dto.Scope,
                CategoryId = dto.CategoryId,
                Notes = dto.Notes,
                Status = CountSessionStatus.Open,
                CreatedBy = StockLedgerContext.ResolveActor(user),
                Items = inventoryItems.Select(i => new InventoryCountItem
                {
                    InventoryItemId = i.Id,
                    ProductId = i.ProductId,
                    VariantId = i.VariantId,
                    WarehouseId = i.WarehouseId,
                    ProductName = productNames.GetValueOrDefault(i.ProductId, $"SP-{i.ProductId.ToString()[..8]}"),
                    SystemQuantity = i.QuantityOnHand,
                    CountedQuantity = null
                }).ToList()
            };

            db.InventoryCountSessions.Add(session);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/inventory/count/{session.Id}",
                new { session.Id, session.DocumentNumber, itemCount = session.Items.Count });
        })
        .RequireAuthorization(Permissions.Inventory.ManageStock);

        group.MapGet("", async ([AsParameters] PagedRequest request, string? status,
            InventoryDbContext db, CancellationToken ct) =>
        {
            var query = db.InventoryCountSessions.AsQueryable();
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<CountSessionStatus>(status, true, out var st))
                query = query.Where(s => s.Status == st);

            return Results.Ok(await query
                .OrderByDescending(s => s.CountDate)
                .Select(s => new
                {
                    s.Id,
                    s.DocumentNumber,
                    s.CountDate,
                    s.WarehouseId,
                    Scope = s.Scope.ToString(),
                    Status = s.Status.ToString(),
                    s.CreatedBy,
                    s.ApprovedBy,
                    s.ApprovedAt,
                    s.Notes
                })
                .ToPagedResultAsync(request, ct));
        })
        .RequireAuthorization(Permissions.Inventory.ViewStock);

        group.MapGet("{id:guid}", async (Guid id, InventoryDbContext db, CancellationToken ct) =>
            Results.Ok(await InventoryCountProjection.BuildDetailAsync(db, id, onlyVariance: false, ct)))
        .RequireAuthorization(Permissions.Inventory.ViewStock);

        // Báo cáo chênh lệch: chỉ những dòng đã đếm và lệch so với sổ sách.
        group.MapGet("{id:guid}/variance", async (Guid id, InventoryDbContext db, CancellationToken ct) =>
            Results.Ok(await InventoryCountProjection.BuildDetailAsync(db, id, onlyVariance: true, ct)))
        .RequireAuthorization(Permissions.Inventory.ViewStock);

        group.MapPost("{id:guid}/record", async (
            Guid id, List<RecordCountItemDto> items, InventoryDbContext db,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            var session = await InventoryCountProjection.LoadAsync(db, id, ct);
            if (session.Status is CountSessionStatus.Approved or CountSessionStatus.Cancelled)
                throw new DomainException("Phiên kiểm kê đã kết thúc, không ghi thêm được.");

            var actor = StockLedgerContext.ResolveActor(user);
            var recorded = 0;
            foreach (var dto in items)
            {
                var item = session.Items.FirstOrDefault(i => i.Id == dto.ItemId);
                if (item == null) continue;
                if (dto.CountedQuantity < 0) throw new DomainException("Số đếm không được âm.");

                item.CountedQuantity = dto.CountedQuantity;
                item.CountedBy = actor;      // người đếm từ JWT, không từ body
                item.Notes = dto.Notes;
                recorded++;
            }

            session.Status = CountSessionStatus.InProgress;
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { success = true, recordedCount = recorded });
        })
        .RequireAuthorization(Permissions.Inventory.ManageStock);

        // Duyệt: đăng chênh lệch qua sổ cái, một transaction cho cả phiên.
        group.MapPost("{id:guid}/approve", async (
            Guid id, InventoryDbContext db, IStockLedger ledger, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var session = await InventoryCountProjection.LoadAsync(db, id, ct);
            if (session.Status is not (CountSessionStatus.InProgress or CountSessionStatus.PendingApproval))
                throw new DomainException("Chỉ phiên đang kiểm hoặc chờ duyệt mới được duyệt.");

            var approver = StockLedgerContext.ResolveActor(user);
            if (!string.IsNullOrWhiteSpace(session.CreatedBy) &&
                string.Equals(session.CreatedBy, approver, StringComparison.OrdinalIgnoreCase))
                throw new ForbiddenException("Người mở phiên kiểm kê không được tự duyệt.");

            var posted = await ledger.InTransactionAsync(async token =>
            {
                var count = 0;
                foreach (var item in session.Items.Where(i => i.CountedQuantity.HasValue && i.Variance != 0))
                {
                    var location = item.InventoryItemId != Guid.Empty
                        ? await StockEndpoints.LocationOfAsync(db, item.InventoryItemId, token)
                        : new StockLocation(item.ProductId, item.VariantId, item.WarehouseId);

                    await ledger.AdjustAsync(location, item.Variance,
                        new StockLedgerContext(approver, session.Id.ToString(), "InventoryCount", session.DocumentNumber),
                        StockMovementReason.CountAdjustment, token);
                    count++;
                }

                session.Status = CountSessionStatus.Approved;
                session.ApprovedBy = approver;
                session.ApprovedAt = DateTime.UtcNow;
                await db.SaveChangesAsync(token);
                return count;
            }, ct);

            return Results.Ok(new { success = true, documentNumber = session.DocumentNumber, adjustedLines = posted });
        })
        .RequireAuthorization(Permissions.Inventory.Approve);

        group.MapPost("{id:guid}/cancel", async (Guid id, InventoryDbContext db, CancellationToken ct) =>
        {
            var session = await InventoryCountProjection.LoadAsync(db, id, ct);
            if (session.Status == CountSessionStatus.Approved)
                throw new DomainException("Không thể hủy phiên kiểm kê đã duyệt.");

            session.Status = CountSessionStatus.Cancelled;
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { success = true });
        })
        .RequireAuthorization(Permissions.Inventory.ManageStock);
    }
}
