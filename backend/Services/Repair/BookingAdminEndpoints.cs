using System.Security.Claims;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Repair.Domain;
using Repair.Infrastructure;

namespace Repair;

/// <summary>
/// Quản trị lịch hẹn: danh sách (lọc trạng thái, tìm theo số lịch hẹn / tên / SĐT), duyệt, từ chối,
/// "Khách không đến", chuyển thành phiếu sửa. Quyền theo verb của module Repair
/// (GET = Repair.ViewAll, PUT = Repair.UpdateStatus, POST = Repair.CreateQuote).
/// </summary>
public static class BookingAdminEndpoints
{
    public static void MapBookingAdminEndpoints(this IEndpointRouteBuilder app)
    {
        // W1-10: tạo từ `app` (không lồng dưới group Authenticated) để verb-mapping áp dụng.
        var adminGroup = app.MapGroup("/api/repair/admin").RequireModulePermissions(PermissionModules.Repair);

        adminGroup.MapGet("/bookings", async (RepairDbContext db, int page = 1, int pageSize = 20,
            string? status = null, string? search = null, CancellationToken ct = default) =>
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);
            var query = db.ServiceBookings.AsQueryable();

            if (!string.IsNullOrEmpty(status) && Enum.TryParse<BookingStatus>(status, true, out var statusEnum))
                query = query.Where(b => b.Status == statusEnum);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(b => b.BookingNumber.Contains(term.ToUpper())
                    || b.CustomerPhone.Contains(term) || EF.Functions.ILike(b.CustomerName, $"%{term}%"));
            }

            var total = await query.CountAsync(ct);
            var bookings = await query
                .OrderByDescending(b => b.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(b => new
                {
                    b.Id, b.BookingNumber, b.CustomerId, b.ServiceType, b.ServiceTypeId,
                    ServiceTypeName = db.RepairServiceTypes.Where(t => t.Id == b.ServiceTypeId).Select(t => t.Name).FirstOrDefault(),
                    b.DeviceModel, b.IssueDescription, b.PreferredDate, b.PreferredTimeSlot, b.ServiceAddress,
                    b.OnSiteFee, b.EstimatedCost, b.Status, b.NoShowAt, b.WorkOrderId, b.CustomerName, b.CustomerPhone, b.CreatedAt
                })
                .ToListAsync(ct);

            return Results.Ok(new { Total = total, Page = page, PageSize = pageSize, Bookings = bookings });
        });

        adminGroup.MapGet("/bookings/{id:guid}", async (Guid id, RepairDbContext db) =>
        {
            var booking = await db.ServiceBookings.FindAsync(id);
            return booking == null ? Results.NotFound(new { Error = "Booking not found" }) : Results.Ok(booking);
        });

        adminGroup.MapPut("/bookings/{id:guid}/approve", async (Guid id, RepairDbContext db) =>
        {
            var booking = await FindAsync(db, id);
            Transition(() => booking.Approve(), "Chỉ duyệt được lịch đang chờ duyệt.");
            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Booking approved", Status = booking.Status.ToString() });
        });

        adminGroup.MapPut("/bookings/{id:guid}/reject", async (Guid id, [FromBody] RejectBookingDto dto, RepairDbContext db) =>
        {
            var booking = await FindAsync(db, id);
            Transition(() => booking.Reject(dto.Reason), "Chỉ từ chối được lịch đang chờ duyệt.");
            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Booking rejected", Status = booking.Status.ToString() });
        });

        // "Khách không đến": Pending/Approved và ngày hẹn đã tới (giờ VN). Nhả chỗ trong khung giờ.
        adminGroup.MapPut("/bookings/{id:guid}/no-show", async (Guid id, RepairDbContext db, IBusinessClock clock) =>
        {
            var booking = await FindAsync(db, id);
            Transition(() => booking.MarkNoShow(clock.TodayVn),
                "Chỉ đánh \"Khách không đến\" cho lịch chưa xử lý xong và khi đã tới ngày hẹn.");
            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Booking marked as no-show", Status = booking.Status.ToString(), booking.NoShowAt });
        });

        adminGroup.MapPost("/bookings/{id:guid}/convert", async (Guid id, [FromBody] ConvertBookingDto? dto, RepairDbContext db) =>
        {
            var booking = await FindAsync(db, id);
            var workOrder = new WorkOrder(booking, dto?.TechnicianId);
            Transition(() => booking.LinkWorkOrder(workOrder.Id), "Chỉ chuyển được lịch đang chờ duyệt hoặc đã duyệt.");

            db.WorkOrders.Add(workOrder);
            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Booking converted to work order", WorkOrderId = workOrder.Id, workOrder.TicketNumber });
        });
    }

    private static async Task<ServiceBooking> FindAsync(RepairDbContext db, Guid id)
        => await db.ServiceBookings.FindAsync(id) ?? throw NotFoundException.For("lịch hẹn", id);

    /// <summary>Luật chuyển trạng thái nằm ở domain (InvalidOperationException) → 409 kèm câu tiếng Việt.</summary>
    private static void Transition(Action change, string conflictMessage)
    {
        try { change(); }
        catch (InvalidOperationException) { throw new ConflictException(conflictMessage); }
    }
}

public record RejectBookingDto(string Reason);
public record ConvertBookingDto(Guid? TechnicianId);
