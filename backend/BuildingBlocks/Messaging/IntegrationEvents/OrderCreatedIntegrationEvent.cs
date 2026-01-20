namespace BuildingBlocks.Messaging.IntegrationEvents;

public record OrderCreatedIntegrationEvent(Guid OrderId, Guid CustomerId, string Email, decimal TotalAmount, string OrderNumber);
