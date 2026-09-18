using Catalog.Domain;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Infrastructure.Data.Import;

/// <summary>
/// Imports the curated product dataset into the Catalog module. Idempotent: products are
/// upserted by SKU, ids are UUIDv5 of <c>product:&lt;SKU&gt;</c>, and a second run on an
/// unchanged dataset reports zero changes.
///
/// Deliberately NOT done here:
///  - no <c>SpecificationGroups</c> / <c>SpecificationAttributes</c> rows. The dataset carries
///    208 distinct free-text group names, several of them per-product ("Case - Lian Li LANCOOL
///    216 RGB White"); normalising those would produce 200 junk groups and would break D03's
///    "SpecificationGroups = 6, no orphan category" check. The 1504 verified spec lines are
///    written to <c>Products.Specifications</c> (jsonb) keeping their group, which is the shape
///    the storefront already parses. The stable filter keys live in
///    <c>Products.Attributes.filterAttributes</c> and are documented in <c>spec-keys.md</c>.
///  - no schema change of any kind, and no dependency on the API process.
/// </summary>
public sealed class ProductDatasetImporter
{
    private readonly CatalogDbContext _db;
    private readonly ImportDatasetLoader _loader;

    public ProductDatasetImporter(CatalogDbContext db, ImportDatasetLoader loader)
    {
        _db = db;
        _loader = loader;
    }

    public async Task<ProductImportSummary> RunAsync(ProductImportSummary summary, CancellationToken ct = default)
    {
        var taxonomy = _loader.LoadTaxonomy();
        var manifest = _loader.LoadMediaManifest();
        var allowedHosts = _loader.LoadAllowedHosts();
        var all = _loader.LoadAllRecords();

        var (admitted, rejected) = _loader.Partition(all, manifest, allowedHosts);
        summary.ProductsRejected = rejected.Count;
        summary.Rejections.AddRange(rejected);

        var reference = new CatalogReferenceImporter(_db);
        var categories = await reference.UpsertCategoriesAsync(taxonomy, summary, ct);
        var brands = await reference.UpsertBrandsAsync(admitted, summary, ct);

        var (mains, thumbs) = ProductMediaImporter.Index(manifest);
        var mediaImporter = new ProductMediaImporter(_db);
        var returnExcluded = taxonomy.ReturnExcludedSkus.ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var record in admitted)
        {
            // One transaction per product: a bad record can never leave half a product behind.
            await using var tx = await _db.Database.BeginTransactionAsync(ct);
            try
            {
                await UpsertOneAsync(record, categories, brands, mains, thumbs, mediaImporter, returnExcluded, summary, ct);
                await _db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync(ct);
                _db.ChangeTracker.Clear();
                summary.ProductsFailed++;
                summary.Failures.Add((record.Slug, ex.Message));
            }
        }

        return summary;
    }

    private async Task UpsertOneAsync(
        ProductImportRecord record,
        IReadOnlyDictionary<string, Category> categories,
        IReadOnlyDictionary<string, Brand> brands,
        IReadOnlyDictionary<string, List<MediaManifestEntry>> mains,
        IReadOnlyDictionary<string, MediaManifestEntry> thumbs,
        ProductMediaImporter mediaImporter,
        IReadOnlySet<string> returnExcludedSkus,
        ProductImportSummary summary,
        CancellationToken ct)
    {
        var categoryKey = VietnameseTextNormalizer.Fold(record.Category);
        if (!categories.TryGetValue(categoryKey, out var category))
            throw new InvalidOperationException($"category '{record.Category}' is not in category-taxonomy.json");

        var brandKey = VietnameseTextNormalizer.Fold(record.Brand);
        if (!brands.TryGetValue(brandKey, out var brand))
            throw new InvalidOperationException($"brand '{record.Brand}' was not upserted");

        var id = DeterministicGuid.ForProductSku(record.Sku);
        var description = ProductDescriptionFormatter.Build(record.ShortDescription, record.DescriptionHtml);
        var specificationsJson = ProductPayloadBuilder.Specifications(record);
        var attributesJson = ProductPayloadBuilder.Attributes(record);

        var product = await _db.Products.IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == id || p.Sku == record.Sku, ct);

        var isNew = product is null;
        if (product is null)
        {
            product = new Product(
                name: record.Name,
                price: record.PriceVnd,
                costPrice: record.CostPriceVnd,
                description: description,
                categoryId: category.Id,
                brandId: brand.Id,
                stockQuantity: record.StockQuantity,
                sku: record.Sku,
                oldPrice: record.OldPriceVnd,
                specifications: specificationsJson,
                warrantyInfo: record.WarrantyInfo,
                weight: record.WeightKg,
                metaTitle: record.MetaTitle,
                metaDescription: record.MetaDescription,
                warrantyMonths: record.WarrantyMonths);

            // D03: the constructor hard-assigns a random Id and derives Slug from Name.
            // Both MUST be overwritten or the ids drift and the slug stops matching the URLs
            // D02/D11 build. `Id` is init-only, so it is written through the change tracker.
            _db.Products.Add(product);
            _db.Entry(product).Property("Id").CurrentValue = id;
            product.SetSlug(record.Slug);
            summary.ProductsCreated++;
        }

        var before = Snapshot(product);

        product.UpdateSku(record.Sku);
        product.UpdateDetails(record.Name, description, record.PriceVnd, record.OldPriceVnd,
            specificationsJson, record.WarrantyInfo, weight: record.WeightKg);
        if (!record.OldPriceVnd.HasValue) product.ClearOldPrice();
        product.UpdateCostPrice(record.CostPriceVnd);
        product.UpdateCategory(category.Id);
        product.UpdateBrand(brand.Id);
        product.UpdateStockQuantity(record.StockQuantity);
        product.SetSlug(record.Slug);
        product.SetAttributes(attributesJson);
        product.UpdateSeo(record.MetaTitle, record.MetaDescription);
        product.UpdateWarrantyPolicy(record.WarrantyMonths, returnExcludedSkus.Contains(record.Sku));
        if (!record.WarrantyMonths.HasValue) product.ClearWarrantyMonths();
        product.IsActive = true;

        mains.TryGetValue(record.Slug, out var files);
        var (primaryUrl, galleryJson, written) = await mediaImporter.SyncAsync(
            product, record.Sku, files ?? new List<MediaManifestEntry>(), thumbs, ct);
        if (primaryUrl is not null) product.UpdateImage(primaryUrl, galleryJson);
        summary.MediaWritten += written;
        summary.SpecRowsWritten += record.Specs.Count;

        if (!isNew)
        {
            if (Snapshot(product) != before) summary.ProductsUpdated++;
            else summary.ProductsUnchanged++;
        }
    }

    /// <summary>
    /// Change detection for the "a second run changes nothing" guarantee.
    ///
    /// Money and weight MUST be normalised: PostgreSQL returns numeric(18,2)/numeric(10,3) with
    /// their scale, so 0.350 read back and 0.35 assigned are the same number but different
    /// strings. The three jsonb columns MUST be canonicalised: jsonb re-formats and re-orders keys
    /// on the way in, so the exact string written is never the string read back. Without both,
    /// every re-run reported all 68 products as "updated".
    /// </summary>
    private static string Snapshot(Product p)
        => string.Join('|', p.Name, p.Sku, p.Slug, Num(p.Price), Num(p.OldPrice), Num(p.CostPrice),
            p.CategoryId, p.BrandId, p.StockQuantity, Num(p.Weight), p.WarrantyMonths,
            p.IsReturnExcluded, p.IsActive, p.MetaTitle, p.MetaDescription, p.ImageUrl,
            p.Description,
            ImportJsonCanonicalizer.Canonical(p.GalleryImages),
            ImportJsonCanonicalizer.Canonical(p.Specifications),
            ImportJsonCanonicalizer.Canonical(p.Attributes));

    private static string Num(decimal? value)
        => value?.ToString("0.######", System.Globalization.CultureInfo.InvariantCulture) ?? string.Empty;
}
