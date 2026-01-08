using BuildingBlocks.SharedKernel;

namespace Sales.Domain;

// Domain Events for Order lifecycle
public record OrderConfirmedDomainEvent(Guid OrderId, List<OrderItemDto> Items) : DomainEvent;
public record OrderCompletedDomainEvent(Guid OrderId) : DomainEvent;
public record OrderCancelledDomainEvent(Guid OrderId, string Reason) : DomainEvent;

// DTO for domain events
public record OrderItemDto(Guid ProductId, int Quantity);
