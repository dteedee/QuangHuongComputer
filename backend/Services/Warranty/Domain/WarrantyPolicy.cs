using BuildingBlocks.SharedKernel;

namespace Warranty.Domain;

public class WarrantyPolicy : Entity<Guid>
{
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public int DurationMonths { get; private set; }
    public string CoverageTerms { get; private set; } = string.Empty;

    // Phase 07: phạm vi + loại trừ.
    public string? Scope { get; private set; }
    /// <summary>JSON array — VD: ["rơi vỡ","vào nước","tự tháo máy"].</summary>
    public string? Exclusions { get; private set; }
    /// <summary>Nhà cung cấp bảo hành mà policy này áp dụng.</summary>
    public WarrantyProvider Provider { get; private set; } = WarrantyProvider.Manufacturer;

    public WarrantyPolicy(
        string name,
        string description,
        int durationMonths,
        string coverageTerms,
        string? scope = null,
        string? exclusions = null,
        WarrantyProvider provider = WarrantyProvider.Manufacturer)
    {
        Id = Guid.NewGuid();
        Name = name;
        Description = description;
        DurationMonths = durationMonths;
        CoverageTerms = coverageTerms;
        Scope = scope;
        Exclusions = exclusions;
        Provider = provider;
    }

    protected WarrantyPolicy() { }

    public void Update(string name, string description, int durationMonths, string coverageTerms,
        string? scope, string? exclusions, WarrantyProvider provider)
    {
        Name = name;
        Description = description;
        DurationMonths = durationMonths;
        CoverageTerms = coverageTerms;
        Scope = scope;
        Exclusions = exclusions;
        Provider = provider;
        UpdatedAt = DateTime.UtcNow;
    }
}
