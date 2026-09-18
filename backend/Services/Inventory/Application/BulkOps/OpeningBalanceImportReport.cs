using BuildingBlocks.Spreadsheet;

namespace InventoryModule.Application.BulkOps;

/// <summary>Outcome handed back to <c>OpeningBalanceEndpoints</c> — enough for the FE to render a
/// result screen without a second query (mirrors Catalog's <c>ProductImportReport</c> shape).</summary>
public sealed class OpeningBalanceImportReport
{
    public string Mode { get; init; } = "dryRun";
    public int TotalRows { get; set; }
    public int Committed { get; set; }
    public List<ExcelImportError> Errors { get; } = new();
    public bool IsValid => Errors.Count == 0;
}
