using BuildingBlocks.Spreadsheet;
using Catalog.Infrastructure;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Application.BulkOps;

/// <summary>
/// Implementation Steps #5: same columns as the import template, so export -> edit -> import
/// round-trips. Replaces W2-1's CSV export (Todo list) - no CSV export was found under this track's
/// ownership at the time of writing (see track report); nothing to delete, only to not reintroduce.
/// </summary>
public sealed class ProductExportService
{
    private readonly CatalogDbContext _db;

    public ProductExportService(CatalogDbContext db) => _db = db;

    public async Task<byte[]> ExportAsync(Guid? categoryId, Guid? brandId, IReadOnlyCollection<Guid>? ids, CancellationToken ct)
    {
        var query = _db.Products.AsNoTracking().Include(p => p.Category).Include(p => p.Brand).AsQueryable();
        if (categoryId is not null) query = query.Where(p => p.CategoryId == categoryId);
        if (brandId is not null) query = query.Where(p => p.BrandId == brandId);
        if (ids is { Count: > 0 }) query = query.Where(p => ids.Contains(p.Id));

        var products = await query.OrderBy(p => p.Sku).ToListAsync(ct);

        var pipeline = new ExcelImportPipeline<ProductImportRow>(ProductImportColumns.Build());
        using var stream = new MemoryStream(pipeline.BuildTemplate());
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheets.Worksheet(1);

        var row = 3; // hàng 1 = tiêu đề, hàng 2 = gợi ý
        foreach (var p in products)
        {
            SetSafe(sheet, row, 1, p.Sku);
            SetSafe(sheet, row, 2, p.Name);
            SetSafe(sheet, row, 3, p.Category?.Name ?? "");
            SetSafe(sheet, row, 4, p.Brand?.Name ?? "");
            sheet.Cell(row, 5).Value = p.Price;
            if (p.OldPrice is not null) sheet.Cell(row, 6).Value = p.OldPrice.Value;
            sheet.Cell(row, 7).Value = p.CostPrice;
            if (!string.IsNullOrWhiteSpace(p.Barcode)) SetSafe(sheet, row, 8, p.Barcode);
            if (p.WarrantyMonths is not null) sheet.Cell(row, 9).Value = p.WarrantyMonths.Value;
            sheet.Cell(row, 10).Value = p.PublishedAt is not null ? "Y" : "N";
            SetSafe(sheet, row, 11, p.Description);
            row++;
        }

        using var output = new MemoryStream();
        workbook.SaveAs(output);
        return output.ToArray();
    }

    /// <summary>Security Considerations: "Export escapes formula-injection prefixes." A stored
    /// product name/description starting with `=`/`+`/`-`/`@` must not turn into a live formula the
    /// moment staff opens the export - same mitigation the platform already uses for the error
    /// workbook (`ExcelSafeText`, D10 / api-conventions.md §7).</summary>
    private static void SetSafe(IXLWorksheet sheet, int row, int col, string? value)
        => sheet.Cell(row, col).Value = ExcelSafeText.Neutralize(value) ?? "";
}
