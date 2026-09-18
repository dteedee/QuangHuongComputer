using InventoryModule.Domain;

namespace InventoryModule.Application.BulkOps;

/// <summary>One row of the supplier import (phase-67 Implementation Steps #4): name, tax code,
/// phone, email, address, payment terms. Matched on tax code, then on name — never creates a
/// duplicate silently.</summary>
public sealed class SupplierImportRow
{
    public string Name { get; set; } = string.Empty;
    public string? TaxCode { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public PaymentTermType PaymentTerms { get; set; } = PaymentTermType.COD;

    // --- Resolved during row validation ---
    public Guid? MatchedSupplierId { get; set; }
    public string? MatchedBy { get; set; } // "taxCode" | "name" | null (mới)
}
