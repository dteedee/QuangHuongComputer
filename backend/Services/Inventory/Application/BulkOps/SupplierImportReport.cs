using BuildingBlocks.Spreadsheet;

namespace InventoryModule.Application.BulkOps;

/// <summary>Outcome of a supplier import — mirrors <see cref="OpeningBalanceImportReport"/>'s
/// shape (mode/total/errors) plus the created-vs-matched split the FE needs to show.</summary>
public sealed class SupplierImportReport
{
    public string Mode { get; init; } = "dryRun";
    public int TotalRows { get; set; }
    public int Created { get; set; }
    public int Matched { get; set; }
    public List<ExcelImportError> Errors { get; } = new();
    public bool IsValid => Errors.Count == 0;
}
