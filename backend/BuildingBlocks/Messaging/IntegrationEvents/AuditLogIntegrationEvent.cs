namespace BuildingBlocks.Messaging.IntegrationEvents;

public record AuditLogIntegrationEvent(
    string UserId,
    string Action,
    string EntityName,
    string EntityId,
    string Details,
    string? Module = null,
    string? UserName = null,
    string? OldValues = null,
    string? NewValues = null,
    string? IpAddress = null,
    string? UserAgent = null,
    string? RequestPath = null,
    string? RequestMethod = null
);
