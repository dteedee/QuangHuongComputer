namespace SystemConfig.Domain;

public class BackofficeMenuGroup
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string? IconName { get; set; }
    public string? ColorClass { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public List<BackofficeMenuItem> Items { get; set; } = new();
}
