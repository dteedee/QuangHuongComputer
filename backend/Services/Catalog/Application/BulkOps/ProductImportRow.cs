namespace Catalog.Application.BulkOps;

/// <summary>
/// One row of the `SanPham` import/export sheet (phase-71 Architecture). Plain data holder - all
/// parsing lives in <see cref="ProductImportColumns"/>, all business rules in
/// <see cref="ProductImportService"/>.
/// </summary>
public sealed class ProductImportRow
{
    public string Sku { get; set; } = "";
    public string Name { get; set; } = "";
    public string CategoryText { get; set; } = "";
    public string BrandText { get; set; } = "";

    /// <summary>Giá bán ĐÃ GỒM VAT (D01) - cột "Giá bán (đã gồm VAT)".</summary>
    public decimal SellingPrice { get; set; }

    /// <summary>Giá niêm yết (gạch ngang) - tuỳ chọn, cùng đơn vị với SellingPrice.</summary>
    public decimal? ListPrice { get; set; }

    /// <summary>Giá vốn tham khảo, CHƯA GỒM VAT (D01) - cột "Giá vốn tham khảo (chưa gồm VAT)".</summary>
    public decimal? ReferenceCost { get; set; }

    public string? Barcode { get; set; }
    public int? WarrantyMonths { get; set; }
    public bool ShowOnWeb { get; set; }
    public string? ShortDescription { get; set; }

    // ------- Resolved during validation (not bound from the sheet) -------
    public Guid? ResolvedCategoryId { get; set; }
    public Guid? ResolvedBrandId { get; set; }

    /// <summary>Existing product matched by SKU, when this row updates rather than creates.</summary>
    public Guid? ExistingProductId { get; set; }

    /// <summary>Slug this row will be given (either kept, or renamed to `...-2` etc - report to caller).</summary>
    public string? AllocatedSlug { get; set; }

    /// <summary>True when <see cref="AllocatedSlug"/> differs from the slug generated from Name alone.</summary>
    public bool SlugWasRenamed { get; set; }
}
