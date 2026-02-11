using MediatR;
using Microsoft.AspNetCore.Mvc;
using Sales.Application.Orders.Commands.CreateOrder;

namespace Sales.API.Controllers;

/// <summary>
/// Controller quản lý đơn hàng
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly ISender _sender;

    /// <summary>
    /// Khởi tạo controller
    /// </summary>
    /// <param name="sender">Dịch vụ gửi lệnh MediatR</param>
    public OrdersController(ISender sender)
    {
        _sender = sender;
    }

    /// <summary>
    /// Tạo mới đơn hàng
    /// </summary>
    /// <param name="command">Thông tin tạo đơn hàng</param>
    /// <returns>Thông tin đơn hàng đã tạo</returns>
    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderCommand command)
    {
        var result = await _sender.Send(command);
        return CreatedAtAction(nameof(CreateOrder), new { id = result }, result);
    }
}
