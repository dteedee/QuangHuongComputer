namespace SystemConfig.Domain;

public class ConfigurationEntry
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty; // VAT, Shipping, SLA, etc.
    public DateTime LastUpdated { get; set; }
}
