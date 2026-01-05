using MediatR;
using Microsoft.EntityFrameworkCore;
using Repair.Domain;
using Repair.Infrastructure;

namespace Repair.Application.WorkOrders.Queries.GetWorkOrders;

public class GetWorkOrdersQueryHandler : IRequestHandler<GetWorkOrdersQuery, List<WorkOrder>>
{
    private readonly RepairDbContext _context;

    public GetWorkOrdersQueryHandler(RepairDbContext context)
    {
        _context = context;
    }

    public async Task<List<WorkOrder>> Handle(GetWorkOrdersQuery request, CancellationToken cancellationToken)
    {
        return await _context.WorkOrders.ToListAsync(cancellationToken);
    }
}
