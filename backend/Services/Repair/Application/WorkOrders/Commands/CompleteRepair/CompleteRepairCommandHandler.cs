using MediatR;
using Microsoft.EntityFrameworkCore;
using Repair.Infrastructure;

namespace Repair.Application.WorkOrders.Commands.CompleteRepair;

public class CompleteRepairCommandHandler : IRequestHandler<CompleteRepairCommand, Unit>
{
    private readonly RepairDbContext _context;

    public CompleteRepairCommandHandler(RepairDbContext context)
    {
        _context = context;
    }

    public async Task<Unit> Handle(CompleteRepairCommand request, CancellationToken cancellationToken)
    {
        var workOrder = await _context.WorkOrders.FindAsync(new object[] { request.WorkOrderId }, cancellationToken);
        if (workOrder == null) throw new Exception("Work order not found");

        workOrder.CompleteRepair(request.PartsCost, request.LaborCost, request.TechnicalNotes);
        
        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
