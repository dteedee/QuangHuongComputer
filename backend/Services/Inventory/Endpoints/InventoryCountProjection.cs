using BuildingBlocks.Endpoints;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Endpoints;

/// <summary>
/// Nạp phiên kiểm kê và dựng báo cáo chênh lệch. Tách khỏi <see cref="InventoryCountEndpoints"/>
/// để file định tuyến ở dưới 200 dòng; chi tiết và báo cáo chênh lệch dùng CHUNG một hàm nên hai
/// màn hình không bao giờ tính variance theo hai cách khác nhau.
/// </summary>
internal static class InventoryCountProjection
{
    /// <summary>
    /// Những dòng tồn được đưa vào phiên kiểm kê. Scope = ByCategory chỉ đếm sản phẩm của đúng
    /// danh mục đó — bản cũ nhận CategoryId rồi vẫn đếm toàn bộ kho, nên ô nhập ấy vô nghĩa.
    /// </summary>
    internal static async Task<List<InventoryItem>> EnrolRowsAsync(
        InventoryDbContext db, Catalog.Infrastructure.CatalogDbContext catalogDb,
        CreateCountSessionDto dto, CancellationToken ct)
    {
        var query = db.InventoryItems.AsQueryable();
        if (dto.WarehouseId.HasValue) query = query.Where(i => i.WarehouseId == dto.WarehouseId);

        if (dto.Scope == CountScope.ByCategory)
        {
            if (dto.CategoryId is null)
                throw new DomainException("Kiểm kê theo danh mục thì phải chọn danh mục.");

            var categoryProductIds = await catalogDb.Products
                .Where(p => p.CategoryId == dto.CategoryId)
                .Select(p => p.Id).ToListAsync(ct);
            query = query.Where(i => categoryProductIds.Contains(i.ProductId));
        }

        return await query.ToListAsync(ct);
    }

    internal static async Task<InventoryCountSession> LoadAsync(InventoryDbContext db, Guid id, CancellationToken ct)
    {
        var session = await db.InventoryCountSessions.Include(s => s.Items).FirstOrDefaultAsync(s => s.Id == id, ct);
        return session ?? throw NotFoundException.For("phiên kiểm kê", id);
    }

    internal static async Task<object> BuildDetailAsync(
        InventoryDbContext db, Guid id, bool onlyVariance, CancellationToken ct)
    {
        var session = await LoadAsync(db, id, ct);
        var lines = session.Items.AsEnumerable();
        if (onlyVariance) lines = lines.Where(i => i.CountedQuantity.HasValue && i.Variance != 0);

        return new
        {
            session.Id,
            session.DocumentNumber,
            session.CountDate,
            session.WarehouseId,
            Scope = session.Scope.ToString(),
            Status = session.Status.ToString(),
            session.CreatedBy,
            session.ApprovedBy,
            session.ApprovedAt,
            session.Notes,
            Items = lines.Select(i => new
            {
                i.Id,
                i.InventoryItemId,
                i.ProductId,
                i.VariantId,
                i.WarehouseId,
                i.ProductName,
                i.SystemQuantity,
                i.CountedQuantity,
                i.Variance,
                i.CountedBy,
                i.Notes
            }).ToList(),
            CountedLines = session.Items.Count(i => i.CountedQuantity.HasValue),
            VarianceLines = session.Items.Count(i => i.CountedQuantity.HasValue && i.Variance != 0),
            TotalVariance = session.Items.Where(i => i.CountedQuantity.HasValue).Sum(i => i.Variance)
        };
    }
}
