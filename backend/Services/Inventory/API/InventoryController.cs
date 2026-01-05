using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using InventoryModule.Application.PurchaseOrders.Commands.CreatePO;
using InventoryModule.Application.PurchaseOrders.Commands.ReceivePO;
using InventoryModule.Application.Stock.Queries.GetStock;

namespace InventoryModule.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class InventoryController : ControllerBase
{
    private readonly ISender _sender;

    public InventoryController(ISender sender)
    {
        _sender = sender;
    }

    [HttpPost("po")]
    public async Task<IActionResult> CreatePO([FromBody] CreatePOCommand command)
    {
        var result = await _sender.Send(command);
        return Ok(new { poId = result });
    }

    [HttpPost("po/receive")]
    public async Task<IActionResult> ReceivePO([FromBody] ReceivePOCommand command)
    {
        await _sender.Send(command);
        return NoContent();
    }

    [HttpGet("stock")]
    public async Task<IActionResult> GetStock()
    {
        var result = await _sender.Send(new GetStockQuery());
        return Ok(result);
    }
}
