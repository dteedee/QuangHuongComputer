using BuildingBlocks.Time;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Sales.Application.Orders;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Application.Installments;

/// <summary>
/// W2-20 — nhả đơn giữ chỗ quá hạn cho hồ sơ trả góp còn PendingApproval (D10 quy tắc 6: bản gốc
/// "job huỷ đơn bỏ qua đơn có hồ sơ mở VÔ THỜI HẠN" = giữ hàng miễn phí mãi mãi; hạn giữ
/// <c>Installment:LeadHoldHours</c>, mặc định 72h, sửa lỗi đó).
///
/// KHÔNG tự đăng ký <c>BackgroundService</c> - phase-69 §Architecture nói rõ đây là "một nhánh
/// trong job hết-hạn-đơn hiện có của W2-10", không phải job mới. Job đó CHƯA tồn tại khi track này
/// chạy (W2-10 tự báo "Job hết hạn đơn chưa thanh toán: KHÔNG LÀM", IR #26 xin đăng ký DI ở
/// `Sales/DependencyInjection.cs`, file đó không thuộc sở hữu track này). Vì vậy lớp này chỉ để lộ
/// đúng một phương thức tĩnh, không cần đăng ký DI, để BẤT KỲ job nào (build sau, hoặc thao tác tay
/// qua endpoint admin) resolve service qua constructor rồi gọi - xem IR đã ghi ở report.
/// </summary>
public static class InstallmentExpiryService
{
    private const int BatchSize = 100;

    /// <summary>Quét một lô hồ sơ PendingApproval đã quá <see cref="InstallmentApplication.ExpiresAt"/>:
    /// Expire hồ sơ + huỷ đơn (nhả tồn, đảo điểm nếu có) qua đúng
    /// <see cref="OrderLifecycleService.CancelAsync"/> — KHÔNG thao tác tồn kho trực tiếp ở đây.
    /// Thông báo email đi kèm miễn phí: <c>CancelAsync</c> đã phát <c>OrderCancelledEvent</c>, và
    /// Communication module đã có consumer gửi email huỷ đơn cho khách (không cần code thêm ở đây).</summary>
    /// <returns>Số hồ sơ đã Expire trong lượt gọi này.</returns>
    public static async Task<int> ExpireOverdueBatchAsync(
        SalesDbContext db, OrderLifecycleService lifecycle, IBusinessClock clock,
        ILogger logger, CancellationToken ct)
    {
        var now = clock.UtcNow.UtcDateTime;
        var overdue = await db.InstallmentApplications
            .Where(i => i.Status == InstallmentStatus.PendingApproval && i.ExpiresAt != null && i.ExpiresAt < now)
            .OrderBy(i => i.ExpiresAt)
            .Take(BatchSize)
            .ToListAsync(ct);

        var expiredCount = 0;
        foreach (var app in overdue)
        {
            try
            {
                app.Expire(now);
                await db.SaveChangesAsync(ct);

                await lifecycle.CancelAsync(
                    app.OrderId,
                    $"Hồ sơ trả góp hết hạn giữ hàng (đối tác {app.Provider}, quá {app.ExpiresAt:o})",
                    "system",
                    ct);

                expiredCount++;
            }
            catch (Exception ex)
            {
                // Một hồ sơ lỗi KHÔNG được chặn cả lô - hàng vẫn phải được nhả cho những hồ sơ khác.
                logger.LogError(ex, "Hết hạn hồ sơ trả góp {ApplicationId} thất bại", app.Id);
            }
        }

        return expiredCount;
    }
}
