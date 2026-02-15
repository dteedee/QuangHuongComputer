using BuildingBlocks.SharedKernel;

namespace CRM.Domain;

/// <summary>
/// Pipeline stage for lead management (Kanban columns)
/// </summary>
public class LeadPipelineStage : Entity<Guid>
{
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public string Color { get; private set; } = "#3B82F6";

    /// <summary>
    /// Order in the pipeline (left to right)
    /// </summary>
    public int SortOrder { get; private set; }

    /// <summary>
    /// Probability of conversion at this stage (0-100)
    /// </summary>
    public int WinProbability { get; private set; }

    /// <summary>
    /// Is this a final stage (Won/Lost)?
    /// </summary>
    public bool IsFinalStage { get; private set; }

    /// <summary>
    /// Is this the "Won" stage?
    /// </summary>
    public bool IsWonStage { get; private set; }

    /// <summary>
    /// Number of leads currently in this stage (cached)
    /// </summary>
    public int LeadCount { get; private set; }

    /// <summary>
    /// Total estimated value of leads in this stage (cached)
    /// </summary>
    public decimal TotalEstimatedValue { get; private set; }

    public List<Lead> Leads { get; private set; } = new();

    public LeadPipelineStage(string name, int sortOrder, int winProbability = 0)
    {
        Id = Guid.NewGuid();
        Name = name;
        SortOrder = sortOrder;
        WinProbability = Math.Clamp(winProbability, 0, 100);
    }

    protected LeadPipelineStage() { }

    public void Update(string name, string? description, string color, int sortOrder, int winProbability)
    {
        Name = name;
        Description = description;
        Color = color;
        SortOrder = sortOrder;
        WinProbability = Math.Clamp(winProbability, 0, 100);
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetAsFinalStage(bool isWon)
    {
        IsFinalStage = true;
        IsWonStage = isWon;
        WinProbability = isWon ? 100 : 0;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UnsetAsFinalStage()
    {
        IsFinalStage = false;
        IsWonStage = false;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateStats(int leadCount, decimal totalValue)
    {
        LeadCount = leadCount;
        TotalEstimatedValue = totalValue;
        UpdatedAt = DateTime.UtcNow;
    }
}
