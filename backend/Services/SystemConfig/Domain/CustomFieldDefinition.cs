namespace SystemConfig.Domain;

public class CustomFieldDefinition
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Entity type: "Product", "Customer", "Order", "Lead", "RepairJob"</summary>
    public string EntityType { get; set; } = string.Empty;

    /// <summary>Programmatic key (snake_case), unique per entity type</summary>
    public string FieldKey { get; set; } = string.Empty;

    /// <summary>UI display label</summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>text | number | boolean | date | select | multiselect | url | email</summary>
    public string FieldType { get; set; } = "text";

    /// <summary>JSON array of options for select/multiselect types</summary>
    public string? OptionsJson { get; set; }

    public string? DefaultValue { get; set; }

    public bool IsRequired { get; set; }

    /// <summary>Show field values in list view columns</summary>
    public bool IsVisibleInList { get; set; }

    /// <summary>Allow filtering by this field in list views</summary>
    public bool IsFilterable { get; set; }

    /// <summary>Visible on public-facing pages</summary>
    public bool IsPublic { get; set; }

    public int DisplayOrder { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
