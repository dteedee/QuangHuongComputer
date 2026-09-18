using System.Text;

namespace Catalog.Infrastructure.Data.Import;

/// <summary>
/// What the run actually did. A second run on an unchanged dataset must report every
/// "created"/"updated" counter at zero - that is the idempotency check D03 step 6 asks for.
/// </summary>
public sealed class ProductImportSummary
{
    public int CategoriesUpdated { get; set; }
    public int BrandsCreated { get; set; }
    public int BrandsUpdated { get; set; }

    public int ProductsCreated { get; set; }
    public int ProductsUpdated { get; set; }
    public int ProductsUnchanged { get; set; }
    public int ProductsRejected { get; set; }
    public int ProductsFailed { get; set; }

    public int MediaWritten { get; set; }
    public int SpecRowsWritten { get; set; }

    public int WarehousesCreated { get; set; }
    public int InventoryItemsCreated { get; set; }
    public int InventoryItemsUpdated { get; set; }

    public List<(string Slug, string Reason)> Rejections { get; } = new();
    public List<(string Slug, string Error)> Failures { get; } = new();

    /// <summary>True when nothing at all changed - what a re-run must report.</summary>
    public bool IsNoOp =>
        CategoriesUpdated == 0 && BrandsCreated == 0 && BrandsUpdated == 0 &&
        ProductsCreated == 0 && ProductsUpdated == 0 && ProductsFailed == 0 &&
        WarehousesCreated == 0 && InventoryItemsCreated == 0 && InventoryItemsUpdated == 0;

    public override string ToString()
    {
        var sb = new StringBuilder();
        sb.AppendLine("--- product import summary ---");
        sb.AppendLine($"categories updated  : {CategoriesUpdated}");
        sb.AppendLine($"brands              : {BrandsCreated} created, {BrandsUpdated} updated");
        sb.AppendLine($"products            : {ProductsCreated} created, {ProductsUpdated} updated, {ProductsUnchanged} unchanged, {ProductsRejected} rejected, {ProductsFailed} failed");
        sb.AppendLine($"media rows          : {MediaWritten}");
        sb.AppendLine($"spec rows (jsonb)   : {SpecRowsWritten}");
        sb.AppendLine($"warehouses created  : {WarehousesCreated}");
        sb.AppendLine($"inventory items     : {InventoryItemsCreated} created, {InventoryItemsUpdated} updated");
        foreach (var (slug, reason) in Rejections) sb.AppendLine($"  REJECTED {slug}: {reason}");
        foreach (var (slug, error) in Failures) sb.AppendLine($"  FAILED   {slug}: {error}");
        sb.Append($"no-op: {IsNoOp}");
        return sb.ToString();
    }
}
