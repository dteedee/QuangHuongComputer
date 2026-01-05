using MediatR;

namespace Repair.Application.WorkOrders.Commands.BookRepair;

public record BookRepairCommand(Guid CustomerId, string DeviceModel, string SerialNumber, string Description) : IRequest<Guid>;
