using CRM.Domain;

namespace CRM.Services;

public interface ISegmentationService
{
    /// <summary>
    /// Get all segments
    /// </summary>
    Task<List<CustomerSegment>> GetAllSegmentsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Get segment by ID
    /// </summary>
    Task<CustomerSegment?> GetSegmentByIdAsync(Guid segmentId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Create a new segment
    /// </summary>
    Task<CustomerSegment> CreateSegmentAsync(string name, string code, string? description, string color, int sortOrder, CancellationToken cancellationToken = default);

    /// <summary>
    /// Update segment
    /// </summary>
    Task<CustomerSegment?> UpdateSegmentAsync(Guid segmentId, string name, string? description, string color, int sortOrder, CancellationToken cancellationToken = default);

    /// <summary>
    /// Delete segment (soft delete)
    /// </summary>
    Task<bool> DeleteSegmentAsync(Guid segmentId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Set auto-assign rules for a segment
    /// </summary>
    Task<CustomerSegment?> SetSegmentRulesAsync(Guid segmentId, string ruleDefinition, CancellationToken cancellationToken = default);

    /// <summary>
    /// Manually assign a customer to a segment
    /// </summary>
    Task<bool> AssignCustomerToSegmentAsync(Guid customerAnalyticsId, Guid segmentId, Guid? assignedByUserId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Remove customer from segment
    /// </summary>
    Task<bool> RemoveCustomerFromSegmentAsync(Guid customerAnalyticsId, Guid segmentId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Run auto-assignment for all auto-assign segments
    /// </summary>
    Task<int> RunAutoAssignmentAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Get customers in a segment
    /// </summary>
    Task<List<CustomerAnalytics>> GetCustomersInSegmentAsync(Guid segmentId, int page, int pageSize, CancellationToken cancellationToken = default);

    /// <summary>
    /// Update segment customer counts
    /// </summary>
    Task UpdateSegmentCountsAsync(CancellationToken cancellationToken = default);
}
