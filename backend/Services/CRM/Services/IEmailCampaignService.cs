using CRM.Domain;
using CRM.DTOs;

namespace CRM.Services;

public interface IEmailCampaignService
{
    /// <summary>
    /// Get campaigns with pagination
    /// </summary>
    Task<PagedResult<EmailCampaign>> GetCampaignsAsync(CampaignQueryParams queryParams, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get campaign by ID
    /// </summary>
    Task<EmailCampaign?> GetCampaignByIdAsync(Guid campaignId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Create new campaign
    /// </summary>
    Task<EmailCampaign> CreateCampaignAsync(CreateCampaignDto dto, CancellationToken cancellationToken = default);

    /// <summary>
    /// Update campaign
    /// </summary>
    Task<EmailCampaign?> UpdateCampaignAsync(Guid campaignId, UpdateCampaignDto dto, CancellationToken cancellationToken = default);

    /// <summary>
    /// Delete campaign (soft delete)
    /// </summary>
    Task<bool> DeleteCampaignAsync(Guid campaignId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Schedule campaign
    /// </summary>
    Task<EmailCampaign?> ScheduleCampaignAsync(Guid campaignId, DateTime sendAt, CancellationToken cancellationToken = default);

    /// <summary>
    /// Unschedule campaign
    /// </summary>
    Task<EmailCampaign?> UnscheduleCampaignAsync(Guid campaignId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Send campaign immediately
    /// </summary>
    Task<EmailCampaign?> SendCampaignAsync(Guid campaignId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Pause sending campaign
    /// </summary>
    Task<EmailCampaign?> PauseCampaignAsync(Guid campaignId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Resume paused campaign
    /// </summary>
    Task<EmailCampaign?> ResumeCampaignAsync(Guid campaignId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Track email open
    /// </summary>
    Task<bool> TrackOpenAsync(string trackingId, string? userAgent = null, string? ipAddress = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Track email click
    /// </summary>
    Task<bool> TrackClickAsync(string trackingId, string link, string? userAgent = null, string? ipAddress = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Process unsubscribe
    /// </summary>
    Task<bool> ProcessUnsubscribeAsync(string trackingId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get campaign recipients
    /// </summary>
    Task<List<EmailCampaignRecipient>> GetCampaignRecipientsAsync(Guid campaignId, int page = 1, int pageSize = 50, CancellationToken cancellationToken = default);

    /// <summary>
    /// Preview personalized email for a recipient
    /// </summary>
    Task<string> PreviewEmailAsync(Guid campaignId, Guid? customerAnalyticsId = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Process scheduled campaigns
    /// </summary>
    Task ProcessScheduledCampaignsAsync(CancellationToken cancellationToken = default);
}
