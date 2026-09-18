namespace BuildingBlocks.Messaging.IntegrationEvents;

// phase-14 (W1-5) step 3 - contracts only, not yet published (Inventory wave-2 wires them on
// stock-level mutation).

public record StockChangedEvent(Guid ProductId, Guid WarehouseId, int QuantityOnHand, int Delta, DateTime OccurredOn);

public record LowStockEvent(Guid ProductId, string ProductName, Guid WarehouseId, int QuantityOnHand, int Threshold, DateTime OccurredOn);
