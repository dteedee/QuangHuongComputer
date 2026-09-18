using System.Security.Claims;
using System.Text.Json;
using BuildingBlocks.Security;
using BuildingBlocks.SharedKernel;
using BuildingBlocks.Validation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Sales.Domain;
using Sales.Infrastructure;
using Catalog.Infrastructure;
using InventoryModule.Infrastructure;
using Content.Infrastructure;
using Content.Domain;
using Sales.Application.Pricing;
using Sales.Application.Inventory;
using Sales.Application.Orders;
using BuildingBlocks.Endpoints;
using Microsoft.Extensions.Logging;
using MassTransit;
using BuildingBlocks.Messaging.IntegrationEvents;

namespace Sales.Endpoints.Orders;

/// <summary>
/// Đơn hàng của khách — trích NGUYÊN VĂN bởi W2-3. Từ commit này thuộc **W2-23** (vòng đời đơn).
/// </summary>
internal static class CustomerOrderEndpoints
{
    public static void MapCustomerOrderEndpoints(RouteGroupBuilder group, RouteGroupBuilder adminGroup)
    {
        group.MapGet("/orders", async (SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var orders = await db.Orders
                .Include(o => o.Items)
                .Where(o => o.CustomerId == userId)
                .OrderByDescending(o => o.OrderDate)
                .Select(o => new
                {
                    o.Id,
                    o.OrderNumber,
                    o.Status,
                    o.TotalAmount,
                    o.OrderDate,
                    o.ShippingAddress,
                    // W0-4: trả snapshot người nhận để FE/admin hiển thị đúng tên + SĐT.
                    o.CustomerName,
                    o.CustomerPhone,
                    ItemCount = o.Items.Count,
                    Items = o.Items.Select(i => new
                    {
                        i.ProductId,
                        i.ProductName,
                        i.UnitPrice,
                        i.Quantity
                    })
                })
                .ToListAsync();

            return Results.Ok(orders);
        });

        group.MapGet("/orders/{id:guid}", async (Guid id, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var order = await db.Orders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == id && o.CustomerId == userId);

            if (order == null)
                return Results.NotFound(new { Error = "Order not found" });

            return Results.Ok(new
            {
                order.Id,
                order.OrderNumber,
                order.Status,
                order.SubtotalAmount,
                order.DiscountAmount,
                order.ShippingAmount,
                // D01: TaxAmount là phần VAT ĐÃ NẰM TRONG TotalAmount (tách ra để xuất hoá đơn),
                // KHÔNG phải khoản cộng thêm.
                order.TaxAmount,
                order.TaxRate,
                order.TotalAmount,
                order.OrderDate,
                order.ShippingAddress,
                // W0-4: snapshot người nhận.
                order.CustomerName,
                order.CustomerPhone,
                order.Notes,
                order.ConfirmedAt,
                order.FulfilledAt,
                order.CompletedAt,
                Items = order.Items.Select(i => new
                {
                    i.ProductId,
                    i.ProductName,
                    i.UnitPrice,
                    i.Quantity,
                    Subtotal = i.UnitPrice * i.Quantity
                })
            });
        });

        // Cancel Order (Customer) — W2-23: đi qua ĐÚNG MỘT bên ghi (OrderLifecycleService), nên
        // huỷ đơn vừa nhả giữ chỗ, vừa nhập lại tồn đã trừ, vừa mở việc hoàn tiền nếu đã thu tiền.
        // (IR w2 #4 + #8: khối "release reservations" cũ khớp 0 dòng vì giữ chỗ khoá theo phiên
        // checkout/giỏ chứ không theo id đơn, còn phần nhập kho thì cộng tay ngoài mọi sổ sách.)
        group.MapPost("/orders/{id:guid}/cancel", async (
            Guid id,
            CancelOrderDto dto,
            SalesDbContext db,
            CatalogDbContext catalogDb,
            InventoryDbContext inventoryDb,
            InventoryReservationService reservations,
            IPublishEndpoint publish,
            ILogger<OrderLifecycleService> logger,
            ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            // Kiểm tra quyền sở hữu TRƯỚC khi lộ bất cứ thông tin gì về đơn.
            var owns = await db.Orders.AnyAsync(o => o.Id == id && o.CustomerId == userId);
            if (!owns) return Results.NotFound(new { Error = "Order not found" });

            var lifecycle = OrderLifecycleEndpoints.Build(
                db, inventoryDb, catalogDb, reservations, publish, logger);

            // Khách chỉ được tự huỷ khi đơn chưa rời kho. Các mốc sau đó là luồng ĐỔI/TRẢ.
            var current = await lifecycle.LoadAsync(id);
            if (current.Status is not (OrderStatus.Draft or OrderStatus.Pending or OrderStatus.Confirmed))
                throw new ConflictException(
                    $"Đơn đang ở trạng thái {OrderStateMachine.Vi(current.Status)} nên không tự huỷ được. "
                    + "Vui lòng tạo yêu cầu đổi/trả.");

            var order = await lifecycle.CancelAsync(id, dto.Reason, userIdStr);

            return Results.Ok(new
            {
                Message = "Đơn hàng đã được huỷ và hàng đã được nhập lại kho",
                Status = order.Status.ToString(),
            });
        });

        // Get Order History
        group.MapGet("/orders/{id:guid}/history", async (Guid id, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == id && o.CustomerId == userId);
            if (order == null)
                return Results.NotFound(new { Error = "Order not found" });

            var history = await db.OrderHistories
                .Where(h => h.OrderId == id)
                .OrderByDescending(h => h.ChangedAt)
                .Select(h => new
                {
                    h.Id,
                    h.FromStatus,
                    h.ToStatus,
                    h.Notes,
                    h.ChangedBy,
                    h.ChangedAt
                })
                .ToListAsync();

            return Results.Ok(history);
        });

        // W2-23: các endpoint chuyển trạng thái + ghi nhận thu tiền (cùng chủ sở hữu, tách file
        // để giữ mỗi file dưới 200 dòng).
        OrderLifecycleEndpoints.MapOrderLifecycleEndpoints(group, adminGroup);
        CustomerOrderStatsEndpoints.MapCustomerOrderStatsEndpoints(group);
    }
}
