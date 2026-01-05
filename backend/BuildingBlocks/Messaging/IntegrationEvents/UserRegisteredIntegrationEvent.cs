namespace BuildingBlocks.Messaging.IntegrationEvents;

public record UserRegisteredIntegrationEvent(Guid UserId, string Email, string FullName);
