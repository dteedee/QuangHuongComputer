using BuildingBlocks.SharedKernel;

namespace Warranty.Domain;

public class WarrantyPolicy : Entity<Guid>
{
    public string Name { get; private set; }
    public string Description { get; private set; }
    public int DurationMonths { get; private set; }
    public string CoverageTerms { get; private set; }

    public WarrantyPolicy(string name, string description, int durationMonths, string coverageTerms)
    {
        Id = Guid.NewGuid();
        Name = name;
        Description = description;
        DurationMonths = durationMonths;
        CoverageTerms = coverageTerms;
    }

    protected WarrantyPolicy() { }
}
