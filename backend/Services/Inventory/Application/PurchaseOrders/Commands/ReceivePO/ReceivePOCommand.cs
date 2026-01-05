using MediatR;

namespace InventoryModule.Application.PurchaseOrders.Commands.ReceivePO;

public record ReceivePOCommand(Guid POId) : IRequest<Unit>;
