using MediatR;
using Microsoft.AspNetCore.Mvc;
using Repair.Application.WorkOrders.Commands.BookRepair;
using Repair.Application.WorkOrders.Commands.AssignTechnician;
using Repair.Application.WorkOrders.Commands.CompleteRepair;
using Repair.Application.WorkOrders.Queries.GetWorkOrders;

namespace Repair.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RepairController : ControllerBase
{
    private readonly ISender _sender;

    public RepairController(ISender sender)
    {
        _sender = sender;
    }

    [HttpPost("book")]
    public async Task<IActionResult> BookRepair([FromBody] BookRepairCommand command)
    {
        var result = await _sender.Send(command);
        return Ok(new { workOrderId = result });
    }

    [HttpPost("assign")]
    public async Task<IActionResult> AssignTechnician([FromBody] AssignTechnicianCommand command)
    {
        await _sender.Send(command);
        return NoContent();
    }

    [HttpPost("complete")]
    public async Task<IActionResult> CompleteRepair([FromBody] CompleteRepairCommand command)
    {
        await _sender.Send(command);
        return NoContent();
    }

    [HttpGet("work-orders")]
    public async Task<IActionResult> GetWorkOrders()
    {
        var result = await _sender.Send(new GetWorkOrdersQuery());
        return Ok(result);
    }
}
