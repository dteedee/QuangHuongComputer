using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Repair.Domain;
using Repair.Infrastructure;
using Microsoft.AspNetCore.Authorization;

namespace Repair;

public static class BookingEndpoints
{
    public static void MapBookingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/repair").RequireAuthorization();

        // Customer Endpoints
        group.MapPost("/book", async ([FromBody] CreateBookingDto model, RepairDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            try
            {
                var booking = new ServiceBooking(
                    userId,
                    model.ServiceType,
                    model.DeviceModel,
                    model.IssueDescription,
                    model.PreferredDate,
                    model.TimeSlot,
                    model.AcceptedTerms,
                    model.CustomerName,
                    model.CustomerPhone,
                    model.CustomerEmail
                );

                if (!string.IsNullOrWhiteSpace(model.SerialNumber))
                    booking.SetSerialNumber(model.SerialNumber);

                if (model.ServiceType == ServiceType.OnSite)
                {
                    if (string.IsNullOrWhiteSpace(model.ServiceAddress) || !model.LocationType.HasValue)
                        return Results.BadRequest(new { Error = "Service address and location type are required for on-site service" });

                    booking.SetOnSiteDetails(model.ServiceAddress, model.LocationType.Value, model.LocationNotes);
                }

                if (model.ImageUrls != null && model.ImageUrls.Any())
                    booking.AddMedia(model.ImageUrls, new List<string>());

                if (model.VideoUrls != null && model.VideoUrls.Any())
                    booking.AddMedia(new List<string>(), model.VideoUrls);

                if (model.OrganizationId.HasValue)
                    booking.LinkOrganization(model.OrganizationId.Value, model.AllowPayLater);

                // Validate booking
                booking.ValidateBooking();

                db.ServiceBookings.Add(booking);
                await db.SaveChangesAsync();

                return Results.Ok(new
                {
                    booking.Id,
                    booking.CustomerId,
                    booking.ServiceType,
                    booking.PreferredDate,
                    booking.PreferredTimeSlot,
                    booking.OnSiteFee,
                    booking.Status,
                    Message = "Booking created successfully"
                });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
            catch (Exception ex)
            {
                return Results.Problem($"An error occurred: {ex.Message}");
            }
        });

        group.MapGet("/bookings", async (RepairDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var bookings = await db.ServiceBookings
                .Where(b => b.CustomerId == userId)
                .OrderByDescending(b => b.CreatedAt)
                .Select(b => new
                {
                    b.Id,
                    b.ServiceType,
                    b.DeviceModel,
                    b.SerialNumber,
                    b.IssueDescription,
                    b.PreferredDate,
                    b.PreferredTimeSlot,
                    b.ServiceAddress,
                    b.LocationType,
                    b.OnSiteFee,
                    b.EstimatedCost,
                    b.Status,
                    b.WorkOrderId,
                    b.CreatedAt
                })
                .ToListAsync();

            return Results.Ok(bookings);
        });

        group.MapGet("/bookings/{id:guid}", async (Guid id, RepairDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var booking = await db.ServiceBookings.FindAsync(id);

            if (booking == null)
                return Results.NotFound(new { Error = "Booking not found" });

            if (booking.CustomerId != userId)
                return Results.Forbid();

            return Results.Ok(new
            {
                booking.Id,
                booking.ServiceType,
                booking.DeviceModel,
                booking.SerialNumber,
                booking.IssueDescription,
                booking.ImageUrls,
                booking.VideoUrls,
                booking.PreferredDate,
                booking.PreferredTimeSlot,
                booking.ServiceAddress,
                booking.LocationType,
                booking.LocationNotes,
                booking.EstimatedCost,
                booking.OnSiteFee,
                booking.Status,
                booking.WorkOrderId,
                booking.CustomerName,
                booking.CustomerPhone,
                booking.CustomerEmail,
                booking.CreatedAt
            });
        });

        // Admin Endpoints
        var adminGroup = group.MapGroup("/admin").RequireAuthorization(policy => policy.RequireRole("Admin", "Manager"));

        adminGroup.MapGet("/bookings", async (RepairDbContext db, int page = 1, int pageSize = 20, string? status = null) =>
        {
            var query = db.ServiceBookings.AsQueryable();

            if (!string.IsNullOrEmpty(status) && Enum.TryParse<BookingStatus>(status, true, out var statusEnum))
            {
                query = query.Where(b => b.Status == statusEnum);
            }

            var total = await query.CountAsync();
            var bookings = await query
                .OrderByDescending(b => b.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(b => new
                {
                    b.Id,
                    b.CustomerId,
                    b.ServiceType,
                    b.DeviceModel,
                    b.IssueDescription,
                    b.PreferredDate,
                    b.PreferredTimeSlot,
                    b.ServiceAddress,
                    b.OnSiteFee,
                    b.EstimatedCost,
                    b.Status,
                    b.WorkOrderId,
                    b.CustomerName,
                    b.CustomerPhone,
                    b.CreatedAt
                })
                .ToListAsync();

            return Results.Ok(new
            {
                Total = total,
                Page = page,
                PageSize = pageSize,
                Bookings = bookings
            });
        });

        adminGroup.MapGet("/bookings/{id:guid}", async (Guid id, RepairDbContext db) =>
        {
            var booking = await db.ServiceBookings.FindAsync(id);
            if (booking == null)
                return Results.NotFound(new { Error = "Booking not found" });

            return Results.Ok(booking);
        });

        adminGroup.MapPut("/bookings/{id:guid}/approve", async (Guid id, RepairDbContext db) =>
        {
            var booking = await db.ServiceBookings.FindAsync(id);
            if (booking == null)
                return Results.NotFound(new { Error = "Booking not found" });

            try
            {
                booking.Approve();
                await db.SaveChangesAsync();
                return Results.Ok(new { Message = "Booking approved", Status = booking.Status.ToString() });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
        });

        adminGroup.MapPut("/bookings/{id:guid}/reject", async (Guid id, [FromBody] RejectBookingDto dto, RepairDbContext db) =>
        {
            var booking = await db.ServiceBookings.FindAsync(id);
            if (booking == null)
                return Results.NotFound(new { Error = "Booking not found" });

            try
            {
                booking.Reject(dto.Reason);
                await db.SaveChangesAsync();
                return Results.Ok(new { Message = "Booking rejected", Status = booking.Status.ToString() });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
        });

        adminGroup.MapPost("/bookings/{id:guid}/convert", async (Guid id, [FromBody] ConvertBookingDto? dto, RepairDbContext db) =>
        {
            var booking = await db.ServiceBookings.FindAsync(id);
            if (booking == null)
                return Results.NotFound(new { Error = "Booking not found" });

            if (booking.Status != BookingStatus.Approved && booking.Status != BookingStatus.Pending)
                return Results.BadRequest(new { Error = "Only approved or pending bookings can be converted" });

            try
            {
                var workOrder = new WorkOrder(booking, dto?.TechnicianId);
                db.WorkOrders.Add(workOrder);

                booking.LinkWorkOrder(workOrder.Id);
                await db.SaveChangesAsync();

                return Results.Ok(new
                {
                    Message = "Booking converted to work order",
                    WorkOrderId = workOrder.Id,
                    TicketNumber = workOrder.TicketNumber
                });
            }
            catch (Exception ex)
            {
                return Results.Problem($"An error occurred: {ex.Message}");
            }
        });
    }
}

// DTOs
public record CreateBookingDto(
    ServiceType ServiceType,
    string DeviceModel,
    string? SerialNumber,
    string IssueDescription,
    DateTime PreferredDate,
    TimeSlot TimeSlot,
    string? ServiceAddress,
    ServiceLocation? LocationType,
    string? LocationNotes,
    bool AcceptedTerms,
    string CustomerName,
    string CustomerPhone,
    string CustomerEmail,
    List<string>? ImageUrls,
    List<string>? VideoUrls,
    Guid? OrganizationId,
    bool AllowPayLater = false
);

public record RejectBookingDto(string Reason);
public record ConvertBookingDto(Guid? TechnicianId);
