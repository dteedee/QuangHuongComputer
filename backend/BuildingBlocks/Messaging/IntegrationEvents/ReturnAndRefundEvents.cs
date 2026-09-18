namespace BuildingBlocks.Messaging.IntegrationEvents;

// phase-14 (W1-5) step 3 - contracts only, not yet published (Sales/Payments wave-2 wire them).

public record ReturnCompletedEvent(Guid ReturnId, Guid OrderId, Guid CustomerId, decimal RefundAmount, DateTime OccurredOn);

public record RefundRequestedEvent(Guid RefundId, Guid OrderId, Guid CustomerId, decimal Amount, string Reason, DateTime OccurredOn);
