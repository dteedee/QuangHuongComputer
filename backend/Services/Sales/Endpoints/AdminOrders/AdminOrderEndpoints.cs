using System.Security.Claims;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using Catalog.Infrastructure;
using Identity.Services;
using InventoryModule.Infrastructure;
using MassTransit;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Sales.Application.AdminOrders;
using Sales.Application.Inventory;
using Sales.Application.Orders;
using Sales.Domain;
using Sales.Endpoints.Orders;
using Sales.Infrastructure;

namespace Sales.Endpoints.AdminOrders;

/// <summary>
/// Quản trị đơn hàng — **W2-10** (`phase-48` bước 7).
///
/// Ba thay đổi so với bản trích nguyên văn (IR w2#16 + #24):
///  1. Danh sách/chi tiết là DTO tường minh có TÊN + SỐ ĐIỆN THOẠI khách (qua
///     <see cref="IUserDirectory"/>), sổ thu tiền, lịch sử và các bước chuyển trạng thái hợp lệ —
///     thay vì trả entity thô không đủ dùng mà lại lộ IP/User-Agent.
///  2. Sáu handler vòng đời (confirm/fulfill/ship/deliver/complete/status) nay ĐỀU đi qua
///     <see cref="OrderLifecycleService"/>. Trước đây chúng tự đổi trạng thái, tự bắt lỗi trước
///     bằng <c>BadRequest</c> (nên client nhận 400 thay vì 409) và KHÔNG phát sự kiện nào — đơn
///     chuyển trạng thái qua các route này không bao giờ sinh hoá đơn.
///  3. <c>PUT /status</c> với <c>Paid</c> trả 409: tiền chỉ vào đơn qua phiếu thu
///     (<c>POST /orders/{id}/payments</c>), nếu không sẽ có đơn "đã thanh toán" mà sổ thu trống.
/// </summary>
internal static partial class AdminOrderEndpoints
{
    public static void MapAdminOrderEndpoints(RouteGroupBuilder group, RouteGroupBuilder adminGroup)
    {
        MapQueries(adminGroup);
        MapLifecycle(adminGroup);
    }

    private static void MapQueries(RouteGroupBuilder adminGroup)
    {
        adminGroup.MapGet("/orders", async (
            SalesDbContext db,
            IUserDirectory directory,
            CancellationToken ct,
            int page = 1,
            int pageSize = 20,
            string? search = null,
            string? status = null,
            string? paymentStatus = null,
            string? channel = null,
            DateTime? from = null,
            DateTime? to = null) =>
        {
            var result = await AdminOrderQueries.ListAsync(db, directory,
                new AdminOrderQueries.ListFilter(
                    page, pageSize, search, status, paymentStatus, channel, from, to), ct);
            return Results.Ok(result);
        }).RequireAuthorization(Permissions.Sales.ViewAll);

        adminGroup.MapGet("/orders/{id:guid}", async (
            Guid id, SalesDbContext db, IUserDirectory directory, CancellationToken ct) =>
        {
            var detail = await AdminOrderQueries.DetailAsync(db, directory, id, ct)
                ?? throw NotFoundException.For("đơn hàng", id);
            return Results.Ok(detail);
        }).RequireAuthorization(Permissions.Sales.ViewAll);

        adminGroup.MapPut("/orders/{id:guid}/attributes", async (
            Guid id, SetOrderAttributesDto dto, SalesDbContext db,
            SystemConfig.Infrastructure.CustomFieldDbContext customFieldDb,
            CancellationToken ct) =>
        {
            var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == id, ct)
                ?? throw NotFoundException.For("đơn hàng", id);

            var error = await SystemConfig.CustomFieldAttributeValidator
                .ValidateAsync(customFieldDb, "Order", dto.Attributes);
            if (error is not null) throw new DomainException(error);

            order.SetAttributes(dto.Attributes);
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { order.Id, order.Attributes });
        });

        // Ghi chú nội bộ của nhân viên — không hiện cho khách.
        adminGroup.MapPost("/orders/{id:guid}/notes", async (
            AddOrderNoteDto dto, Guid id, SalesDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(dto.Note))
                throw new RequestValidationException("note", "Nội dung ghi chú là bắt buộc.");

            var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == id, ct)
                ?? throw NotFoundException.For("đơn hàng", id);

            var actor = user.FindFirstValue(ClaimTypes.Name)
                        ?? user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
            order.AddInternalNote($"[{actor}] {dto.Note.Trim()}");
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { order.Id, order.InternalNotes });
        });
    }

}

/// <summary>Ghi chú nội bộ gắn vào đơn.</summary>
public record AddOrderNoteDto(string Note);
