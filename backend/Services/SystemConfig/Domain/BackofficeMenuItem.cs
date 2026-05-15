namespace SystemConfig.Domain;

public class BackofficeMenuItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GroupId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? IconName { get; set; }
    public string Path { get; set; } = string.Empty;
    public List<string> AllowedRoles { get; set; } = new() { "Admin" };
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public string? BadgeSource { get; set; }
    public bool OpenInNewTab { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public BackofficeMenuGroup? Group { get; set; }
}
