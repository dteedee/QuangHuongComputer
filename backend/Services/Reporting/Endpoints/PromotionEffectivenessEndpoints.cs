using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using BuildingBlocks.Time;
using Content.Infrastructure;
using Sales.Infrastructure;
using Sales.Domain;
using Reporting.Shared;

namespace Reporting.Endpoints;

/// <summary>
/// D10 (phase-54 binding decision update, +2.5h) — hiệu quả từng chương trình khuyến mãi: số đơn,
/// doanh thu, tiền giảm đã cho và tỉ lệ dùng lại mã, cộng thêm breakdown theo coupon. Dữ liệu lấy
/// từ <c>content.PromotionUsages</c> (nhật ký dùng thật, chống trùng), nối với
/// <c>Orders.CouponCode</c>/<c>Orders.AppliedPromotionsJson</c> để lấy doanh thu ghi nhận
/// (<see cref="RecognizedRevenue"/>) và tiền giảm thật của đơn. W3-18 render.
/// </summary>
public static class PromotionEffectivenessEndpoints
{
    public static void MapPromotionEffectivenessEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/promotion-effectiveness", async (
            ContentDbContext contentDb, SalesDbContext salesDb, IBusinessClock clock,
            string? startDate, string? endDate) =>
        {
            ReportPeriod period;
            try { period = ReportPeriod.Resolve(clock, startDate, endDate); }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
            var (start, end) = (period.Start, period.End);

            // Nhật ký dùng thật trong kỳ (một dòng / một lượt áp dụng thành công).
            var usages = await contentDb.PromotionUsages
                .Where(u => u.UsedAt >= start && u.UsedAt < end)
                .ToListAsync();
            if (usages.Count == 0)
                return Results.Ok(new { Period = new { Start = start, End = end }, Promotions = Array.Empty<object>(), Coupons = Array.Empty<object>() });

            var orderIds = usages.Select(u => u.OrderId).Distinct().ToList();
            // Chỉ tính doanh thu/giảm giá của các đơn ĐƯỢC GHI NHẬN doanh thu (Requirement 1) -
            // một mã khuyến mãi áp trên đơn bị huỷ không được tính là "hiệu quả".
            var orders = await salesDb.Orders
                .Recognized()
                .Where(o => orderIds.Contains(o.Id))
                .Select(o => new { o.Id, o.TotalAmount, o.DiscountAmount, o.CouponCode })
                .ToListAsync();
            var orderById = orders.ToDictionary(o => o.Id);

            var promotions = usages
                .Where(u => orderById.ContainsKey(u.OrderId))
                .GroupBy(u => u.PromotionId)
                .Select(g =>
                {
                    var ords = g.Select(u => orderById[u.OrderId]).ToList();
                    var uniqueCustomers = g.Select(u => u.CustomerId?.ToString() ?? u.CustomerPhone ?? u.OrderId.ToString()).Distinct().Count();
                    return new
                    {
                        PromotionId = g.Key,
                        OrderCount = ords.Count,
                        Revenue = ords.Sum(o => o.TotalAmount),
                        DiscountGiven = ords.Sum(o => o.DiscountAmount),
                        UsageCount = g.Count(),
                        UniqueCustomers = uniqueCustomers,
                        // Lượt dùng lại = tổng lượt dùng - số khách khác nhau (khách quay lại dùng thêm lần nữa).
                        RedemptionRate = g.Count() > 0 ? Math.Round((double)(g.Count() - uniqueCustomers) / g.Count() * 100, 1) : 0
                    };
                })
                .OrderByDescending(x => x.Revenue)
                .ToList();

            var coupons = orders
                .Where(o => !string.IsNullOrEmpty(o.CouponCode))
                .GroupBy(o => o.CouponCode)
                .Select(g => new
                {
                    CouponCode = g.Key,
                    OrderCount = g.Count(),
                    Revenue = g.Sum(o => o.TotalAmount),
                    DiscountGiven = g.Sum(o => o.DiscountAmount)
                })
                .OrderByDescending(x => x.Revenue)
                .ToList();

            return Results.Ok(new { Period = new { Start = start, End = end }, Promotions = promotions, Coupons = coupons });
        });
    }
}
