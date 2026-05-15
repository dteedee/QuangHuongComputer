namespace SystemConfig.Domain;

public class FormDefinition
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Unique code, e.g. "customer_intake"</summary>
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    /// <summary>Linked entity type: "Customer", "Lead", etc. or null for standalone</summary>
    public string? EntityType { get; set; }

    /// <summary>JSON array of field refs + layout. See FieldsSchema format.</summary>
    public string FieldsSchema { get; set; } = "[]";

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
