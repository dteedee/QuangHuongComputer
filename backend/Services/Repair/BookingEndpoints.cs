using System.Security.Claims;
using BuildingBlocks.Configuration;
using BuildingBlocks.Documents;
using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Repair.Application.Bookings;
using Repair.Domain;
using Repair.Infrastructure;

namespace Repair;

/// <summary>
/// Phía KHÁCH của lịch hẹn: đặt lịch (chọn dịch vụ trong danh mục, số lịch hẹn LH-..., giới hạn
/// sức chứa khung giờ kiểm ở server), xem lịch của mình, xem khung giờ còn chỗ. Phần quản trị ở
/// <see cref="BookingAdminEndpoints"/>.
/// </summary>
public static class BookingEndpoints
{
    public static void MapBookingEndpoints(this IEndpointRouteBuilder app)
    {
        // W1-10: nhánh khách hàng -> chỉ cần đăng nhập; handler lọc theo userId.
        var group = app.MapGroup("/api/repair").RequireAuthorization(SecurityPolicies.Authenticated);
        app.MapBookingAdminEndpoints();

        group.MapPost("/book", async ([FromBody] CreateBookingDto model, RepairDbContext db, IAppSettings settings,
            IDocumentNumberService documentNumbers, ClaimsPrincipal user, CancellationToken ct) =>
        {
            if (!TechnicianAccess.TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            // Dịch vụ lấy từ danh mục RepairServiceTypes; client cũ còn gửi enum ServiceType
            // (InShop/OnSite) thì map sang 2 dòng seed có Id cố định.
            var serviceTypeId = model.ServiceTypeId
                ?? (model.ServiceType == ServiceType.OnSite ? RepairServiceType.OnSiteSeedId : RepairServiceType.InShopSeedId);
            var serviceType = await db.RepairServiceTypes.FirstOrDefaultAsync(s => s.Id == serviceTypeId && s.IsActive, ct);
            if (serviceType == null)
                return Results.BadRequest(new { Error = "Dịch vụ đã chọn không tồn tại hoặc đã ngừng nhận." });

            // IR#54/D08: on-site is config-gated (Warranty.OnsiteEnabled, default OFF) and the fee is
            // config-driven (Warranty.OnsiteFeeVnd, default 0) - never a hardcoded literal.
            if (serviceType.IsOnSite && !settings.GetBool("Warranty.OnsiteEnabled", false))
                return Results.BadRequest(new { Error = "Dịch vụ tận nơi hiện chưa được bật." });

            ServiceBooking booking;
            try
            {
                var onSiteFee = serviceType.IsOnSite ? settings.GetDecimal("Warranty.OnsiteFeeVnd", 0m) : 0m;
                booking = new ServiceBooking(userId, serviceType, model.DeviceModel, model.IssueDescription,
                    model.PreferredDate, model.TimeSlot, model.AcceptedTerms, model.CustomerName,
                    model.CustomerPhone, model.CustomerEmail, onSiteFee);

                if (!string.IsNullOrWhiteSpace(model.SerialNumber))
                    booking.SetSerialNumber(model.SerialNumber);

                if (serviceType.IsOnSite)
                {
                    if (string.IsNullOrWhiteSpace(model.ServiceAddress) || !model.LocationType.HasValue)
                        return Results.BadRequest(new { Error = "Vui lòng nhập địa chỉ và loại địa điểm cho dịch vụ tận nơi." });
                    booking.SetOnSiteDetails(model.ServiceAddress, model.LocationType.Value, model.LocationNotes);
                }

                booking.AddMedia(model.ImageUrls ?? new List<string>(), model.VideoUrls ?? new List<string>());
                if (model.OrganizationId.HasValue)
                    booking.LinkOrganization(model.OrganizationId.Value, model.AllowPayLater);

                booking.ValidateBooking();
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = BookingValidationMessage(ex.Message) });
            }

            // Số lịch hẹn cấp NGOÀI transaction (nextval không rollback — lỗ số là chấp nhận được).
            booking.AssignBookingNumber(await documentNumbers.NextAsync(DocumentNumberTypes.ServiceBooking, ct));
            await BookingSlotCapacity.SaveIfRoomAsync(db, booking, BookingSlotCapacity.Resolve(settings, booking.PreferredTimeSlot), ct);

            return Results.Ok(new
            {
                booking.Id,
                booking.BookingNumber,
                booking.CustomerId,
                booking.ServiceType,
                booking.ServiceTypeId,
                ServiceTypeName = serviceType.Name,
                booking.PreferredDate,
                booking.PreferredTimeSlot,
                booking.OnSiteFee,
                booking.Status,
                Message = "Booking created successfully"
            });
        });

        // Khung giờ còn chỗ của một ngày — để form đặt lịch khoá khung đã kín trước khi khách gửi.
        group.MapGet("/booking-slots", async (DateOnly date, RepairDbContext db, IAppSettings settings, CancellationToken ct) =>
        {
            var slots = new List<object>();
            foreach (var slot in Enum.GetValues<TimeSlot>())
            {
                var capacity = BookingSlotCapacity.Resolve(settings, slot);
                var occupied = await BookingSlotCapacity.Occupying(db, date, slot).CountAsync(ct);
                slots.Add(new
                {
                    Slot = slot.ToString(),
                    Capacity = BookingSlotCapacity.IsUnlimited(capacity) ? (int?)null : capacity,
                    Remaining = BookingSlotCapacity.Remaining(occupied, capacity),
                    IsFull = !BookingSlotCapacity.HasRoom(occupied, capacity)
                });
            }

            return Results.Ok(new { Date = date, Slots = slots });
        });

        group.MapGet("/bookings", async (RepairDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
        {
            if (!TechnicianAccess.TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            var bookings = await db.ServiceBookings
                .Where(b => b.CustomerId == userId)
                .OrderByDescending(b => b.CreatedAt)
                .Select(b => new
                {
                    b.Id, b.BookingNumber, b.ServiceType, b.ServiceTypeId,
                    ServiceTypeName = db.RepairServiceTypes.Where(t => t.Id == b.ServiceTypeId).Select(t => t.Name).FirstOrDefault(),
                    b.DeviceModel, b.SerialNumber, b.IssueDescription, b.PreferredDate, b.PreferredTimeSlot,
                    b.ServiceAddress, b.LocationType, b.OnSiteFee, b.EstimatedCost, b.Status, b.WorkOrderId, b.CreatedAt
                })
                .ToListAsync(ct);

            return Results.Ok(bookings);
        });

        group.MapGet("/bookings/{id:guid}", async (Guid id, RepairDbContext db, ClaimsPrincipal user) =>
        {
            if (!TechnicianAccess.TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            var booking = await db.ServiceBookings.FindAsync(id);
            if (booking == null)
                return Results.NotFound(new { Error = "Booking not found" });
            if (booking.CustomerId != userId)
                return Results.Forbid();

            return Results.Ok(new
            {
                booking.Id, booking.BookingNumber, booking.ServiceType, booking.ServiceTypeId,
                booking.DeviceModel, booking.SerialNumber, booking.IssueDescription, booking.ImageUrls, booking.VideoUrls,
                booking.PreferredDate, booking.PreferredTimeSlot, booking.ServiceAddress, booking.LocationType,
                booking.LocationNotes, booking.EstimatedCost, booking.OnSiteFee, booking.Status, booking.WorkOrderId,
                booking.CustomerName, booking.CustomerPhone, booking.CustomerEmail, booking.CreatedAt
            });
        });
    }

    /// <summary>Lỗi kiểm tra của ServiceBooking.ValidateBooking (tiếng Anh nội bộ) → câu tiếng Việt cho khách.</summary>
    private static string BookingValidationMessage(string internalMessage) => internalMessage switch
    {
        "Device model is required" => "Vui lòng nhập tên thiết bị.",
        "Issue description is required" => "Vui lòng mô tả lỗi.",
        "Preferred date cannot be in the past" => "Ngày hẹn không được ở quá khứ.",
        "Terms and conditions must be accepted" => "Vui lòng đồng ý điều khoản dịch vụ.",
        "Service address is required for on-site service" => "Vui lòng nhập địa chỉ cho dịch vụ tận nơi.",
        "Customer contact information is required" => "Vui lòng nhập họ tên và số điện thoại.",
        _ => "Thông tin đặt lịch chưa hợp lệ. Vui lòng kiểm tra lại."
    };
}

public record CreateBookingDto(
    ServiceType? ServiceType,
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
    bool AllowPayLater = false,
    Guid? ServiceTypeId = null
);
