using BuildingBlocks.Configuration;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Repair.Infrastructure;

namespace Repair;

/// <summary>
/// W2-13: guest ticket tracking - code + phone, no login required. Anonymous and
/// rate-limited (the same "contact" policy Communication's public forms use, IR W0 #3),
/// and returns nothing beyond status/timeline/quote summary - never the full work
/// order, customer id, or any other customer's data.
/// </summary>
public static class PublicTrackingEndpoints
{
    public static void MapPublicTrackingEndpoints(this IEndpointRouteBuilder app)
    {
        // IR#54: the storefront had no real number to show for the on-site fee - this
        // is the "effective value on a public endpoint" the IR asked for.
        app.MapGet("/api/repair/onsite-fee", (IAppSettings settings) =>
        {
            var enabled = settings.GetBool("Warranty.OnsiteEnabled", false);
            return Results.Ok(new
            {
                Enabled = enabled,
                FeeVnd = enabled ? settings.GetDecimal("Warranty.OnsiteFeeVnd", 0m) : 0m
            });
            // W4-5: chỉ trả 2 con số niêm yết công khai, không đọc DB, không PII.
        }).AllowAnonymous();

        var group = app.MapGroup("/api/repair/track");

        group.MapGet("/{ticketNumber}", async (string ticketNumber, string phone, RepairDbContext db) =>
        {
            var normalizedPhone = NormalizePhone(phone);
            if (string.IsNullOrWhiteSpace(ticketNumber) || normalizedPhone.Length < 8)
                return Results.BadRequest(new { error = "Mã phiếu và số điện thoại là bắt buộc." });

            var workOrder = await db.WorkOrders
                .Include(w => w.Quotes)
                .Include(w => w.ActivityLogs)
                .FirstOrDefaultAsync(w => w.TicketNumber == ticketNumber);

            // Phone lives on the ServiceBooking behind a booked order, or is looked up
            // via the customer for a walk-in - Repair does not own customer contact
            // data, so we join through ServiceBookings for the booked path. A work
            // order with no linked booking (pure walk-in without a stored phone on this
            // side) cannot be tracked this way yet - see Unresolved in the report.
            string? bookingPhone = null;
            if (workOrder?.ServiceBookingId is Guid bookingId)
            {
                bookingPhone = await db.ServiceBookings
                    .Where(b => b.Id == bookingId)
                    .Select(b => b.CustomerPhone)
                    .FirstOrDefaultAsync();
            }

            if (workOrder == null || bookingPhone == null || NormalizePhone(bookingPhone) != normalizedPhone)
            {
                // Same response whether the ticket doesn't exist or the phone doesn't
                // match - do not leak which one it was.
                return Results.NotFound(new { error = "Không tìm thấy phiếu sửa chữa với thông tin đã cung cấp." });
            }

            var currentQuote = workOrder.Quotes
                .Where(q => q.Id == workOrder.CurrentQuoteId)
                .Select(q => new { q.QuoteNumber, q.TotalCost, Status = q.Status.ToString(), q.ValidUntil })
                .FirstOrDefault();

            return Results.Ok(new
            {
                workOrder.TicketNumber,
                workOrder.DeviceModel,
                Status = workOrder.Status.ToString(),
                workOrder.CreatedAt,
                workOrder.StartedAt,
                workOrder.FinishedAt,
                Quote = currentQuote,
                Timeline = workOrder.ActivityLogs
                    .OrderBy(l => l.CreatedAt)
                    .Select(l => new { l.Activity, l.Description, l.CreatedAt })
            });
            // W4-5: mã phiếu + SĐT phải khớp cùng một phiếu; sai một trong hai trả CÙNG một 404.
        }).AllowAnonymous().RequireRateLimiting("contact");
    }

    private static string NormalizePhone(string? phone) =>
        new string((phone ?? string.Empty).Where(char.IsDigit).ToArray());
}
