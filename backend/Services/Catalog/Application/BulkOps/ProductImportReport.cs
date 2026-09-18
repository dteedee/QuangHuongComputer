using BuildingBlocks.Spreadsheet;

namespace Catalog.Application.BulkOps;

/// <summary>Response shape for both dry-run and commit (Requirements: `{created, updated, skipped, errors[]}`).</summary>
public sealed class ProductImportReport
{
    public string Mode { get; init; } = "dryRun";
    public int Created { get; set; }
    public int Updated { get; set; }
    public int Skipped { get; set; }
    public int TotalRows { get; set; }
    public List<ExcelImportError> Errors { get; } = new();

    /// <summary>Non-blocking notes - keyed by SKU (see ProductImportService deviation note on Excel
    /// row numbers not being available for post-parse checks).</summary>
    public List<string> Warnings { get; } = new();

    /// <summary>SKUs whose slug collided and were renamed to `...-2` etc (Success Criteria).</summary>
    public List<RenamedRow> Renames { get; } = new();

    public bool IsValid => Errors.Count == 0;

    public sealed record RenamedRow(string Sku, string AllocatedSlug);
}
