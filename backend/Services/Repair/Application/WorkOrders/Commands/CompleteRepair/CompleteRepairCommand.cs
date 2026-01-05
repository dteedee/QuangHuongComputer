using MediatR;

namespace Repair.Application.WorkOrders.Commands.CompleteRepair;

public record CompleteRepairCommand(Guid WorkOrderId, decimal PartsCost, decimal LaborCost, string? TechnicalNotes) : IRequest<Unit>;
