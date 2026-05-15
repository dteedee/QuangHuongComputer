namespace SystemConfig.Domain;

public enum ConfigValueType
{
    String,
    Number,
    Boolean,
    Json,
    Secret,
    Url,
    Email,
    Percentage
}

public class ConfigurationEntry
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Module { get; set; } = "Global";
    public ConfigValueType ValueType { get; set; } = ConfigValueType.String;
    public string? JsonValue { get; set; }
    public bool IsSystem { get; set; }
    public int SortOrder { get; set; }
    public DateTime LastUpdated { get; set; }
}
