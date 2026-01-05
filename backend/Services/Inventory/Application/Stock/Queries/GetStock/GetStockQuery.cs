using MediatR;
using InventoryModule.Domain;

namespace InventoryModule.Application.Stock.Queries.GetStock;

public record GetStockQuery() : IRequest<List<InventoryItem>>;
