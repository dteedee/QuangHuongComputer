namespace SystemConfig.Domain;

public class SavedReportPreset
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ReportDefinitionId { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string VisibleColumns { get; set; } = "[]"; // jsonb — column keys to show
    public string ColumnOrder { get; set; } = "[]";    // jsonb — display order
    public string FilterValues { get; set; } = "{}";   // jsonb — saved filter values
    public string? SortColumn { get; set; }
    public string? SortDirection { get; set; }
    public bool IsDefault { get; set; } = false;
    public bool IsShared { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ReportDefinition? ReportDefinition { get; set; }
}
