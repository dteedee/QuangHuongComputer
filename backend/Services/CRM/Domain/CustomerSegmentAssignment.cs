using BuildingBlocks.SharedKernel;

namespace CRM.Domain;

/// <summary>
/// Junction table linking customers to segments
/// </summary>
public class CustomerSegmentAssignment : Entity<Guid>
{
    public Guid CustomerAnalyticsId { get; private set; }
    public CustomerAnalytics CustomerAnalytics { get; private set; } = null!;

    public Guid SegmentId { get; private set; }
    public CustomerSegment Segment { get; private set; } = null!;

    /// <summary>
    /// Was this assignment made automatically by rules?
    /// </summary>
    public bool IsAutoAssigned { get; private set; }

    /// <summary>
    /// User who made the assignment (null if auto)
    /// </summary>
    public Guid? AssignedByUserId { get; private set; }

    /// <summary>
    /// When was this assignment made
    /// </summary>
    public DateTime AssignedAt { get; private set; }

    public CustomerSegmentAssignment(Guid customerAnalyticsId, Guid segmentId, bool isAutoAssigned = false, Guid? assignedByUserId = null)
    {
        Id = Guid.NewGuid();
        CustomerAnalyticsId = customerAnalyticsId;
        SegmentId = segmentId;
        IsAutoAssigned = isAutoAssigned;
        AssignedByUserId = assignedByUserId;
        AssignedAt = DateTime.UtcNow;
    }

    protected CustomerSegmentAssignment() { }
}
