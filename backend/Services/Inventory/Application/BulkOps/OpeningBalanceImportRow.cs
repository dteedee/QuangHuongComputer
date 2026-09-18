namespace InventoryModule.Application.BulkOps;

/// <summary>
/// One row of the opening-balance import (phase-67 step 1-2): raw cell text plus what the row
/// resolves to once the SKU and warehouse code are looked up against the database.
///
/// <para>
/// D10 rule 5 / phase-67 Key Insights: W0-6 created <c>InventoryItem</c> rows for the 70 launch
/// SKUs WITH a quantity but WITHOUT a movement, so "no movement yet" alone is not a safe
/// precondition — <see cref="OpeningBalanceLookup"/> also checks the on-hand quantity is zero.
/// </para>
/// </summary>
public sealed class OpeningBalanceImportRow
{
    public string Sku { get; set; } = string.Empty;
    public string WarehouseCode { get; set; } = string.Empty;
    public int Quantity { get; set; }

    /// <summary>D01: excluding VAT — the selling price is VAT-inclusive, the cost here is not.</summary>
    public decimal UnitCostExclVat { get; set; }

    public string? SerialsRaw { get; set; }

    // --- Resolved during row validation (OpeningBalanceEndpoints.ValidateRows) ---
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public bool IsSerialTracked { get; set; }
    public int WarrantyMonths { get; set; } = 12;
    public Guid WarehouseId { get; set; }
    public List<string> Serials { get; } = new();
}
