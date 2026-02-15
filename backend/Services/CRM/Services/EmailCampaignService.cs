using System.Text.Json;
using System.Text.RegularExpressions;
using CRM.Domain;
using CRM.DTOs;
using CRM.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CRM.Services;

public partial class EmailCampaignService : IEmailCampaignService
{
    private readonly CrmDbContext _crmDb;
    private readonly ILogger<EmailCampaignService> _logger;

    public EmailCampaignService(
        CrmDbContext crmDb,
        ILogger<EmailCampaignService> logger)
    {
        _crmDb = crmDb;
        _logger = logger;
    }

    public async Task<PagedResult<EmailCampaign>> GetCampaignsAsync(CampaignQueryParams queryParams, CancellationToken cancellationToken = default)
    {
        var query = _crmDb.EmailCampaigns
            .Include(c => c.TargetSegment)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(queryParams.Search))
        {
            var search = queryParams.Search.ToLower();
            query = query.Where(c =>
                c.Name.ToLower().Contains(search) ||
                c.Subject.ToLower().Contains(search));
        }

        if (queryParams.Status.HasValue)
        {
            query = query.Where(c => c.Status == queryParams.Status.Value);
        }

        var total = await query.CountAsync(cancellationToken);

        query = queryParams.SortBy?.ToLower() switch
        {
            "name" => queryParams.SortDesc ? query.OrderByDescending(c => c.Name) : query.OrderBy(c => c.Name),
            "status" => queryParams.SortDesc ? query.OrderByDescending(c => c.Status) : query.OrderBy(c => c.Status),
            "scheduledat" => queryParams.SortDesc ? query.OrderByDescending(c => c.ScheduledAt) : query.OrderBy(c => c.ScheduledAt),
            "sentat" => queryParams.SortDesc ? query.OrderByDescending(c => c.SentAt) : query.OrderBy(c => c.SentAt),
            _ => queryParams.SortDesc ? query.OrderByDescending(c => c.CreatedAt) : query.OrderBy(c => c.CreatedAt)
        };

        var items = await query
            .Skip(queryParams.Skip)
            .Take(queryParams.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<EmailCampaign>(items, total, queryParams.Page, queryParams.PageSize);
    }

    public async Task<EmailCampaign?> GetCampaignByIdAsync(Guid campaignId, CancellationToken cancellationToken = default)
    {
        return await _crmDb.EmailCampaigns
            .Include(c => c.TargetSegment)
            .FirstOrDefaultAsync(c => c.Id == campaignId, cancellationToken);
    }

    public async Task<EmailCampaign> CreateCampaignAsync(CreateCampaignDto dto, CancellationToken cancellationToken = default)
    {
        var campaign = new EmailCampaign(dto.Name, dto.Subject, dto.HtmlContent);

        if (!string.IsNullOrWhiteSpace(dto.PreviewText))
        {
            campaign.Update(dto.Name, dto.Subject, dto.HtmlContent, dto.PreviewText);
        }

        if (!string.IsNullOrWhiteSpace(dto.PlainTextContent))
        {
            campaign.SetPlainTextContent(dto.PlainTextContent);
        }

        if (dto.TargetSegmentId.HasValue)
        {
            campaign.SetTargetSegment(dto.TargetSegmentId.Value);
        }
        else if (!string.IsNullOrWhiteSpace(dto.TargetLifecycleStages))
        {
            campaign.SetTargetLifecycleStages(dto.TargetLifecycleStages);
        }

        if (dto.MinRfmScore.HasValue)
        {
            campaign.SetMinRfmScore(dto.MinRfmScore.Value);
        }

        if (!string.IsNullOrWhiteSpace(dto.FromEmail))
        {
            campaign.SetSenderInfo(dto.FromEmail, dto.FromName ?? "Quang Huong Computer", dto.ReplyToEmail);
        }

        _crmDb.EmailCampaigns.Add(campaign);
        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Created campaign {CampaignId} - {CampaignName}", campaign.Id, campaign.Name);

        return campaign;
    }

    public async Task<EmailCampaign?> UpdateCampaignAsync(Guid campaignId, UpdateCampaignDto dto, CancellationToken cancellationToken = default)
    {
        var campaign = await _crmDb.EmailCampaigns.FirstOrDefaultAsync(c => c.Id == campaignId, cancellationToken);

        if (campaign == null)
            return null;

        campaign.Update(dto.Name, dto.Subject, dto.HtmlContent, dto.PreviewText);

        if (!string.IsNullOrWhiteSpace(dto.PlainTextContent))
        {
            campaign.SetPlainTextContent(dto.PlainTextContent);
        }

        if (dto.TargetSegmentId.HasValue)
        {
            campaign.SetTargetSegment(dto.TargetSegmentId.Value);
        }
        else if (!string.IsNullOrWhiteSpace(dto.TargetLifecycleStages))
        {
            campaign.SetTargetLifecycleStages(dto.TargetLifecycleStages);
        }

        if (dto.MinRfmScore.HasValue)
        {
            campaign.SetMinRfmScore(dto.MinRfmScore.Value);
        }

        if (!string.IsNullOrWhiteSpace(dto.FromEmail))
        {
            campaign.SetSenderInfo(dto.FromEmail, dto.FromName ?? "Quang Huong Computer", dto.ReplyToEmail);
        }

        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Updated campaign {CampaignId}", campaignId);

        return campaign;
    }

    public async Task<bool> DeleteCampaignAsync(Guid campaignId, CancellationToken cancellationToken = default)
    {
        var campaign = await _crmDb.EmailCampaigns.FirstOrDefaultAsync(c => c.Id == campaignId, cancellationToken);

        if (campaign == null)
            return false;

        campaign.IsActive = false;
        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Deleted campaign {CampaignId}", campaignId);

        return true;
    }

    public async Task<EmailCampaign?> ScheduleCampaignAsync(Guid campaignId, DateTime sendAt, CancellationToken cancellationToken = default)
    {
        var campaign = await _crmDb.EmailCampaigns.FirstOrDefaultAsync(c => c.Id == campaignId, cancellationToken);

        if (campaign == null)
            return null;

        campaign.Schedule(sendAt);
        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Scheduled campaign {CampaignId} for {SendAt}", campaignId, sendAt);

        return campaign;
    }

    public async Task<EmailCampaign?> UnscheduleCampaignAsync(Guid campaignId, CancellationToken cancellationToken = default)
    {
        var campaign = await _crmDb.EmailCampaigns.FirstOrDefaultAsync(c => c.Id == campaignId, cancellationToken);

        if (campaign == null)
            return null;

        campaign.Unschedule();
        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Unscheduled campaign {CampaignId}", campaignId);

        return campaign;
    }

    public async Task<EmailCampaign?> SendCampaignAsync(Guid campaignId, CancellationToken cancellationToken = default)
    {
        var campaign = await _crmDb.EmailCampaigns
            .Include(c => c.TargetSegment)
            .FirstOrDefaultAsync(c => c.Id == campaignId, cancellationToken);

        if (campaign == null)
            return null;

        // Build recipient list
        var recipients = await BuildRecipientListAsync(campaign, cancellationToken);

        if (!recipients.Any())
        {
            _logger.LogWarning("Campaign {CampaignId} has no recipients", campaignId);
            return campaign;
        }

        // Add recipients
        foreach (var recipient in recipients)
        {
            _crmDb.EmailCampaignRecipients.Add(recipient);
        }

        // Start sending
        campaign.StartSending(recipients.Count);
        await _crmDb.SaveChangesAsync(cancellationToken);

        // TODO: Queue actual email sending via background job
        // For now, mark as sent immediately (demo)
        await ProcessSendingAsync(campaign, cancellationToken);

        _logger.LogInformation("Started sending campaign {CampaignId} to {RecipientCount} recipients",
            campaignId, recipients.Count);

        return campaign;
    }

    private async Task<List<EmailCampaignRecipient>> BuildRecipientListAsync(EmailCampaign campaign, CancellationToken cancellationToken)
    {
        var query = _crmDb.CustomerAnalytics.AsQueryable();

        // Filter by segment
        if (campaign.TargetSegmentId.HasValue)
        {
            var segmentCustomerIds = _crmDb.CustomerSegmentAssignments
                .Where(a => a.SegmentId == campaign.TargetSegmentId.Value)
                .Select(a => a.CustomerAnalyticsId);

            query = query.Where(c => segmentCustomerIds.Contains(c.Id));
        }

        // Filter by lifecycle stages
        if (!string.IsNullOrWhiteSpace(campaign.TargetLifecycleStages))
        {
            var stages = JsonSerializer.Deserialize<List<LifecycleStage>>(campaign.TargetLifecycleStages);
            if (stages?.Any() == true)
            {
                query = query.Where(c => stages.Contains(c.LifecycleStage));
            }
        }

        // Filter by minimum RFM score
        if (campaign.MinRfmScore.HasValue)
        {
            var minScore = campaign.MinRfmScore.Value;
            query = query.Where(c =>
                c.RecencyScore + c.FrequencyScore + c.MonetaryScore >= minScore);
        }

        // TODO: Get user details from Identity service
        var customers = await query.ToListAsync(cancellationToken);

        return customers.Select(c => new EmailCampaignRecipient(
            campaign.Id,
            $"user_{c.UserId}@email.com", // Placeholder - would get from Identity
            c.Id,
            $"Customer {c.UserId}" // Placeholder
        )).ToList();
    }

    private async Task ProcessSendingAsync(EmailCampaign campaign, CancellationToken cancellationToken)
    {
        // Get pending recipients
        var recipients = await _crmDb.EmailCampaignRecipients
            .Where(r => r.CampaignId == campaign.Id && r.Status == RecipientStatus.Pending)
            .ToListAsync(cancellationToken);

        foreach (var recipient in recipients)
        {
            // TODO: Actually send email via email service
            // For demo, mark as sent
            recipient.MarkAsSent();
            recipient.MarkAsDelivered();
            campaign.IncrementSentCount();
            campaign.IncrementDeliveredCount();
        }

        campaign.MarkAsSent();
        await _crmDb.SaveChangesAsync(cancellationToken);
    }

    public async Task<EmailCampaign?> PauseCampaignAsync(Guid campaignId, CancellationToken cancellationToken = default)
    {
        var campaign = await _crmDb.EmailCampaigns.FirstOrDefaultAsync(c => c.Id == campaignId, cancellationToken);

        if (campaign == null)
            return null;

        campaign.Pause();
        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Paused campaign {CampaignId}", campaignId);

        return campaign;
    }

    public async Task<EmailCampaign?> ResumeCampaignAsync(Guid campaignId, CancellationToken cancellationToken = default)
    {
        var campaign = await _crmDb.EmailCampaigns.FirstOrDefaultAsync(c => c.Id == campaignId, cancellationToken);

        if (campaign == null)
            return null;

        campaign.Resume();
        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Resumed campaign {CampaignId}", campaignId);

        return campaign;
    }

    public async Task<bool> TrackOpenAsync(string trackingId, string? userAgent = null, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var recipient = await _crmDb.EmailCampaignRecipients
            .Include(r => r.Campaign)
            .Include(r => r.CustomerAnalytics)
            .FirstOrDefaultAsync(r => r.TrackingId == trackingId, cancellationToken);

        if (recipient == null)
            return false;

        var isFirstOpen = recipient.OpenCount == 0;
        recipient.RecordOpen(userAgent, ipAddress);

        if (isFirstOpen)
        {
            recipient.Campaign.IncrementOpenedCount();
        }

        // Update customer analytics
        recipient.CustomerAnalytics?.RecordEmailOpen();

        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogDebug("Tracked open for {TrackingId}", trackingId);

        return true;
    }

    public async Task<bool> TrackClickAsync(string trackingId, string link, string? userAgent = null, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var recipient = await _crmDb.EmailCampaignRecipients
            .Include(r => r.Campaign)
            .Include(r => r.CustomerAnalytics)
            .FirstOrDefaultAsync(r => r.TrackingId == trackingId, cancellationToken);

        if (recipient == null)
            return false;

        var isFirstClick = recipient.ClickCount == 0;
        recipient.RecordClick(link, userAgent, ipAddress);

        if (isFirstClick)
        {
            recipient.Campaign.IncrementClickedCount();
        }

        // Update customer analytics
        recipient.CustomerAnalytics?.RecordEmailClick();

        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogDebug("Tracked click for {TrackingId} on {Link}", trackingId, link);

        return true;
    }

    public async Task<bool> ProcessUnsubscribeAsync(string trackingId, CancellationToken cancellationToken = default)
    {
        var recipient = await _crmDb.EmailCampaignRecipients
            .Include(r => r.Campaign)
            .FirstOrDefaultAsync(r => r.TrackingId == trackingId, cancellationToken);

        if (recipient == null)
            return false;

        recipient.MarkAsUnsubscribed();
        recipient.Campaign.IncrementUnsubscribedCount();

        // TODO: Mark customer as unsubscribed globally

        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Processed unsubscribe for {TrackingId}", trackingId);

        return true;
    }

    public async Task<List<EmailCampaignRecipient>> GetCampaignRecipientsAsync(Guid campaignId, int page = 1, int pageSize = 50, CancellationToken cancellationToken = default)
    {
        return await _crmDb.EmailCampaignRecipients
            .AsNoTracking()
            .Where(r => r.CampaignId == campaignId)
            .OrderByDescending(r => r.SentAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
    }

    public async Task<string> PreviewEmailAsync(Guid campaignId, Guid? customerAnalyticsId = null, CancellationToken cancellationToken = default)
    {
        var campaign = await _crmDb.EmailCampaigns.FirstOrDefaultAsync(c => c.Id == campaignId, cancellationToken);

        if (campaign == null)
            return string.Empty;

        var html = campaign.HtmlContent;

        // Replace personalization variables
        // TODO: Get actual customer data from Identity service
        var customerName = "Khách hàng thân mến";
        var lastPurchaseDate = DateTime.UtcNow.AddDays(-30).ToString("dd/MM/yyyy");

        html = PersonalizationRegex().Replace(html, customerName);
        html = LastPurchaseDateRegex().Replace(html, lastPurchaseDate);

        return html;
    }

    public async Task ProcessScheduledCampaignsAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        var scheduledCampaigns = await _crmDb.EmailCampaigns
            .Where(c => c.Status == CampaignStatus.Scheduled && c.ScheduledAt <= now)
            .ToListAsync(cancellationToken);

        foreach (var campaign in scheduledCampaigns)
        {
            try
            {
                await SendCampaignAsync(campaign.Id, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send scheduled campaign {CampaignId}", campaign.Id);
            }
        }
    }

    [GeneratedRegex(@"\{\{CustomerName\}\}", RegexOptions.IgnoreCase)]
    private static partial Regex PersonalizationRegex();

    [GeneratedRegex(@"\{\{LastPurchaseDate\}\}", RegexOptions.IgnoreCase)]
    private static partial Regex LastPurchaseDateRegex();
}
