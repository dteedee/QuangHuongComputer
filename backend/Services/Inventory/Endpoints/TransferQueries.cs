using BuildingBlocks.Contracts;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Paging;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Endpoints;

/// <summary>
/// Đọc phiếu chuyển kho cho màn hình back office. Trả tên kho và TÊN người thao tác (qua
/// <see cref="IUserDirectory"/>) — bản cũ trả thẳng entity, UI chỉ có GUID để hiển thị.
/// </summary>
internal static class TransferQueries
{
    internal static async Task<BuildingBlocks.Repository.PagedResult<object>> ListAsync(
        InventoryDbContext db, PagedRequest request, string? status, Guid? warehouseId, CancellationToken ct)
    {
        var query = db.StockTransfers.AsNoTracking().Include(t => t.Items).AsQueryable();
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<TransferStatus>(status, true, out var ts))
            query = query.Where(t => t.Status == ts);
        if (warehouseId.HasValue)
            query = query.Where(t => t.FromWarehouseId == warehouseId.Value || t.ToWarehouseId == warehouseId.Value);
        var search = request.NormalizedSearch;
        if (search is not null)
            query = query.Where(t => t.TransferNumber.Contains(search));

        var page = await query
            .ApplySort(request,
                new Dictionary<string, System.Linq.Expressions.Expression<Func<StockTransfer, object?>>>
                {
                    ["transferNumber"] = t => t.TransferNumber,
                    ["requestedAt"] = t => t.RequestedAt,
                },
                t => t.RequestedAt)
            .ToPagedResultAsync(request, ct);

        var names = await WarehouseNamesAsync(db, ct);
        return new BuildingBlocks.Repository.PagedResult<object>(
            page.Items.Select(t => (object)new
            {
                t.Id,
                t.TransferNumber,
                t.FromWarehouseId,
                FromWarehouse = names.GetValueOrDefault(t.FromWarehouseId),
                t.ToWarehouseId,
                ToWarehouse = names.GetValueOrDefault(t.ToWarehouseId),
                Status = t.Status.ToString(),
                t.RequestedAt,
                t.ApprovedAt,
                t.ShippedAt,
                t.ReceivedAt,
                t.CancelledAt,
                t.Notes,
                ItemCount = t.Items.Count,
                TotalQuantity = t.Items.Sum(i => i.Quantity),
                t.HasDiscrepancy,
            }).ToList(),
            page.Total, page.Page, page.PageSize);
    }

    internal static async Task<object> DetailAsync(
        InventoryDbContext db, IUserDirectory users, Guid id, CancellationToken ct)
    {
        var t = await db.StockTransfers.AsNoTracking().Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw NotFoundException.For("phiếu chuyển kho", id);

        var names = await WarehouseNamesAsync(db, ct);
        var itemIds = t.Items.Select(i => i.InventoryItemId).ToList();
        var products = await db.InventoryItems.Where(i => itemIds.Contains(i.Id))
            .Select(i => new { i.Id, i.ProductId, i.VariantId })
            .ToDictionaryAsync(i => i.Id, ct);
        var people = await PeopleAsync(users, t, ct);
        string? Person(string? actor) => actor is null ? null : people.GetValueOrDefault(actor, actor);

        return new
        {
            t.Id,
            t.TransferNumber,
            Status = t.Status.ToString(),
            t.FromWarehouseId,
            FromWarehouse = names.GetValueOrDefault(t.FromWarehouseId),
            t.ToWarehouseId,
            ToWarehouse = names.GetValueOrDefault(t.ToWarehouseId),
            t.Notes,
            t.ReceiveNote,
            t.HasDiscrepancy,
            t.RequestedAt, RequestedBy = Person(t.RequestedBy),
            t.ApprovedAt, ApprovedBy = Person(t.ApprovedBy),
            t.ShippedAt, ShippedBy = Person(t.ShippedBy),
            t.ReceivedAt, ReceivedBy = Person(t.ReceivedBy),
            t.CancelledAt, CancelledBy = Person(t.CancelledBy),
            Items = t.Items.Select(i => new
            {
                i.Id,
                i.InventoryItemId,
                ProductId = products.GetValueOrDefault(i.InventoryItemId)?.ProductId,
                VariantId = products.GetValueOrDefault(i.InventoryItemId)?.VariantId,
                i.ProductName,
                i.ProductSku,
                i.Quantity,
                i.ReceivedQuantity,
                i.Shortage,
                i.SerialNumbers,
            }).ToList(),
        };
    }

    private static Task<Dictionary<Guid, string>> WarehouseNamesAsync(InventoryDbContext db, CancellationToken ct) =>
        db.Warehouses.AsNoTracking().Select(w => new { w.Id, w.Name }).ToDictionaryAsync(w => w.Id, w => w.Name, ct);

    /// <summary>Một lượt tra cho mọi người trên phiếu; actor không phải user id (vd "system") giữ nguyên.</summary>
    private static async Task<Dictionary<string, string>> PeopleAsync(IUserDirectory users, StockTransfer t, CancellationToken ct)
    {
        var ids = new[] { t.RequestedBy, t.ApprovedBy, t.ShippedBy, t.ReceivedBy, t.CancelledBy }
            .Where(a => a is not null && Guid.TryParse(a, out _)).Select(a => a!).Distinct().ToList();
        if (ids.Count == 0) return new();
        var entries = await users.GetByIdsAsync(ids, ct);
        return entries.ToDictionary(e => e.Id, e => e.FullName);
    }
}
