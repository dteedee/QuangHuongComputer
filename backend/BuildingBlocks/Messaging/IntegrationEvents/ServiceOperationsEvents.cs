namespace BuildingBlocks.Messaging.IntegrationEvents;

// phase-14 (W1-5) step 3 - contracts only, not yet published (Repair/Warranty wave-2 wire them).

public record RepairCompletedEvent(Guid BookingId, Guid CustomerId, string DeviceDescription, decimal FinalCost, DateTime OccurredOn);

public record WarrantyClaimUpdatedEvent(Guid ClaimId, Guid CustomerId, string SerialNumber, string NewStatus, DateTime OccurredOn);
