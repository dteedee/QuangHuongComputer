using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure;

namespace Reporting.Shared;

/// <summary>
/// W2-16 · phase-54 Requirement 1 — MỌI report/export/KPI/chart trong Reporting phải dùng
/// <see cref="Sales.Domain.RecognizedRevenue"/> qua đây, không tự lọc <c>Status</c>/
/// <c>PaymentStatus</c> ở từng endpoint nữa (đó là lý do dashboard, sales report và Excel
/// export từng ra 3 con số khác nhau cho cùng một kỳ).
/// </summary>
public static class RevenueQueries
{
    /// <summary>Đơn hàng được ghi nhận doanh thu, đã lọc theo khoảng ngày <c>[start, end)</c>.</summary>
    public static IQueryable<Order> RecognizedInPeriod(SalesDbContext db, DateTime start, DateTime end) =>
        db.Orders.Recognized().Where(o => o.OrderDate >= start && o.OrderDate < end);

    /// <summary>Tổng doanh thu GỘP (chưa trừ hoàn tiền) của một kỳ.</summary>
    public static Task<decimal> GrossRevenueAsync(SalesDbContext db, DateTime start, DateTime end) =>
        RecognizedInPeriod(db, start, end).SumAsync(o => (decimal?)o.TotalAmount).ContinueWith(t => t.Result ?? 0m);

    /// <summary>
    /// Doanh thu RÒNG của một kỳ = tổng đơn ghi nhận trừ tổng tiền đã hoàn (<see cref="ReturnStatus.Completed"/>
    /// hoặc <see cref="ReturnStatus.Refunded"/>) của CHÍNH các đơn đó, theo <see cref="RecognizedRevenue.NetAmount"/>.
    /// Hai truy vấn tuần tự trên cùng context (W0-9: không <c>Task.WhenAll</c> trên một DbContext).
    /// </summary>
    public static async Task<decimal> NetRevenueAsync(SalesDbContext db, DateTime start, DateTime end)
    {
        var orderIds = await RecognizedInPeriod(db, start, end)
            .Select(o => new { o.Id, o.TotalAmount })
            .ToListAsync();
        if (orderIds.Count == 0) return 0m;

        var ids = orderIds.Select(o => o.Id).ToList();
        var refunds = await db.Set<ReturnRequest>()
            .Where(r => ids.Contains(r.OrderId) && (r.Status == ReturnStatus.Completed || r.Status == ReturnStatus.Refunded))
            .GroupBy(r => r.OrderId)
            .Select(g => new { OrderId = g.Key, Refunded = g.Sum(r => r.RefundAmount) })
            .ToDictionaryAsync(x => x.OrderId, x => x.Refunded);

        return orderIds.Sum(o => RecognizedRevenue.NetAmount(o.TotalAmount, refunds.GetValueOrDefault(o.Id, 0m)));
    }
}
