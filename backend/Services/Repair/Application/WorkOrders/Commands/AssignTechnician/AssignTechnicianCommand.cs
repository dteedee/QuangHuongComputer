using MediatR;

namespace Repair.Application.WorkOrders.Commands.AssignTechnician;

public record AssignTechnicianCommand(Guid WorkOrderId, Guid TechnicianId) : IRequest<Unit>;
