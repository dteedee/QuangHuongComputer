using BuildingBlocks.Contracts;
using CRM.Domain;
using CRM.DTOs;
using CRM.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CRM.Services;

public class LeadManagementService : ILeadManagementService
{
    private readonly CrmDbContext _crmDb;
    private readonly IUserDirectory _userDirectory;
    private readonly ILogger<LeadManagementService> _logger;

    public LeadManagementService(
        CrmDbContext crmDb,
        IUserDirectory userDirectory,
        ILogger<LeadManagementService> logger)
    {
        _crmDb = crmDb;
        _userDirectory = userDirectory;
        _logger = logger;
    }

    public async Task<PagedResult<Lead>> GetLeadsAsync(LeadQueryParams queryParams, CancellationToken cancellationToken = default)
    {
        var query = _crmDb.Leads
            .Include(l => l.PipelineStage)
            .AsNoTracking()
            .AsQueryable();

        // Apply filters
        if (!string.IsNullOrWhiteSpace(queryParams.SearchText))
        {
            var search = queryParams.SearchText.ToLower();
            query = query.Where(l =>
                l.FullName.ToLower().Contains(search) ||
                l.Email.ToLower().Contains(search) ||
                (l.Company != null && l.Company.ToLower().Contains(search)) ||
                (l.Phone != null && l.Phone.Contains(search)));
        }

        if (queryParams.Status.HasValue)
        {
            query = query.Where(l => l.Status == queryParams.Status.Value);
        }

        if (queryParams.Source.HasValue)
        {
            query = query.Where(l => l.Source == queryParams.Source.Value);
        }

        if (queryParams.PipelineStageId.HasValue)
        {
            query = query.Where(l => l.PipelineStageId == queryParams.PipelineStageId.Value);
        }

        if (queryParams.AssignedToUserId.HasValue)
        {
            query = query.Where(l => l.AssignedToUserId == queryParams.AssignedToUserId.Value);
        }

        if (queryParams.HasFollowUpToday == true)
        {
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);
            query = query.Where(l => l.NextFollowUpAt >= today && l.NextFollowUpAt < tomorrow);
        }

        // Get total count
        var total = await query.CountAsync(cancellationToken);

        // Apply sorting
        query = queryParams.SortBy?.ToLower() switch
        {
            "fullname" => (queryParams.SortDesc ?? true) ? query.OrderByDescending(l => l.FullName) : query.OrderBy(l => l.FullName),
            "company" => (queryParams.SortDesc ?? true) ? query.OrderByDescending(l => l.Company) : query.OrderBy(l => l.Company),
            "status" => (queryParams.SortDesc ?? true) ? query.OrderByDescending(l => l.Status) : query.OrderBy(l => l.Status),
            "estimatedvalue" => (queryParams.SortDesc ?? true) ? query.OrderByDescending(l => l.EstimatedValue) : query.OrderBy(l => l.EstimatedValue),
            "nextfollowupat" => (queryParams.SortDesc ?? true) ? query.OrderByDescending(l => l.NextFollowUpAt) : query.OrderBy(l => l.NextFollowUpAt),
            _ => (queryParams.SortDesc ?? true) ? query.OrderByDescending(l => l.CreatedAt) : query.OrderBy(l => l.CreatedAt)
        };

        // Apply pagination
        var items = await query
            .Skip(queryParams.Skip)
            .Take(queryParams.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<Lead>(items, total, queryParams.PageNumber < 1 ? 1 : queryParams.PageNumber, queryParams.PageSize);
    }

    public async Task<Lead?> GetLeadByIdAsync(Guid leadId, CancellationToken cancellationToken = default)
    {
        return await _crmDb.Leads
            .Include(l => l.PipelineStage)
            .Include(l => l.Interactions.OrderByDescending(i => i.PerformedAt).Take(20))
            .FirstOrDefaultAsync(l => l.Id == leadId, cancellationToken);
    }

    /// <summary>
    /// W2-8 step 12: từ chối tạo lead nếu chưa có pipeline stage nào (trước đây tạo được lead
    /// không thuộc giai đoạn nào - "mồ côi", không hiện trên bất kỳ cột Kanban nào và không tính
    /// vào thống kê pipeline). Trả về null khi không có stage; endpoint trả 422.
    /// </summary>
    public async Task<Lead?> CreateLeadAsync(CreateLeadDto dto, CancellationToken cancellationToken = default)
    {
        // Assign to first pipeline stage - required, not optional.
        var firstStage = await _crmDb.LeadPipelineStages
            .OrderBy(s => s.SortOrder)
            .FirstOrDefaultAsync(cancellationToken);

        if (firstStage == null)
        {
            _logger.LogWarning("Cannot create lead {LeadName}: no pipeline stage configured", dto.FullName);
            return null;
        }

        var lead = new Lead(dto.FullName, dto.Email, dto.Source);
        lead.Update(dto.FullName, dto.Phone, dto.Company, dto.JobTitle,
            dto.Address, dto.City, dto.District, dto.Notes);

        if (dto.EstimatedValue.HasValue)
        {
            lead.SetEstimatedValue(dto.EstimatedValue.Value);
        }

        if (dto.Attributes is not null)
        {
            lead.SetAttributes(dto.Attributes);
        }

        lead.SetPipelineStage(firstStage.Id);

        _crmDb.Leads.Add(lead);
        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Created lead {LeadId} - {LeadName}", lead.Id, lead.FullName);

        return lead;
    }

    public async Task<Lead?> UpdateLeadAsync(Guid leadId, UpdateLeadDto dto, CancellationToken cancellationToken = default)
    {
        var lead = await _crmDb.Leads.FirstOrDefaultAsync(l => l.Id == leadId, cancellationToken);

        if (lead == null)
            return null;

        lead.Update(dto.FullName, dto.Phone, dto.Company, dto.JobTitle,
            dto.Address, dto.City, dto.District, dto.Notes);

        if (dto.EstimatedValue.HasValue)
        {
            lead.SetEstimatedValue(dto.EstimatedValue.Value);
        }

        if (dto.Attributes is not null)
        {
            lead.SetAttributes(dto.Attributes);
        }

        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Updated lead {LeadId}", leadId);

        return lead;
    }

    public async Task<bool> DeleteLeadAsync(Guid leadId, CancellationToken cancellationToken = default)
    {
        var lead = await _crmDb.Leads.FirstOrDefaultAsync(l => l.Id == leadId, cancellationToken);

        if (lead == null)
            return false;

        lead.IsActive = false;
        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Deleted lead {LeadId}", leadId);

        return true;
    }

    public async Task<Lead?> AssignLeadAsync(Guid leadId, Guid userId, string userName, CancellationToken cancellationToken = default)
    {
        var lead = await _crmDb.Leads.FirstOrDefaultAsync(l => l.Id == leadId, cancellationToken);

        if (lead == null)
            return null;

        lead.AssignTo(userId, userName);
        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Assigned lead {LeadId} to user {UserId}", leadId, userId);

        return lead;
    }

    public async Task<Lead?> MoveToStageAsync(Guid leadId, Guid stageId, CancellationToken cancellationToken = default)
    {
        var lead = await _crmDb.Leads.FirstOrDefaultAsync(l => l.Id == leadId, cancellationToken);

        if (lead == null)
            return null;

        var stage = await _crmDb.LeadPipelineStages.FirstOrDefaultAsync(s => s.Id == stageId, cancellationToken);

        if (stage == null)
            return null;

        var previousStageId = lead.PipelineStageId;
        lead.SetPipelineStage(stageId);

        // Update status based on stage
        if (stage.IsWonStage)
        {
            lead.UpdateStatus(LeadStatus.Won);
        }
        else if (stage.IsFinalStage && !stage.IsWonStage)
        {
            lead.UpdateStatus(LeadStatus.Lost);
        }

        await _crmDb.SaveChangesAsync(cancellationToken);

        // Update stats for both stages
        if (previousStageId.HasValue)
        {
            await UpdateStageStatsAsync(previousStageId.Value, cancellationToken);
        }
        await UpdateStageStatsAsync(stageId, cancellationToken);

        _logger.LogInformation("Moved lead {LeadId} to stage {StageId}", leadId, stageId);

        return lead;
    }

    public async Task<Lead?> SetFollowUpAsync(Guid leadId, DateTime followUpDate, string? note, CancellationToken cancellationToken = default)
    {
        var lead = await _crmDb.Leads.FirstOrDefaultAsync(l => l.Id == leadId, cancellationToken);

        if (lead == null)
            return null;

        lead.SetFollowUp(followUpDate, note);
        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Set follow-up for lead {LeadId} at {FollowUpDate}", leadId, followUpDate);

        return lead;
    }

    /// <summary>
    /// W2-8 step 5: chuyển lead thành khách hàng qua <see cref="IUserDirectory.ProvisionCustomerAsync"/>
    /// (do Identity sở hữu — UserManager, hash mật khẩu null hợp lệ, role Customer, mail đặt mật khẩu).
    ///
    /// Trước đây: raw SQL INSERT thẳng vào AspNetUsers, bỏ qua toàn bộ Identity (không SecurityStamp
    /// hợp lệ theo UserManager, không role Customer, không normalize theo cấu hình Identity) VÀ vẫn
    /// gọi lead.Convert() ngay cả khi câu INSERT lỗi (catch nuốt exception, customerId là Guid.NewGuid()
    /// ngẫu nhiên không tồn tại trong AspNetUsers) — lead bị đánh dấu "đã chuyển đổi" trỏ tới một
    /// UserId ma. Giờ: abort (không lưu gì) nếu provisioning thất bại; toàn bộ thao tác trong 1
    /// transaction DB của CRM (CustomerAnalytics + lead.Convert + interaction cùng commit/rollback).
    /// </summary>
    public async Task<Guid?> ConvertLeadAsync(Guid leadId, string? notes, CancellationToken cancellationToken = default)
    {
        var lead = await _crmDb.Leads.FirstOrDefaultAsync(l => l.Id == leadId, cancellationToken);

        if (lead == null || lead.IsConverted)
            return null;

        if (string.IsNullOrWhiteSpace(lead.Email) && string.IsNullOrWhiteSpace(lead.Phone))
        {
            _logger.LogWarning("Cannot convert lead {LeadId}: no email or phone to provision a customer account", leadId);
            return null;
        }

        BuildingBlocks.Contracts.UserDirectoryEntry provisioned;
        try
        {
            provisioned = await _userDirectory.ProvisionCustomerAsync(
                lead.FullName, lead.Phone, lead.Email, cancellationToken);
        }
        catch (Exception ex)
        {
            // Abort: KHÔNG lead.Convert(), KHÔNG lưu gì — trước đây lỗi ở bước này vẫn bị nuốt và
            // lead vẫn bị đánh dấu converted với một UserId không tồn tại.
            _logger.LogError(ex, "Failed to provision customer account for lead {LeadId}; conversion aborted", leadId);
            return null;
        }

        var customerId = Guid.Parse(provisioned.Id);

        await using var transaction = await _crmDb.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var customerAnalytics = await _crmDb.CustomerAnalytics.FirstOrDefaultAsync(c => c.UserId == customerId, cancellationToken);
            if (customerAnalytics == null)
            {
                customerAnalytics = new CustomerAnalytics(customerId);
                _crmDb.CustomerAnalytics.Add(customerAnalytics);
            }

            lead.Convert(customerId);

            if (!string.IsNullOrWhiteSpace(notes))
            {
                var interaction = new CustomerInteraction(
                    InteractionType.Note,
                    "Lead converted to customer",
                    lead.AssignedToUserId ?? Guid.Empty,
                    lead.AssignedToUserName ?? "System",
                    leadId: leadId);
                interaction.SetContent(notes);
                _crmDb.CustomerInteractions.Add(interaction);
            }

            await _crmDb.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            _logger.LogError(ex, "Failed to persist conversion for lead {LeadId} after provisioning customer {CustomerId}; rolled back (Identity account still exists - idempotent retry will reuse it)", leadId, customerId);
            return null;
        }

        _logger.LogInformation("Converted lead {LeadId} to customer {CustomerId}", leadId, customerId);

        return customerId;
    }

    public async Task<Lead?> MarkAsLostAsync(Guid leadId, string reason, CancellationToken cancellationToken = default)
    {
        var lead = await _crmDb.Leads.FirstOrDefaultAsync(l => l.Id == leadId, cancellationToken);

        if (lead == null)
            return null;

        lead.MarkAsLost(reason);

        // Move to lost stage if available
        var lostStage = await _crmDb.LeadPipelineStages
            .FirstOrDefaultAsync(s => s.IsFinalStage && !s.IsWonStage, cancellationToken);

        if (lostStage != null)
        {
            lead.SetPipelineStage(lostStage.Id);
        }

        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Marked lead {LeadId} as lost: {Reason}", leadId, reason);

        return lead;
    }

    public async Task<List<LeadPipelineStage>> GetPipelineStagesAsync(CancellationToken cancellationToken = default)
    {
        return await _crmDb.LeadPipelineStages
            .AsNoTracking()
            .OrderBy(s => s.SortOrder)
            .ToListAsync(cancellationToken);
    }

    public async Task<LeadPipelineStage> CreatePipelineStageAsync(CreatePipelineStageDto dto, CancellationToken cancellationToken = default)
    {
        var stage = new LeadPipelineStage(dto.Name, dto.SortOrder, dto.WinProbability);
        stage.Update(dto.Name, dto.Description, dto.Color, dto.SortOrder, dto.WinProbability);

        _crmDb.LeadPipelineStages.Add(stage);
        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Created pipeline stage {StageName}", dto.Name);

        return stage;
    }

    public async Task<LeadPipelineStage?> UpdatePipelineStageAsync(Guid stageId, UpdatePipelineStageDto dto, CancellationToken cancellationToken = default)
    {
        var stage = await _crmDb.LeadPipelineStages.FirstOrDefaultAsync(s => s.Id == stageId, cancellationToken);

        if (stage == null)
            return null;

        stage.Update(dto.Name, dto.Description, dto.Color, dto.SortOrder, dto.WinProbability);
        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Updated pipeline stage {StageId}", stageId);

        return stage;
    }

    public async Task<bool> DeletePipelineStageAsync(Guid stageId, CancellationToken cancellationToken = default)
    {
        var stage = await _crmDb.LeadPipelineStages.FirstOrDefaultAsync(s => s.Id == stageId, cancellationToken);

        if (stage == null)
            return false;

        // Move leads to previous stage or unassign
        var leads = await _crmDb.Leads.Where(l => l.PipelineStageId == stageId).ToListAsync(cancellationToken);
        var previousStage = await _crmDb.LeadPipelineStages
            .Where(s => s.Id != stageId)
            .OrderBy(s => s.SortOrder)
            .FirstOrDefaultAsync(cancellationToken);

        foreach (var lead in leads)
        {
            if (previousStage != null)
            {
                lead.SetPipelineStage(previousStage.Id);
            }
        }

        stage.IsActive = false;
        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Deleted pipeline stage {StageId}", stageId);

        return true;
    }

    public async Task<Dictionary<Guid, List<Lead>>> GetLeadsByPipelineAsync(CancellationToken cancellationToken = default)
    {
        var stages = await _crmDb.LeadPipelineStages
            .AsNoTracking()
            .OrderBy(s => s.SortOrder)
            .ToListAsync(cancellationToken);

        var result = new Dictionary<Guid, List<Lead>>();

        foreach (var stage in stages)
        {
            var leads = await _crmDb.Leads
                .AsNoTracking()
                .Where(l => l.PipelineStageId == stage.Id && !l.IsConverted)
                .OrderByDescending(l => l.UpdatedAt)
                .Take(50) // Limit for performance
                .ToListAsync(cancellationToken);

            result[stage.Id] = leads;
        }

        return result;
    }

    public async Task<CustomerInteraction> AddInteractionAsync(
        Guid leadId, CreateInteractionDto dto, Guid userId, string userName,
        CancellationToken cancellationToken = default)
    {
        var lead = await _crmDb.Leads.FirstOrDefaultAsync(l => l.Id == leadId, cancellationToken);

        if (lead == null)
            throw new InvalidOperationException("Lead not found");

        var interaction = new CustomerInteraction(
            dto.Type, dto.Subject, userId, userName, leadId: leadId);

        if (!string.IsNullOrWhiteSpace(dto.Content))
        {
            interaction.SetContent(dto.Content);
        }

        if (dto.PerformedAt.HasValue)
        {
            interaction.UpdatePerformedAt(dto.PerformedAt.Value);
        }

        if (dto.DurationMinutes.HasValue)
        {
            if (dto.Type == InteractionType.Call)
            {
                interaction.SetCallDetails(dto.DurationMinutes.Value, dto.CallOutcome);
            }
            else if (dto.Type == InteractionType.Meeting)
            {
                interaction.SetMeetingDetails(dto.DurationMinutes.Value, dto.MeetingLocation);
            }
        }

        if (dto.FollowUpDate.HasValue)
        {
            interaction.SetFollowUp(dto.FollowUpDate.Value, dto.FollowUpNote);
        }

        if (!string.IsNullOrWhiteSpace(dto.Sentiment))
        {
            interaction.SetSentiment(dto.Sentiment);
        }

        _crmDb.CustomerInteractions.Add(interaction);

        // Mark lead as contacted if it was new
        if (lead.Status == LeadStatus.New)
        {
            lead.MarkAsContacted();
        }

        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Added interaction to lead {LeadId}", leadId);

        return interaction;
    }

    public async Task<List<Lead>> GetUpcomingFollowUpsAsync(int days = 7, Guid? assignedToUserId = null, CancellationToken cancellationToken = default)
    {
        var endDate = DateTime.UtcNow.AddDays(days);

        var query = _crmDb.Leads
            .AsNoTracking()
            .Where(l => l.NextFollowUpAt != null && l.NextFollowUpAt <= endDate && !l.IsConverted);

        if (assignedToUserId.HasValue)
        {
            query = query.Where(l => l.AssignedToUserId == assignedToUserId.Value);
        }

        return await query
            .OrderBy(l => l.NextFollowUpAt)
            .ToListAsync(cancellationToken);
    }

    public async Task UpdatePipelineStatsAsync(CancellationToken cancellationToken = default)
    {
        var stages = await _crmDb.LeadPipelineStages.ToListAsync(cancellationToken);

        foreach (var stage in stages)
        {
            await UpdateStageStatsAsync(stage.Id, cancellationToken);
        }
    }

    private async Task UpdateStageStatsAsync(Guid stageId, CancellationToken cancellationToken)
    {
        var stage = await _crmDb.LeadPipelineStages.FirstOrDefaultAsync(s => s.Id == stageId, cancellationToken);

        if (stage == null)
            return;

        var stats = await _crmDb.Leads
            .Where(l => l.PipelineStageId == stageId && !l.IsConverted)
            .GroupBy(l => 1)
            .Select(g => new
            {
                Count = g.Count(),
                TotalValue = g.Sum(l => l.EstimatedValue ?? 0)
            })
            .FirstOrDefaultAsync(cancellationToken);

        stage.UpdateStats(stats?.Count ?? 0, stats?.TotalValue ?? 0);
        await _crmDb.SaveChangesAsync(cancellationToken);
    }
}
