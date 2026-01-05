using MediatR;
using Repair.Domain;
using Repair.Infrastructure;

namespace Repair.Application.WorkOrders.Commands.BookRepair;

public class BookRepairCommandHandler : IRequestHandler<BookRepairCommand, Guid>
{
    private readonly RepairDbContext _context;

    public BookRepairCommandHandler(RepairDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(BookRepairCommand request, CancellationToken cancellationToken)
    {
        var workOrder = new WorkOrder(request.CustomerId, request.DeviceModel, request.SerialNumber, request.Description);
        
        _context.WorkOrders.Add(workOrder);
        await _context.SaveChangesAsync(cancellationToken);
        
        return workOrder.Id;
    }
}
