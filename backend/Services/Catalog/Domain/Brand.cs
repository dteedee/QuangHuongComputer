namespace Catalog.Domain;

using BuildingBlocks.SharedKernel;

public class Brand : Entity<Guid>
{
    public string Name { get; private set; }
    public string Description { get; private set; }
    public bool IsActive { get; private set; }
    public DateTime? DeactivatedAt { get; private set; }
    public string? DeactivatedBy { get; private set; }

    public Brand(string name, string description)
    {
        Id = Guid.NewGuid();
        Name = name;
        Description = description;
        IsActive = true;
        CreatedAt = DateTime.UtcNow;
    }

    public void UpdateDetails(string name, string description)
    {
        Name = name;
        Description = description;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Activate()
    {
        if (!IsActive)
        {
            IsActive = true;
            DeactivatedAt = null;
            DeactivatedBy = null;
            UpdatedAt = DateTime.UtcNow;
        }
    }

    public void Deactivate(string deactivatedBy = null)
    {
        if (IsActive)
        {
            IsActive = false;
            DeactivatedAt = DateTime.UtcNow;
            DeactivatedBy = deactivatedBy;
            UpdatedAt = DateTime.UtcNow;
        }
    }

    // EF Core constructor
    protected Brand() { }
}
