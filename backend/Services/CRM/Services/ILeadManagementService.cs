using CRM.Domain;
using CRM.DTOs;

namespace CRM.Services;

public interface ILeadManagementService
{
    /// <summary>
    /// Get leads with pagination and filtering
    /// </summary>
    Task<PagedResult<Lead>> GetLeadsAsync(LeadQueryParams queryParams, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get lead by ID
    /// </summary>
    Task<Lead?> GetLeadByIdAsync(Guid leadId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Create a new lead
    /// </summary>
    Task<Lead> CreateLeadAsync(CreateLeadDto dto, CancellationToken cancellationToken = default);

    /// <summary>
    /// Update lead
    /// </summary>
    Task<Lead?> UpdateLeadAsync(Guid leadId, UpdateLeadDto dto, CancellationToken cancellationToken = default);

    /// <summary>
    /// Delete lead (soft delete)
    /// </summary>
    Task<bool> DeleteLeadAsync(Guid leadId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Assign lead to user
    /// </summary>
    Task<Lead?> AssignLeadAsync(Guid leadId, Guid userId, string userName, CancellationToken cancellationToken = default);

    /// <summary>
    /// Move lead to pipeline stage
    /// </summary>
    Task<Lead?> MoveToStageAsync(Guid leadId, Guid stageId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Set follow-up for lead
    /// </summary>
    Task<Lead?> SetFollowUpAsync(Guid leadId, DateTime followUpDate, string? note, CancellationToken cancellationToken = default);

    /// <summary>
    /// Convert lead to customer
    /// </summary>
    Task<Guid?> ConvertLeadAsync(Guid leadId, string? notes, CancellationToken cancellationToken = default);

    /// <summary>
    /// Mark lead as lost
    /// </summary>
    Task<Lead?> MarkAsLostAsync(Guid leadId, string reason, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get pipeline stages
    /// </summary>
    Task<List<LeadPipelineStage>> GetPipelineStagesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Create pipeline stage
    /// </summary>
    Task<LeadPipelineStage> CreatePipelineStageAsync(CreatePipelineStageDto dto, CancellationToken cancellationToken = default);

    /// <summary>
    /// Update pipeline stage
    /// </summary>
    Task<LeadPipelineStage?> UpdatePipelineStageAsync(Guid stageId, UpdatePipelineStageDto dto, CancellationToken cancellationToken = default);

    /// <summary>
    /// Delete pipeline stage
    /// </summary>
    Task<bool> DeletePipelineStageAsync(Guid stageId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get leads grouped by pipeline stage (for Kanban)
    /// </summary>
    Task<Dictionary<Guid, List<Lead>>> GetLeadsByPipelineAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Add interaction to lead
    /// </summary>
    Task<CustomerInteraction> AddInteractionAsync(Guid leadId, CreateInteractionDto dto, Guid userId, string userName, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get leads with upcoming follow-ups
    /// </summary>
    Task<List<Lead>> GetUpcomingFollowUpsAsync(int days = 7, Guid? assignedToUserId = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Update pipeline stage statistics
    /// </summary>
    Task UpdatePipelineStatsAsync(CancellationToken cancellationToken = default);
}
