namespace Catalog.Domain;

using BuildingBlocks.SharedKernel;

public class Category : Entity<Guid>
{
    public string Name { get; private set; }
    public string Description { get; private set; }

    public Category(string name, string description)
    {
        Id = Guid.NewGuid();
        Name = name;
        Description = description;
    }

    public void UpdateDetails(string name, string description)
    {
        Name = name;
        Description = description;
        UpdatedAt = DateTime.UtcNow;
    }

    protected Category() {}
}
