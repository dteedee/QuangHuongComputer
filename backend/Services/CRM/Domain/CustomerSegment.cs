using BuildingBlocks.SharedKernel;

namespace CRM.Domain;

/// <summary>
/// Customer segment definition for grouping customers
/// </summary>
public class CustomerSegment : Entity<Guid>
{
    public string Name { get; private set; } = string.Empty;
    public string Code { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public string Color { get; private set; } = "#3B82F6"; // Default blue

    /// <summary>
    /// JSON definition of auto-assignment rules
    /// Example: { "minRfmScore": 10, "lifecycleStages": ["VIP", "Champion"] }
    /// </summary>
    public string? RuleDefinition { get; private set; }

    /// <summary>
    /// If true, customers are automatically assigned based on rules
    /// </summary>
    public bool IsAutoAssign { get; private set; }

    /// <summary>
    /// Sort order for display
    /// </summary>
    public int SortOrder { get; private set; }

    /// <summary>
    /// Count of customers in this segment (cached for performance)
    /// </summary>
    public int CustomerCount { get; private set; }

    public List<CustomerSegmentAssignment> Assignments { get; private set; } = new();

    public CustomerSegment(string name, string code, string? description = null)
    {
        Id = Guid.NewGuid();
        Name = name;
        Code = code.ToUpperInvariant();
        Description = description;
    }

    protected CustomerSegment() { }

    public void Update(string name, string? description, string color, int sortOrder)
    {
        Name = name;
        Description = description;
        Color = color;
        SortOrder = sortOrder;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetAutoAssignRules(string ruleDefinition)
    {
        RuleDefinition = ruleDefinition;
        IsAutoAssign = !string.IsNullOrWhiteSpace(ruleDefinition);
        UpdatedAt = DateTime.UtcNow;
    }

    public void ClearAutoAssignRules()
    {
        RuleDefinition = null;
        IsAutoAssign = false;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateCustomerCount(int count)
    {
        CustomerCount = count;
        UpdatedAt = DateTime.UtcNow;
    }
}
