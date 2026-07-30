using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales;

/// <summary>
/// Phase 04 — Trả góp (Installment).
/// Đơn có PaymentMethod=Installment → khách nộp hồ sơ (CMND/CCCD/sao kê).
/// Admin duyệt → Approved; từ chối → Rejected.
/// </summary>
public static class InstallmentEndpoints
{
    public static void MapInstallmentEndpoints(this IEndpointRouteBuilder app)
    {
        var user = app.MapGroup("/api/installment").RequireAuthorization();
        var admin = app.MapGroup("/api/admin/installment")
            .RequireAuthorization(p => p.RequireRole("Admin", "Manager", "Sale"));

        // Khách nộp hồ sơ trả góp cho đơn.
        user.MapPost("/apply", async (
            ApplyInstallmentDto dto,
            SalesDbContext db,
            ClaimsPrincipal principal,
            CancellationToken ct) =>
        {
            var userIdStr = principal.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var uid))
                return Results.Unauthorized();

            var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == dto.OrderId && o.CustomerId == uid, ct);
            if (order == null) return Results.NotFound(new { Error = "Đơn hàng không tồn tại" });

            // Chặn trùng: 1 order chỉ 1 hồ sơ trả góp active.
            var existing = await db.InstallmentApplications
                .FirstOrDefaultAsync(i => i.OrderId == dto.OrderId
                    && i.Status != InstallmentStatus.Rejected, ct);
            if (existing != null)
                return Results.BadRequest(new { Error = "Đã có hồ sơ trả góp cho đơn này" });

            InstallmentApplication app;
            try
            {
                app = InstallmentApplication.Create(
                    orderId: dto.OrderId,
                    provider: dto.Provider,
                    termMonths: dto.TermMonths,
                    downPayment: dto.DownPayment,
                    orderTotal: order.TotalAmount,
                    documentUrls: dto.DocumentUrlsJson);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }

            db.InstallmentApplications.Add(app);
            await db.SaveChangesAsync(ct);

            return Results.Ok(new
            {
                app.Id,
                app.Status,
                app.MonthlyAmount,
                app.TotalAmount,
                app.DownPayment,
                app.TermMonths
            });
        });

        // Khách xem hồ sơ của mình.
        user.MapGet("/mine", async (SalesDbContext db, ClaimsPrincipal principal, CancellationToken ct) =>
        {
            var userIdStr = principal.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var uid))
                return Results.Unauthorized();
            var orderIds = await db.Orders.Where(o => o.CustomerId == uid).Select(o => o.Id).ToListAsync(ct);
            var apps = await db.InstallmentApplications
                .Where(i => orderIds.Contains(i.OrderId))
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync(ct);
            return Results.Ok(apps);
        });

        // Admin: danh sách chờ duyệt.
        admin.MapGet("/pending", async (SalesDbContext db, CancellationToken ct) =>
        {
            var apps = await db.InstallmentApplications
                .Where(i => i.Status == InstallmentStatus.PendingApproval)
                .OrderBy(i => i.CreatedAt)
                .ToListAsync(ct);
            return Results.Ok(apps);
        });

        // Admin: duyệt.
        admin.MapPost("/{id:guid}/approve", async (
            Guid id, SalesDbContext db, ClaimsPrincipal principal, CancellationToken ct) =>
        {
            var app = await db.InstallmentApplications.FirstOrDefaultAsync(i => i.Id == id, ct);
            if (app == null) return Results.NotFound();
            try
            {
                var name = principal.FindFirstValue(ClaimTypes.Name) ?? "admin";
                app.Approve(name);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { app.Id, app.Status, app.ApprovedAt });
        });

        // Admin: từ chối.
        admin.MapPost("/{id:guid}/reject", async (
            Guid id, RejectInstallmentDto dto, SalesDbContext db,
            ClaimsPrincipal principal, CancellationToken ct) =>
        {
            var app = await db.InstallmentApplications.FirstOrDefaultAsync(i => i.Id == id, ct);
            if (app == null) return Results.NotFound();
            try
            {
                var name = principal.FindFirstValue(ClaimTypes.Name) ?? "admin";
                app.Reject(dto.Reason, name);
            }
            catch (Exception ex) when (ex is InvalidOperationException || ex is ArgumentException)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { app.Id, app.Status, app.RejectedAt, app.RejectionReason });
        });
    }
}

public record ApplyInstallmentDto(
    Guid OrderId,
    string Provider,   // HomeCredit | FeCredit | Manual | VNPayCC
    int TermMonths,    // 6 | 9 | 12
    decimal DownPayment,
    string? DocumentUrlsJson);

public record RejectInstallmentDto(string Reason);
