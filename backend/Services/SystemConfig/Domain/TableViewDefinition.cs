namespace SystemConfig.Domain;

/// <summary>
/// Cấu hình bảng dữ liệu động cho trang admin (data-grid). Mirror pattern của FormDefinition:
/// FE fetch theo Key, render cột từ ColumnsJson thay vì hard-code.
/// </summary>
public class TableViewDefinition
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Unique key, e.g. "admin.products", "admin.orders", "admin.leads"</summary>
    public string Key { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    /// <summary>JSON array: [{key,label,type,sortable,visible,width,format}]</summary>
    public string ColumnsJson { get; set; } = "[]";

    /// <summary>JSON array of filter definitions (optional): [{key,label,type,options}]</summary>
    public string? FiltersJson { get; set; }

    /// <summary>System-seeded definitions cannot be deleted (only customized)</summary>
    public bool IsSystem { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
