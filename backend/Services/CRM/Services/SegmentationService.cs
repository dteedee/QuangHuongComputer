using System.Text.Json;
using CRM.Domain;
using CRM.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CRM.Services;

public class SegmentationService : ISegmentationService
{
    private readonly CrmDbContext _crmDb;
    private readonly ILogger<SegmentationService> _logger;

    public SegmentationService(
        CrmDbContext crmDb,
        ILogger<SegmentationService> logger)
    {
        _crmDb = crmDb;
        _logger = logger;
    }

    public async Task<List<CustomerSegment>> GetAllSegmentsAsync(CancellationToken cancellationToken = default)
    {
        return await _crmDb.CustomerSegments
            .AsNoTracking()
            .OrderBy(s => s.SortOrder)
            .ToListAsync(cancellationToken);
    }

    public async Task<CustomerSegment?> GetSegmentByIdAsync(Guid segmentId, CancellationToken cancellationToken = default)
    {
        return await _crmDb.CustomerSegments
            .FirstOrDefaultAsync(s => s.Id == segmentId, cancellationToken);
    }

    public async Task<CustomerSegment> CreateSegmentAsync(
        string name, string code, string? description, string color, int sortOrder,
        CancellationToken cancellationToken = default)
    {
        // Check for duplicate code
        var exists = await _crmDb.CustomerSegments
            .AnyAsync(s => s.Code == code.ToUpperInvariant(), cancellationToken);

        if (exists)
            throw new InvalidOperationException($"Segment with code '{code}' already exists");

        var segment = new CustomerSegment(name, code, description);
        segment.Update(name, description, color, sortOrder);

        _crmDb.CustomerSegments.Add(segment);
        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Created segment {SegmentName} ({SegmentCode})", name, code);

        return segment;
    }

    public async Task<CustomerSegment?> UpdateSegmentAsync(
        Guid segmentId, string name, string? description, string color, int sortOrder,
        CancellationToken cancellationToken = default)
    {
        var segment = await _crmDb.CustomerSegments
            .FirstOrDefaultAsync(s => s.Id == segmentId, cancellationToken);

        if (segment == null)
            return null;

        segment.Update(name, description, color, sortOrder);
        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Updated segment {SegmentId}", segmentId);

        return segment;
    }

    public async Task<bool> DeleteSegmentAsync(Guid segmentId, CancellationToken cancellationToken = default)
    {
        var segment = await _crmDb.CustomerSegments
            .FirstOrDefaultAsync(s => s.Id == segmentId, cancellationToken);

        if (segment == null)
            return false;

        segment.IsActive = false;
        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Deleted segment {SegmentId}", segmentId);

        return true;
    }

    public async Task<CustomerSegment?> SetSegmentRulesAsync(
        Guid segmentId, string ruleDefinition,
        CancellationToken cancellationToken = default)
    {
        var segment = await _crmDb.CustomerSegments
            .FirstOrDefaultAsync(s => s.Id == segmentId, cancellationToken);

        if (segment == null)
            return null;

        segment.SetAutoAssignRules(ruleDefinition);
        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Set auto-assign rules for segment {SegmentId}", segmentId);

        return segment;
    }

    public async Task<bool> AssignCustomerToSegmentAsync(
        Guid customerAnalyticsId, Guid segmentId, Guid? assignedByUserId,
        CancellationToken cancellationToken = default)
    {
        // Check if already assigned
        var exists = await _crmDb.CustomerSegmentAssignments
            .AnyAsync(a => a.CustomerAnalyticsId == customerAnalyticsId && a.SegmentId == segmentId, cancellationToken);

        if (exists)
            return false;

        var assignment = new CustomerSegmentAssignment(
            customerAnalyticsId, segmentId, isAutoAssigned: false, assignedByUserId);

        _crmDb.CustomerSegmentAssignments.Add(assignment);
        await _crmDb.SaveChangesAsync(cancellationToken);

        // Update segment count
        await UpdateSegmentCountAsync(segmentId, cancellationToken);

        _logger.LogInformation("Assigned customer {CustomerId} to segment {SegmentId}", customerAnalyticsId, segmentId);

        return true;
    }

    public async Task<bool> RemoveCustomerFromSegmentAsync(
        Guid customerAnalyticsId, Guid segmentId,
        CancellationToken cancellationToken = default)
    {
        var assignment = await _crmDb.CustomerSegmentAssignments
            .FirstOrDefaultAsync(a => a.CustomerAnalyticsId == customerAnalyticsId && a.SegmentId == segmentId, cancellationToken);

        if (assignment == null)
            return false;

        _crmDb.CustomerSegmentAssignments.Remove(assignment);
        await _crmDb.SaveChangesAsync(cancellationToken);

        // Update segment count
        await UpdateSegmentCountAsync(segmentId, cancellationToken);

        _logger.LogInformation("Removed customer {CustomerId} from segment {SegmentId}", customerAnalyticsId, segmentId);

        return true;
    }

    public async Task<int> RunAutoAssignmentAsync(CancellationToken cancellationToken = default)
    {
        int totalAssigned = 0;

        // Get all auto-assign segments
        var autoSegments = await _crmDb.CustomerSegments
            .Where(s => s.IsAutoAssign && !string.IsNullOrEmpty(s.RuleDefinition))
            .ToListAsync(cancellationToken);

        foreach (var segment in autoSegments)
        {
            if (cancellationToken.IsCancellationRequested)
                break;

            try
            {
                var assigned = await ProcessAutoAssignmentForSegment(segment, cancellationToken);
                totalAssigned += assigned;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process auto-assignment for segment {SegmentId}", segment.Id);
            }
        }

        _logger.LogInformation("Auto-assignment completed. Total assigned: {Count}", totalAssigned);

        return totalAssigned;
    }

    private async Task<int> ProcessAutoAssignmentForSegment(CustomerSegment segment, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(segment.RuleDefinition))
            return 0;

        // Parse rule definition
        var rules = JsonSerializer.Deserialize<SegmentRules>(segment.RuleDefinition);
        if (rules == null)
            return 0;

        // Build query based on rules
        var query = _crmDb.CustomerAnalytics.AsQueryable();

        // Filter by minimum RFM score
        if (rules.MinRfmScore.HasValue)
        {
            var minScore = rules.MinRfmScore.Value;
            query = query.Where(c =>
                c.RecencyScore + c.FrequencyScore + c.MonetaryScore >= minScore);
        }

        // Filter by maximum RFM score
        if (rules.MaxRfmScore.HasValue)
        {
            var maxScore = rules.MaxRfmScore.Value;
            query = query.Where(c =>
                c.RecencyScore + c.FrequencyScore + c.MonetaryScore <= maxScore);
        }

        // Filter by lifecycle stages
        if (rules.LifecycleStages?.Any() == true)
        {
            query = query.Where(c => rules.LifecycleStages.Contains(c.LifecycleStage));
        }

        // Filter by minimum total spent
        if (rules.MinTotalSpent.HasValue)
        {
            query = query.Where(c => c.TotalSpent >= rules.MinTotalSpent.Value);
        }

        // Filter by minimum order count
        if (rules.MinOrderCount.HasValue)
        {
            query = query.Where(c => c.TotalOrderCount >= rules.MinOrderCount.Value);
        }

        // Get matching customers who are not already assigned
        var existingAssignments = _crmDb.CustomerSegmentAssignments
            .Where(a => a.SegmentId == segment.Id)
            .Select(a => a.CustomerAnalyticsId);

        var customersToAssign = await query
            .Where(c => !existingAssignments.Contains(c.Id))
            .Select(c => c.Id)
            .ToListAsync(cancellationToken);

        // Create assignments
        foreach (var customerId in customersToAssign)
        {
            var assignment = new CustomerSegmentAssignment(
                customerId, segment.Id, isAutoAssigned: true, assignedByUserId: null);
            _crmDb.CustomerSegmentAssignments.Add(assignment);
        }

        await _crmDb.SaveChangesAsync(cancellationToken);

        // Update segment count
        await UpdateSegmentCountAsync(segment.Id, cancellationToken);

        return customersToAssign.Count;
    }

    public async Task<List<CustomerAnalytics>> GetCustomersInSegmentAsync(
        Guid segmentId, int page, int pageSize,
        CancellationToken cancellationToken = default)
    {
        return await _crmDb.CustomerSegmentAssignments
            .Where(a => a.SegmentId == segmentId)
            .Include(a => a.CustomerAnalytics)
            .Select(a => a.CustomerAnalytics)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
    }

    public async Task UpdateSegmentCountsAsync(CancellationToken cancellationToken = default)
    {
        var segments = await _crmDb.CustomerSegments.ToListAsync(cancellationToken);

        foreach (var segment in segments)
        {
            await UpdateSegmentCountAsync(segment.Id, cancellationToken);
        }
    }

    private async Task UpdateSegmentCountAsync(Guid segmentId, CancellationToken cancellationToken)
    {
        var segment = await _crmDb.CustomerSegments
            .FirstOrDefaultAsync(s => s.Id == segmentId, cancellationToken);

        if (segment == null)
            return;

        var count = await _crmDb.CustomerSegmentAssignments
            .CountAsync(a => a.SegmentId == segmentId, cancellationToken);

        segment.UpdateCustomerCount(count);
        await _crmDb.SaveChangesAsync(cancellationToken);
    }

    private class SegmentRules
    {
        public int? MinRfmScore { get; set; }
        public int? MaxRfmScore { get; set; }
        public List<LifecycleStage>? LifecycleStages { get; set; }
        public decimal? MinTotalSpent { get; set; }
        public int? MinOrderCount { get; set; }
    }
}
