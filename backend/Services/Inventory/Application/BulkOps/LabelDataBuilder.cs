using Catalog.Infrastructure;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Application.BulkOps;

/// <summary>One product's worth of print data — barcode/QR image rendering itself already exists
/// in <c>BarcodeEndpoints</c> (Architecture); this only returns the payload for W3-16 to lay out.</summary>
public sealed record LabelDataItem(
    string Sku,
    string Name,
    string BarcodePayload,
    IReadOnlyList<string> Serials,
    int WarrantyMonths,
    decimal Price);

/// <summary>
/// Implementation Steps #5: label data by SKU list or by GRN. Read-only — gated by
/// <c>Inventory.ViewStock</c> at the endpoint (the closest existing permission to the phase file's
/// "Inventory.View", which does not exist in <c>PermissionsCommerce.cs</c>; see track report).
/// </summary>
internal sealed class LabelDataBuilder
{
    private const int DefaultWarrantyMonths = 12;

    private readonly CatalogDbContext _catalog;
    private readonly InventoryDbContext _db;

    public LabelDataBuilder(CatalogDbContext catalog, InventoryDbContext db)
    {
        _catalog = catalog;
        _db = db;
    }

    /// <summary>By SKU list: serials returned are the ones currently <c>InStock</c> for that
    /// product — the printable set (a sold/scrapped unit is not relabelled).</summary>
    public async Task<IReadOnlyList<LabelDataItem>> BySkusAsync(IReadOnlyCollection<string> skus, CancellationToken ct)
    {
        var products = await _catalog.Products.AsNoTracking()
            .Where(p => skus.Contains(p.Sku))
            .Select(p => new { p.Id, p.Sku, p.Name, p.Barcode, p.WarrantyMonths, p.Price })
            .ToListAsync(ct);
        if (products.Count == 0) return Array.Empty<LabelDataItem>();

        var productIds = products.Select(p => p.Id).ToList();
        var serialsByProduct = await SerialsByProductAsync(s => productIds.Contains(s.ProductId) && s.Status == SerialStatus.InStock, ct);

        return products.Select(p => new LabelDataItem(
            p.Sku, p.Name, p.Barcode ?? p.Sku,
            serialsByProduct.GetValueOrDefault(p.Id, Array.Empty<string>()),
            p.WarrantyMonths is > 0 ? p.WarrantyMonths.Value : DefaultWarrantyMonths,
            p.Price)).ToList();
    }

    /// <summary>By GRN: one item per line, serials are the ones this exact GRN line generated
    /// (<c>GoodsReceivedNoteItemId</c>, W2-5) — so a re-print always matches what was actually
    /// received on that document, not whatever else is in stock today.</summary>
    public async Task<IReadOnlyList<LabelDataItem>> ByGrnAsync(Guid grnId, CancellationToken ct)
    {
        var lines = await _db.GRNItems.AsNoTracking()
            .Where(i => i.GoodsReceivedNoteId == grnId)
            .Select(i => new { i.Id, i.ProductId, i.ProductName })
            .ToListAsync(ct);
        if (lines.Count == 0) return Array.Empty<LabelDataItem>();

        var lineIds = lines.Select(l => l.Id).ToList();
        var serialsByLine = await _db.SerialNumbers.AsNoTracking()
            .Where(s => s.GoodsReceivedNoteItemId != null && lineIds.Contains(s.GoodsReceivedNoteItemId!.Value))
            .Select(s => new { s.GoodsReceivedNoteItemId, s.Serial })
            .ToListAsync(ct);
        var serialsByLineId = serialsByLine
            .GroupBy(s => s.GoodsReceivedNoteItemId!.Value)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<string>)g.Select(x => x.Serial).ToList());

        var productIds = lines.Select(l => l.ProductId).Distinct().ToList();
        var productFacts = await _catalog.Products.AsNoTracking()
            .Where(p => productIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Sku, p.Barcode, p.WarrantyMonths, p.Price })
            .ToDictionaryAsync(p => p.Id, ct);

        return lines
            .Where(l => productFacts.ContainsKey(l.ProductId)) // Sản phẩm đã bị xoá khỏi catalog thì bỏ qua, không bịa dữ liệu.
            .Select(l =>
            {
                var facts = productFacts[l.ProductId];
                return new LabelDataItem(
                    facts.Sku, l.ProductName, facts.Barcode ?? facts.Sku,
                    serialsByLineId.GetValueOrDefault(l.Id, Array.Empty<string>()),
                    facts.WarrantyMonths is > 0 ? facts.WarrantyMonths.Value : DefaultWarrantyMonths,
                    facts.Price);
            })
            .ToList();
    }

    private async Task<Dictionary<Guid, IReadOnlyList<string>>> SerialsByProductAsync(
        System.Linq.Expressions.Expression<Func<SerialNumber, bool>> predicate, CancellationToken ct)
    {
        var rows = await _db.SerialNumbers.AsNoTracking().Where(predicate)
            .Select(s => new { s.ProductId, s.Serial }).ToListAsync(ct);
        return rows.GroupBy(r => r.ProductId).ToDictionary(g => g.Key, g => (IReadOnlyList<string>)g.Select(x => x.Serial).ToList());
    }
}
