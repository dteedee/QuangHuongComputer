using MediatR;

namespace InventoryModule.Application.PurchaseOrders.Commands.CreatePO;

public record CreatePOCommand(Guid SupplierId, List<POItemDto> Items) : IRequest<Guid>;

public record POItemDto(Guid ProductId, int Quantity, decimal UnitPrice);
