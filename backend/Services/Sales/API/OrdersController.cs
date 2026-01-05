using MediatR;
using Microsoft.AspNetCore.Mvc;
using Sales.Application.Orders.Commands.CreateOrder;

namespace Sales.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly ISender _sender;

    public OrdersController(ISender sender)
    {
        _sender = sender;
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderCommand command)
    {
        var result = await _sender.Send(command);
        return CreatedAtAction(nameof(CreateOrder), new { id = result }, result);
    }
}
