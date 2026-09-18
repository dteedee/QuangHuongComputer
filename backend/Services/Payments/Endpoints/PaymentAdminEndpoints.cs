using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Payments.Application.Configuration;
using Payments.Domain;
using Payments.Endpoints.Admin;
using Payments.Infrastructure;

namespace Payments.Endpoints;

/// <summary>
/// Cửa vào của nhóm `/api/payments/admin`. File này chỉ còn phần CẤU HÌNH; danh sách giao dịch,
/// đối soát và hoàn tiền nằm ở <see cref="Admin"/> để mỗi file dưới 200 dòng.
///
/// Phân quyền theo W1-1: `/admin/status` + `/admin/config` = `Payments.Configure`,
/// `/admin/payments` = `Payments.View`, `/admin/reconciliation` = `Payments.Reconcile`,
/// `/admin/refunds` = `Payments.Refund`. Trước W2-4 cả nhóm dùng `System.ManageConfig`, nghĩa là
/// kế toán không xem được giao dịch còn người cấu hình hệ thống lại hoàn được tiền.
///
/// D04 R5: KHÔNG API nào được trả secret ra ngoài — `/admin/config` che giá trị của mọi bản ghi
/// `IsSecret`, `/admin/status` chỉ nêu TÊN khoá còn thiếu.
/// </summary>
public static class PaymentAdminEndpoints
{
    public static void MapPaymentAdminEndpoints(this RouteGroupBuilder group)
    {
        var adminGroup = group.MapGroup("/admin");

        adminGroup.MapPaymentAdminListEndpoints();
        adminGroup.MapPaymentAdminReconcileEndpoints();
        adminGroup.MapPaymentAdminRefundEndpoints();

        // Nhóm thứ hai cùng tiền tố, chính sách riêng: cấu hình cổng KHÔNG cùng quyền với xem giao dịch.
        var configGroup = group.MapGroup("/admin").RequireAuthorization(Permissions.Payments.Configure);

        configGroup.MapGet("/status", (PaymentConfigGuard guard) => Results.Ok(
            guard.AllMethods().Select(m => new
            {
                provider = m.Provider.ToString(),
                code = m.Code,
                name = m.DisplayName,
                configured = m.Available,
                direct = m.IsDirect,
                missingKeys = m.MissingKeys
            })));

        // URL phải khai báo với hãng (SePay/VNPay) — hiện ở trang admin theo D04 R5.
        configGroup.MapGet("/webhook-urls", (HttpContext ctx) =>
        {
            var baseUrl = $"{ctx.Request.Scheme}://{ctx.Request.Host}";
            return Results.Ok(new
            {
                sePayWebhook = $"{baseUrl}/api/payments/v2/sepay/webhook",
                vnPayReturn = $"{baseUrl}/api/payments/v2/vnpay/callback",
                moMoIpn = $"{baseUrl}/api/payments/v2/momo/callback"
            });
        });

        configGroup.MapGet("/sepay-transactions", async (PaymentsDbContext db, CancellationToken ct) =>
        {
            var transactions = await db.SePayTransactions.AsNoTracking()
                .OrderByDescending(t => t.TransactionDate)
                .Take(100)
                .ToListAsync(ct);
            return Results.Ok(transactions);
        });

        configGroup.MapGet("/sepay-stats", async (PaymentsDbContext db, CancellationToken ct) =>
        {
            var totalRevenue = await db.SePayTransactions
                .Where(t => t.TransferType == "in" && t.IsProcessed)
                .SumAsync(t => t.TransferAmount, ct);

            var today = DateTime.UtcNow.Date;
            var todayRevenue = await db.SePayTransactions
                .Where(t => t.TransferType == "in" && t.IsProcessed && t.TransactionDate.Date == today)
                .SumAsync(t => t.TransferAmount, ct);

            var totalTransactions = await db.SePayTransactions.CountAsync(ct);
            var successTransactions = await db.SePayTransactions.CountAsync(t => t.IsProcessed, ct);

            return Results.Ok(new
            {
                TotalRevenue = totalRevenue,
                TodayRevenue = todayRevenue,
                TotalTransactions = totalTransactions,
                SuccessRate = totalTransactions > 0 ? (successTransactions * 100.0 / totalTransactions) : 0
            });
        });

        // Giá trị secret bị che — chỉ trả 4 ký tự cuối để đối chiếu.
        configGroup.MapGet("/config", async (PaymentsDbContext db, CancellationToken ct) =>
        {
            var configs = await db.PaymentConfigs.AsNoTracking().ToListAsync(ct);
            return Results.Ok(configs.Select(c => new
            {
                key = c.Id,
                value = c.IsSecret ? Mask(c.Value) : c.Value,
                c.Description,
                c.IsSecret,
                c.UpdatedAt
            }));
        });

        configGroup.MapPost("/config", async (PaymentConfigDto model, PaymentsDbContext db, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(model.Key))
                return Results.BadRequest(new { error = "KEY_REQUIRED", message = "Thiếu khoá cấu hình" });

            var config = await db.PaymentConfigs.FindAsync(new object[] { model.Key }, ct);
            if (config == null)
            {
                config = new PaymentConfig(model.Key);
                db.PaymentConfigs.Add(config);
            }

            config.Value = model.Value;
            config.Description = model.Description ?? "";
            config.IsSecret = model.IsSecret;
            config.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync(ct);
            return Results.Ok(new { key = config.Id, saved = true });
        });
    }

    private static string Mask(string? value)
        => string.IsNullOrEmpty(value) ? "" : value.Length <= 4 ? "****" : $"****{value[^4..]}";
}
