namespace SystemConfig.Domain;

public class ReportDefinition
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty;
    public string DataSourceEndpoint { get; set; } = string.Empty;
    public string AvailableColumns { get; set; } = "[]"; // jsonb
    public string AvailableFilters { get; set; } = "[]"; // jsonb
    public string? DefaultSortColumn { get; set; }
    public string DefaultSortDirection { get; set; } = "desc";
    public string AllowedRoles { get; set; } = "[\"Admin\",\"Manager\"]"; // jsonb
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<SavedReportPreset> Presets { get; set; } = new List<SavedReportPreset>();
}
