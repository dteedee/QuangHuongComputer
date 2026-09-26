using BuildingBlocks.Endpoints;
using Catalog.Infrastructure;
using InventoryModule.Application.Purchasing;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Endpoints;

/// <summary>
/// Dựng dòng phiếu chuyển kho từ request, sau khi kiểm tra với dữ liệu THẬT:
/// kho tồn tại, dòng tồn thuộc kho xuất và đủ hàng khả dụng, tên/SKU chụp từ Catalog (không tin
/// client), và hàng theo dõi serial (<c>Category.IsSerialTracked</c>) phải chọn đúng từng máy.
/// </summary>
internal static class TransferCreation
{
    private static readonly TransferStatus[] OpenStatuses =
        { TransferStatus.Pending, TransferStatus.Approved, TransferStatus.Shipped };

    internal static async Task<List<StockTransferItem>> BuildItemsAsync(
        InventoryDbContext db, CatalogDbContext catalog, CreateTransferDto dto, CancellationToken ct)
    {
        await EnsureWarehousesAsync(db, dto, ct);

        var ids = dto.Items.Select(i => i.InventoryItemId).ToList();
        var rows = await db.InventoryItems.Where(i => ids.Contains(i.Id))
            .Select(i => new { i.Id, i.ProductId, i.WarehouseId, i.QuantityOnHand, i.ReservedQuantity })
            .ToListAsync(ct);
        var facts = await new GoodsReceiptCatalogFacts(catalog)
            .LoadAsync(rows.Select(r => r.ProductId).Distinct().ToList(), ct);
        var serialsInOpenTransfers = await SerialsInOpenTransfersAsync(db, dto.FromWarehouseId, ct);

        var items = new List<StockTransferItem>();
        foreach (var line in dto.Items)
        {
            var row = rows.FirstOrDefault(r => r.Id == line.InventoryItemId)
                      ?? throw NotFoundException.For("dòng tồn kho", line.InventoryItemId);
            if (row.WarehouseId != dto.FromWarehouseId)
                throw new DomainException("Mặt hàng được chọn không nằm trong kho xuất.");
            if (row.QuantityOnHand - row.ReservedQuantity < line.Quantity)
                throw new DomainException(
                    $"Tồn khả dụng chỉ còn {row.QuantityOnHand - row.ReservedQuantity}, không chuyển được {line.Quantity}.");

            facts.TryGetValue(row.ProductId, out var product);
            var name = product?.Name ?? line.ProductName;
            var serials = NormalizeSerials(line.SerialNumbers);

            if (product?.IsSerialTracked == true)
            {
                if (serials.Count != line.Quantity)
                    throw new DomainException(
                        $"'{name}' theo dõi serial: phải chọn đúng {line.Quantity} serial (đang chọn {serials.Count}).");
                await EnsureSerialsAvailableAsync(db, row.ProductId, dto.FromWarehouseId, serials, serialsInOpenTransfers, ct);
            }
            else if (serials.Count > 0)
            {
                throw new DomainException($"'{name}' không theo dõi serial — bỏ phần chọn serial.");
            }

            items.Add(new StockTransferItem(line.InventoryItemId, line.Quantity, name, product?.Sku ?? line.ProductSku, serials));
        }
        return items;
    }

    private static List<string> NormalizeSerials(List<string>? serials) =>
        serials?.Select(s => s.Trim()).Where(s => s.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase).ToList()
        ?? new List<string>();

    private static async Task EnsureWarehousesAsync(InventoryDbContext db, CreateTransferDto dto, CancellationToken ct)
    {
        var warehouses = await db.Warehouses
            .Where(w => w.Id == dto.FromWarehouseId || w.Id == dto.ToWarehouseId)
            .Select(w => new { w.Id, w.IsActive }).ToListAsync(ct);
        if (!warehouses.Any(w => w.Id == dto.FromWarehouseId)) throw NotFoundException.For("kho xuất", dto.FromWarehouseId);
        if (!warehouses.Any(w => w.Id == dto.ToWarehouseId && w.IsActive))
            throw NotFoundException.For("kho nhận", dto.ToWarehouseId);
    }

    /// <summary>Máy phải đang InStock ở kho xuất, đúng sản phẩm, và chưa nằm trong phiếu chuyển khác đang mở.</summary>
    private static async Task EnsureSerialsAvailableAsync(
        InventoryDbContext db, Guid productId, Guid fromWarehouseId, List<string> serials,
        HashSet<string> alreadyInOpenTransfers, CancellationToken ct)
    {
        var found = await db.SerialNumbers
            .Where(s => serials.Contains(s.Serial) && s.ProductId == productId
                        && s.WarehouseId == fromWarehouseId && s.Status == SerialStatus.InStock)
            .Select(s => s.Serial).ToListAsync(ct);

        var missing = serials.Except(found, StringComparer.OrdinalIgnoreCase).ToList();
        if (missing.Count > 0)
            throw new DomainException($"Serial không có sẵn trong kho xuất: {string.Join(", ", missing)}.");

        var busy = serials.Where(alreadyInOpenTransfers.Contains).ToList();
        if (busy.Count > 0)
            throw new ConflictException($"Serial đã nằm trong một phiếu chuyển khác chưa hoàn tất: {string.Join(", ", busy)}.");
    }

    /// <summary>
    /// Serial của các phiếu còn mở xuất từ cùng kho. Lọc trong bộ nhớ: cột jsonb, và số phiếu mở của
    /// một cửa hàng luôn nhỏ.
    /// </summary>
    private static async Task<HashSet<string>> SerialsInOpenTransfersAsync(
        InventoryDbContext db, Guid fromWarehouseId, CancellationToken ct)
    {
        var lists = await db.StockTransfers
            .Where(t => t.FromWarehouseId == fromWarehouseId && OpenStatuses.Contains(t.Status))
            .SelectMany(t => t.Items.Select(i => i.SerialNumbers))
            .ToListAsync(ct);
        return lists.SelectMany(l => l).ToHashSet(StringComparer.OrdinalIgnoreCase);
    }
}
