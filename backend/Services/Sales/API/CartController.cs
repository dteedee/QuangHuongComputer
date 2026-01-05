using MediatR;
using Microsoft.AspNetCore.Mvc;
using Sales.Application.Carts.Commands.AddToCart;

namespace Sales.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CartController : ControllerBase
{
    private readonly ISender _sender;

    public CartController(ISender sender)
    {
        _sender = sender;
    }

    [HttpPost("items")]
    public async Task<IActionResult> AddToCart([FromBody] AddToCartCommand command)
    {
        var result = await _sender.Send(command);
        return Ok(new { cartId = result });
    }
}
