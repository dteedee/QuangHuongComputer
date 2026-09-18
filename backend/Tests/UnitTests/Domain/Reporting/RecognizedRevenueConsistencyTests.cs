using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Reporting.Shared;
using Sales.Domain;
using Sales.Infrastructure;
using Xunit;

namespace UnitTests.Domain.Reporting;

/// <summary>
/// W2-16 · phase-54 Requirement 1 — "cùng một kỳ → cùng một con số doanh thu ở mọi báo cáo".
/// Mọi endpoint Reporting giờ đọc doanh thu qua HOẶC <see cref="RevenueQueries"/> HOẶC
/// <c>IQueryable&lt;Order&gt;.Recognized()</c> - cả hai đều chỉ là lớp mỏng bọc
/// <see cref="RecognizedRevenue.Predicate"/>. Test này khoá bất biến đó: ba cách gọi khác nhau
/// (predicate thô, <c>.Recognized()</c>, và <see cref="RevenueQueries.GrossRevenueAsync"/>) PHẢI
/// luôn ra đúng MỘT con số cho cùng một tập đơn hàng và cùng một kỳ - nếu ai đó sau này thêm lại
/// một điều kiện lọc doanh thu "nhanh, chỉ cho endpoint này" thì test đỏ ngay.
/// </summary>
public class RecognizedRevenueConsistencyTests
{
    private static SalesDbContext NewDb(string name) =>
        new(new DbContextOptionsBuilder<SalesDbContext>().UseInMemoryDatabase(name).Options);

    private static Order NewOrder(decimal price) => new(
        customerId: Guid.NewGuid(),
        shippingAddress: "1 Nguyễn Huệ, Hà Nội",
        items: new List<OrderItem> { new(Guid.NewGuid(), "RAM 16GB", price, 1) },
        taxRate: 0m);

    /// <summary>Đơn đã thu đủ tiền, chưa giao: <c>Status=Paid</c>, <c>PaymentStatus=Paid</c>.</summary>
    private static Order PaidOrder(decimal price)
    {
        var order = NewOrder(price);
        order.Confirm();
        order.MarkAsPaid("test-pay");
        return order;
    }

    /// <summary>
    /// Đơn <c>Completed</c> nhưng <c>PaymentStatus</c> chưa Paid — dữ liệu CŨ còn trong CSDL.
    /// Từ W2-23 máy trạng thái không sinh ra được tổ hợp này nữa (<c>Completed</c> đòi Paid +
    /// Fulfilled, `OrderStateMachine.cs:104-110`), nên phải gán thẳng bằng reflection: mục đích của
    /// test là vị từ doanh thu phải xử lý CÙNG MỘT DÒNG như nhau ở cả ba đường gọi, kể cả dòng cũ.
    /// Nhánh <c>Status == Completed</c> của <see cref="RecognizedRevenue.Predicate"/> tồn tại chính
    /// vì những dòng này.
    /// </summary>
    private static Order LegacyCompletedUnpaidOrder(decimal price)
    {
        var order = NewOrder(price);
        typeof(Order).GetProperty(nameof(Order.Status))!.SetValue(order, OrderStatus.Completed);
        return order;
    }

    private static Order CancelledOrder(decimal price)
    {
        var order = NewOrder(price);
        order.Cancel("khách huỷ");
        return order;
    }

    [Fact]
    public async Task BaCachGoi_ChoCungMotTapDon_RaCungMotDoanhThu()
    {
        using var db = NewDb(nameof(BaCachGoi_ChoCungMotTapDon_RaCungMotDoanhThu));

        // Trộn đủ trường hợp: đã thu tiền, hoàn tất chưa thu, đã huỷ, chờ xử lý - đúng bộ dữ liệu
        // từng làm dashboard/sales-report/Excel export ra 3 số khác nhau trước W2-3/W2-16.
        var orders = new[]
        {
            PaidOrder(10_000_000m),                    // recognized (đã thu tiền)
            LegacyCompletedUnpaidOrder(5_000_000m),    // recognized (Completed, dữ liệu cũ chưa thu)
            CancelledOrder(8_000_000m),                // NOT recognized (đã huỷ)
            NewOrder(3_000_000m),                      // NOT recognized (chưa thu, chưa hoàn tất)
        };
        db.Orders.AddRange(orders);
        await db.SaveChangesAsync();

        var start = DateTime.UtcNow.AddDays(-1);
        var end = DateTime.UtcNow.AddDays(1);

        // Cách 1: predicate thô trực tiếp trên bộ nhớ (định nghĩa gốc).
        var expected = orders.Where(RecognizedRevenue.IsRecognized).Sum(o => o.TotalAmount);
        expected.Should().Be(15_000_000m, "chỉ 2 đơn Paid/Completed được ghi nhận");

        // Cách 2: .Recognized() trên IQueryable (dùng trong SalesReportEndpoints/FinancialReportEndpoints/...).
        var viaExtension = await db.Orders.Recognized()
            .Where(o => o.OrderDate >= start && o.OrderDate < end)
            .SumAsync(o => (decimal?)o.TotalAmount) ?? 0m;

        // Cách 3: RevenueQueries.GrossRevenueAsync (dùng trong dashboard-kpis/business-overview/comparison).
        var viaHelper = await RevenueQueries.GrossRevenueAsync(db, start, end);

        viaExtension.Should().Be(expected);
        viaHelper.Should().Be(expected);
        viaHelper.Should().Be(viaExtension, "dashboard, sales report và Excel export phải ra cùng một con số cho cùng một kỳ");
    }
}
