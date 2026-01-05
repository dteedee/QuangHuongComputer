using MediatR;
using Microsoft.EntityFrameworkCore;
using Repair.Infrastructure;

namespace Repair.Application.WorkOrders.Commands.AssignTechnician;

public class AssignTechnicianCommandHandler : IRequestHandler<AssignTechnicianCommand, Unit>
{
    private readonly RepairDbContext _context;

    public AssignTechnicianCommandHandler(RepairDbContext context)
    {
        _context = context;
    }

    public async Task<Unit> Handle(AssignTechnicianCommand request, CancellationToken cancellationToken)
    {
        var workOrder = await _context.WorkOrders.FindAsync(new object[] { request.WorkOrderId }, cancellationToken);
        if (workOrder == null) throw new Exception("Work order not found");

        var technician = await _context.Technicians.FindAsync(new object[] { request.TechnicianId }, cancellationToken);
        if (technician == null) throw new Exception("Technician not found");

        workOrder.AssignTechnician(request.TechnicianId);
        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
