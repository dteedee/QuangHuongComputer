using MediatR;
using Repair.Domain;

namespace Repair.Application.WorkOrders.Queries.GetWorkOrders;

public record GetWorkOrdersQuery() : IRequest<List<WorkOrder>>;
