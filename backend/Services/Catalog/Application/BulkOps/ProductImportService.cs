using BuildingBlocks.Database;
using BuildingBlocks.Spreadsheet;
using Catalog.Application.PriceHistory;
using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Application.BulkOps;

/// <summary>
/// Orchestrates the `SanPham` import (Implementation Steps #1-#4). Category/brand matching and
/// in-file SKU duplicate detection run INSIDE the pipeline's `validateRow` hook so the platform's
/// `ExcelImportPipeline` attaches the real Excel row number to those errors (same error-workbook
/// path as a plain missing-cell error). Existing-SKU lookup and slug allocation need the full set of
/// SKUs first, so they run as a second pass over the rows that parsed cleanly - see the "Deviation"
/// note in the track report for why those are reported by SKU rather than by row number.
/// </summary>
public sealed class ProductImportService
{
    private readonly CatalogDbContext _db;
    private readonly PriceChangeContext _priceChangeContext;

    public ProductImportService(CatalogDbContext db, PriceChangeContext priceChangeContext)
    {
        _db = db;
        _priceChangeContext = priceChangeContext;
    }

    public async Task<byte[]> BuildTemplateAsync(CancellationToken ct)
    {
        var lookup = await CategoryBrandMatcher.LoadAsync(_db, ct);
        var pipeline = new ExcelImportPipeline<ProductImportRow>(ProductImportColumns.Build());
        return ProductImportWorkbookExtras.BuildTemplateWithLookup(pipeline, lookup);
    }

    public async Task<(ProductImportReport report, ExcelImportResult<ProductImportRow> parsed, ExcelImportPipeline<ProductImportRow> pipeline)>
        RunAsync(Stream upload, string mode, string onDuplicate, string? fileName, string? actorId, CancellationToken ct)
    {
        var seenSkus = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var lookup = await CategoryBrandMatcher.LoadAsync(_db, ct);

        var pipeline = new ExcelImportPipeline<ProductImportRow>(ProductImportColumns.Build(), row =>
        {
            var errors = new List<string>();

            if (!string.IsNullOrWhiteSpace(row.CategoryText))
            {
                var (categoryId, categoryError) = lookup.MatchCategory(row.CategoryText);
                if (categoryError is not null) errors.Add(categoryError); else row.ResolvedCategoryId = categoryId;
            }

            if (!string.IsNullOrWhiteSpace(row.BrandText))
            {
                var (brandId, brandError) = lookup.MatchBrand(row.BrandText);
                if (brandError is not null) errors.Add(brandError); else row.ResolvedBrandId = brandId;
            }

            if (!string.IsNullOrWhiteSpace(row.Sku) && !seenSkus.Add(row.Sku))
                errors.Add($"Mã SKU '{row.Sku}' bị lặp lại trong chính tệp này.");

            return errors;
        });

        var parsed = pipeline.Read(upload);
        var report = new ProductImportReport { Mode = mode, TotalRows = parsed.TotalRows };
        report.Errors.AddRange(parsed.Errors);

        await ResolveDuplicatesAndSlugsAsync(parsed, onDuplicate, report, ct);

        if (mode == "commit" && report.IsValid)
            await CommitAsync(parsed, onDuplicate, fileName, actorId, ct);

        return (report, parsed, pipeline);
    }

    /// <summary>Second pass (Implementation Steps #3): existing-SKU lookup, create/update/skip
    /// decision, and unique slug allocation across DB + this file.</summary>
    private async Task ResolveDuplicatesAndSlugsAsync(
        ExcelImportResult<ProductImportRow> parsed, string onDuplicate, ProductImportReport report, CancellationToken ct)
    {
        var skus = parsed.Rows.Select(r => r.Sku).Where(s => !string.IsNullOrWhiteSpace(s)).ToList();
        var existing = await _db.Products.IgnoreQueryFilters()
            .Where(p => skus.Contains(p.Sku))
            .Select(p => new { p.Id, p.Sku, p.Slug })
            .ToListAsync(ct);
        var existingBySku = existing.ToDictionary(x => x.Sku, x => x, StringComparer.OrdinalIgnoreCase);

        var slugAllocator = await ProductSlugAllocator.LoadAsync(_db, ct);

        foreach (var row in parsed.Rows)
        {
            var match = existingBySku.GetValueOrDefault(row.Sku);
            if (match is not null)
            {
                row.ExistingProductId = match.Id;
                if (onDuplicate == "skip")
                {
                    report.Skipped++;
                    continue; // Không cấp slug cho dòng sẽ bị bỏ qua - không lãng phí một slug.
                }
            }

            var (slug, renamed) = slugAllocator.Allocate(row.Name, excludeExistingProductSlug: match?.Slug);
            row.AllocatedSlug = slug;
            row.SlugWasRenamed = renamed;
            if (renamed) report.Renames.Add(new ProductImportReport.RenamedRow(row.Sku, slug));

            if (row.ShowOnWeb)
                report.Warnings.Add($"SKU {row.Sku}: đánh dấu \"Hiện trên web\" nhưng nhập không kèm ảnh (D02: không lấy ảnh qua URL) - sản phẩm được nhập ở trạng thái CHƯA hiện trên web, có thể thêm ảnh và xuất bản sau.");

            if (match is null) report.Created++; else report.Updated++;
        }
    }

    private async Task CommitAsync(
        ExcelImportResult<ProductImportRow> parsed, string onDuplicate, string? fileName, string? actorId, CancellationToken ct)
    {
        var rowsToApply = parsed.Rows.Where(r => !(onDuplicate == "skip" && r.ExistingProductId.HasValue)).ToList();
        if (rowsToApply.Count == 0) return;

        _priceChangeContext.Source = "Import";
        _priceChangeContext.ActorId = actorId;
        _db.ChangeTracker.AutoDetectChangesEnabled = false;

        using var scope = AuditScope.Bulk("Nhập sản phẩm hàng loạt", fileName);
        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            var toUpdateIds = rowsToApply.Where(r => r.ExistingProductId.HasValue).Select(r => r.ExistingProductId!.Value).ToList();
            var tracked = toUpdateIds.Count == 0
                ? new List<Product>()
                : await _db.Products.IgnoreQueryFilters().Where(p => toUpdateIds.Contains(p.Id)).ToListAsync(ct);
            var trackedById = tracked.ToDictionary(p => p.Id);

            foreach (var row in rowsToApply)
            {
                if (row.ExistingProductId.HasValue)
                    ApplyToExisting(trackedById[row.ExistingProductId.Value], row);
                else
                    _db.Products.Add(BuildNewProduct(row));
            }

            // AutoDetectChangesEnabled=false only stops EF re-scanning the whole change graph on
            // every Add/query INSIDE the loop above (the perf win for a 5.000-row batch) - it does
            // NOT make SaveChanges see mutations made through the domain setters on already-tracked
            // `Product` rows. One explicit DetectChanges right before Save restores that without
            // paying the per-row cost.
            _db.ChangeTracker.DetectChanges();
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        finally
        {
            _db.ChangeTracker.AutoDetectChangesEnabled = true;
        }
    }

    private static Product BuildNewProduct(ProductImportRow row)
    {
        var product = new Product(
            name: row.Name,
            price: row.SellingPrice,
            costPrice: row.ReferenceCost ?? 0,
            description: row.ShortDescription ?? "",
            categoryId: row.ResolvedCategoryId!.Value,
            brandId: row.ResolvedBrandId!.Value,
            stockQuantity: 0, // Tồn kho do module Inventory quản lý, không có trong sheet nhập.
            sku: row.Sku,
            oldPrice: row.ListPrice,
            barcode: row.Barcode,
            warrantyInfo: WarrantyDisplayText(row.WarrantyMonths),
            warrantyMonths: row.WarrantyMonths);

        product.SetSlug(row.AllocatedSlug!);
        if (row.WarrantyMonths is { } months)
            product.UpdateWarrantyPolicy(warrantyMonths: months);
        return product;
    }

    private static void ApplyToExisting(Product product, ProductImportRow row)
    {
        product.UpdateDetails(row.Name, row.ShortDescription ?? "", row.SellingPrice, row.ListPrice,
            warrantyInfo: WarrantyDisplayText(row.WarrantyMonths), barcode: row.Barcode);
        product.UpdateCostPrice(row.ReferenceCost ?? 0);
        product.UpdateCategory(row.ResolvedCategoryId!.Value);
        product.UpdateBrand(row.ResolvedBrandId!.Value);
        product.SetSlug(row.AllocatedSlug!);
        if (row.WarrantyMonths is { } months) product.UpdateWarrantyPolicy(warrantyMonths: months);
    }

    /// <summary>Implementation Steps #4: "Warranty (months)" writes both `WarrantyMonths` and this
    /// display string - null when the sheet left the column blank (no promise to invent).</summary>
    private static string? WarrantyDisplayText(int? months) => months is null ? null : $"Bảo hành {months} tháng";
}
