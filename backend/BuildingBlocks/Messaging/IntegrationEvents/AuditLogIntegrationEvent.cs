namespace BuildingBlocks.Messaging.IntegrationEvents;

public record AuditLogIntegrationEvent(
    string UserId,
    string Action,
    string EntityName,
    string EntityId,
    string Details,
    string? IpAddress = null,
    string? UserAgent = null,
    string? RequestPath = null,
    string? RequestMethod = null
);
