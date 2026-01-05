using MediatR;
using Microsoft.AspNetCore.Mvc;
using Accounting.Application.Accounts.Commands.RecordTransaction;
using Accounting.Domain;

namespace Accounting.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AccountingController : ControllerBase
{
    private readonly ISender _sender;

    public AccountingController(ISender sender)
    {
        _sender = sender;
    }

    [HttpPost("transactions")]
    public async Task<IActionResult> RecordTransaction([FromBody] RecordTransactionCommand command)
    {
        await _sender.Send(command);
        return NoContent();
    }
}
