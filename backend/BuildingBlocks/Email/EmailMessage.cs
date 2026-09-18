namespace BuildingBlocks.Email;

/// <summary>
/// The one message shape every sender in this codebase uses. Kept intentionally small and
/// unchanged in field names - CommunicationEndpoints.cs, EmailCampaignService.cs (CRM) and four
/// Consumers construct this type directly and are outside this track's ownership.
/// </summary>
public class EmailMessage
{
    public string ToEmail { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool IsHtml { get; set; } = true;
}
