namespace SystemConfig.Domain;

public class AutomationRule
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = string.Empty;

    /// <summary>Entity type that this rule applies to: "Product", "Customer", "Lead", etc.</summary>
    public string EntityType { get; set; } = string.Empty;

    /// <summary>created | updated | status_changed | field_changed</summary>
    public string TriggerEvent { get; set; } = string.Empty;

    /// <summary>Which field triggers the rule (used when TriggerEvent = "field_changed")</summary>
    public string? TriggerField { get; set; }

    /// <summary>JSON: { field, operator, value } — condition to evaluate before executing action</summary>
    public string ConditionJson { get; set; } = "{}";

    /// <summary>send_notification | create_entity | update_field | send_email</summary>
    public string ActionType { get; set; } = string.Empty;

    /// <summary>JSON: action-specific configuration object</summary>
    public string ActionConfig { get; set; } = "{}";

    public bool IsActive { get; set; } = true;

    /// <summary>Lower number executes first when multiple rules match</summary>
    public int ExecutionOrder { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
