using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Payments.Application.Configuration;
using Payments.Domain;
using Payments.Infrastructure;

namespace Payments.Endpoints;

/// <summary>
/// W0-10 — endpoint quản trị thanh toán.
/// D04 R5: KHÔNG API nào được trả secret ra ngoài — `/admin/config` giờ che giá trị của mọi
/// bản ghi `IsSecret`. `/admin/status` là bảng "Đã cấu hình / Thiếu: ..." đọc từ
/// <see cref="PaymentConfigGuard"/> (chỉ TÊN khoá thiếu, không bao giờ giá trị).
/// </summary>
public static class PaymentAdminEndpoints
{
    public static void MapPaymentAdminEndpoints(this RouteGroupBuilder group)
    {
        var adminGroup = group.MapGroup("/admin").RequireAuthorization(Permissions.System.ManageConfig);

        adminGroup.MapGet("/status", (PaymentConfigGuard guard) => Results.Ok(
            guard.AllMethods().Select(m => new
            {
                provider = m.Provider.ToString(),
                code = m.Code,
                name = m.DisplayName,
                configured = m.Available,
                missingKeys = m.MissingKeys
            })));

        adminGroup.MapGet("/sepay-transactions", async (PaymentsDbContext db, CancellationToken ct) =>
        {
            var transactions = await db.SePayTransactions
                .OrderByDescending(t => t.TransactionDate)
                .Take(100)
                .ToListAsync(ct);
            return Results.Ok(transactions);
        });

        adminGroup.MapGet("/sepay-stats", async (PaymentsDbContext db, CancellationToken ct) =>
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
        adminGroup.MapGet("/config", async (PaymentsDbContext db, CancellationToken ct) =>
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

        adminGroup.MapPost("/config", async (PaymentConfigDto model, PaymentsDbContext db, CancellationToken ct) =>
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
