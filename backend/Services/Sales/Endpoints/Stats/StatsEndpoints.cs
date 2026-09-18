using BuildingBlocks.Security;
using BuildingBlocks.Time;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Endpoints.Stats;

/// <summary>
/// Thống kê bán hàng — **W2-10** (`phase-48` bước 8).
///
/// Hai thứ được sửa:
///  1. DOANH THU đi qua <see cref="RecognizedRevenue"/>, vị từ DUY NHẤT của "đơn này có tính vào
///     doanh thu không". Bản cũ tự viết điều kiện <c>PaymentStatus == Paid</c>, khác với Reporting
///     (<c>Status != Cancelled</c>) và khác với dashboard — ba con số cho cùng một câu hỏi.
///  2. TĂNG TRƯỞNG không còn bịa 100%. Không có kỳ gốc thì trả <c>null</c> + <c>noBaseline</c>;
///     "tăng 100%" khi tháng trước bằng 0 là một con số không có thật, và nó đã từng được in ra
///     báo cáo cho chủ shop đọc.
///
/// Mốc thời gian dùng ngày làm việc VN (<see cref="IBusinessClock"/>): "hôm nay" ở Hà Nội lúc
/// 06:00 vẫn là "hôm qua" theo UTC, nên doanh thu ca sáng rơi nhầm sang ngày trước.
/// </summary>
internal static class StatsEndpoints
{
    public static void MapStatsEndpoints(RouteGroupBuilder group, RouteGroupBuilder adminGroup)
    {
        adminGroup.MapGet("/stats", async (
            SalesDbContext db, IBusinessClock clock, CancellationToken ct) =>
        {
            var todayVn = clock.TodayVn;
            var today = todayVn.ToDateTime(TimeOnly.MinValue);
            var thisMonth = new DateTime(todayVn.Year, todayVn.Month, 1);
            var lastMonthStart = thisMonth.AddMonths(-1);
            var lastMonthEnd = thisMonth.AddTicks(-1);

            var revenue = db.Orders.Recognized();

            var totalOrders = await db.Orders.CountAsync(ct);
            var todayOrders = await db.Orders.CountAsync(o => o.OrderDate >= today, ct);
            var monthOrders = await db.Orders.CountAsync(o => o.OrderDate >= thisMonth, ct);
            var lastMonthOrders = await db.Orders.CountAsync(
                o => o.OrderDate >= lastMonthStart && o.OrderDate <= lastMonthEnd, ct);

            var totalRevenue = await revenue.SumAsync(o => (decimal?)o.TotalAmount, ct) ?? 0m;
            var monthRevenue = await revenue.Where(o => o.OrderDate >= thisMonth)
                .SumAsync(o => (decimal?)o.TotalAmount, ct) ?? 0m;
            var lastMonthRevenue = await revenue
                .Where(o => o.OrderDate >= lastMonthStart && o.OrderDate <= lastMonthEnd)
                .SumAsync(o => (decimal?)o.TotalAmount, ct) ?? 0m;
            var todayRevenue = await revenue.Where(o => o.OrderDate >= today)
                .SumAsync(o => (decimal?)o.TotalAmount, ct) ?? 0m;

            // Doanh thu RÒNG: trừ tiền đã hoàn cho khách (RecognizedRevenue.NetAmount).
            var refunded = await db.ReturnRequests
                .Where(r => r.Status == ReturnStatus.Completed || r.Status == ReturnStatus.Refunded)
                .SumAsync(r => (decimal?)r.RefundAmount, ct) ?? 0m;

            var paidOrderCount = await revenue.CountAsync(ct);

            return Results.Ok(new
            {
                TotalOrders = totalOrders,
                TodayOrders = todayOrders,
                MonthOrders = monthOrders,
                TotalRevenue = totalRevenue,
                NetRevenue = RecognizedRevenue.NetAmount(totalRevenue, refunded),
                RefundedAmount = refunded,
                MonthRevenue = monthRevenue,
                TodayRevenue = todayRevenue,
                PendingOrders = await db.Orders.CountAsync(o => o.Status == OrderStatus.Pending, ct),
                CompletedOrders = await db.Orders.CountAsync(o => o.Status == OrderStatus.Completed, ct),
                AverageOrderValue = paidOrderCount > 0 ? totalRevenue / paidOrderCount : 0m,
                OrderGrowth = Delta(monthOrders, lastMonthOrders),
                RevenueGrowth = Delta(monthRevenue, lastMonthRevenue),
            });
            // IR w0#56 — vai trò Marketing được seeder cấp Sales.ViewAll nhưng vẫn nhận 403 vì
            // quyền của nhóm /admin gán THEO VERB. Gắn policy tường minh: yêu cầu của endpoint này
            // đúng bằng quyền có trong ma trận, nên thanh topbar của Marketing hết 403 trên mọi trang.
        }).RequireAuthorization(Permissions.Sales.ViewAll);

        adminGroup.MapGet("/stats/revenue-chart", async (
            SalesDbContext db, IBusinessClock clock, CancellationToken ct, int year = 0) =>
        {
            var targetYear = year == 0 ? clock.TodayVn.Year : year;
            var startDate = new DateTime(targetYear, 1, 1);
            var endDate = new DateTime(targetYear, 12, 31, 23, 59, 59);

            var monthly = await db.Orders.Recognized()
                .Where(o => o.OrderDate >= startDate && o.OrderDate <= endDate)
                .GroupBy(o => o.OrderDate.Month)
                .Select(g => new { Month = g.Key, Revenue = g.Sum(o => o.TotalAmount), OrderCount = g.Count() })
                .ToListAsync(ct);

            var allMonths = Enumerable.Range(1, 12).Select(month =>
            {
                var data = monthly.FirstOrDefault(m => m.Month == month);
                return new { Month = month, Revenue = data?.Revenue ?? 0m, OrderCount = data?.OrderCount ?? 0 };
            }).ToList();

            return Results.Ok(new { Year = targetYear, MonthlyData = allMonths });
        }).RequireAuthorization(Permissions.Sales.ViewAll);

        // Doanh số theo KÊNH bán — con số chủ shop cần để biết quầy hay web đang nuôi cửa hàng.
        adminGroup.MapGet("/stats/by-channel", async (
            SalesDbContext db, CancellationToken ct, DateTime? from = null, DateTime? to = null) =>
        {
            var query = db.Orders.Recognized();
            if (from.HasValue) query = query.Where(o => o.OrderDate >= from.Value);
            if (to.HasValue) query = query.Where(o => o.OrderDate <= to.Value);

            var rows = await query
                .GroupBy(o => o.Channel)
                .Select(g => new
                {
                    Channel = g.Key,
                    Orders = g.Count(),
                    Revenue = g.Sum(o => o.TotalAmount),
                })
                .ToListAsync(ct);

            return Results.Ok(new { From = from, To = to, Channels = rows });
        }).RequireAuthorization(Permissions.Sales.ViewAll);
    }

    /// <summary>
    /// Chênh lệch kỳ này so với kỳ trước. KHÔNG có kỳ gốc ⇒ <c>percent = null</c> +
    /// <c>noBaseline = true</c>, không phải 100%.
    /// </summary>
    private static object Delta(decimal current, decimal previous)
    {
        if (previous <= 0m)
            return new { percent = (decimal?)null, noBaseline = true, current, previous };

        return new
        {
            percent = (decimal?)Math.Round((current - previous) / previous * 100m, 1),
            noBaseline = false,
            current,
            previous,
        };
    }
}
