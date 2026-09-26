using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Sales.Application.Orders;
using Sales.Domain;
using Sales.Infrastructure;
using Xunit;

namespace UnitTests.Domain.Sales;

/// <summary>
/// Huy hiệu "đã mua hàng" trên đánh giá do SERVER quyết (IPurchaseVerificationQuery trong Sales),
/// không còn đọc header X-Verified-Purchase từ client. Chỉ đơn đã giao / hoàn tất chứa đúng sản
/// phẩm, của đúng khách, mới tính.
/// </summary>
public class PurchaseVerificationQueryTests : IDisposable
{
    private readonly SalesDbContext _db = new(new DbContextOptionsBuilder<SalesDbContext>()
        .UseInMemoryDatabase("purchase-verify-" + Guid.NewGuid()).Options);

    public void Dispose() => _db.Dispose();

    private PurchaseVerificationQuery Query() => new(_db);

    private async Task<Order> SeedOrderAsync(Guid customerId, Guid productId, Action<Order> advance)
    {
        var item = new OrderItem(productId, "Laptop A", 10_000_000m, 1, "SKU-A");
        var order = new Order(customerId, "HN", new List<OrderItem> { item });
        advance(order);
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();
        return order;
    }

    private static void Deliver(Order o)
    {
        o.Confirm();
        o.MarkAsPaid("pay");
        o.MarkAsShipped("GHN-1", "GHN");
        o.MarkAsDelivered();
    }

    [Fact]
    public async Task DonDaGiaoCoSanPham_ThiLaDaMua()
    {
        var customer = Guid.NewGuid();
        var product = Guid.NewGuid();
        await SeedOrderAsync(customer, product, Deliver);

        (await Query().HasReceivedProductAsync(customer.ToString(), product)).Should().BeTrue();
    }

    [Fact]
    public async Task DonMoiThanhToanChuaGiao_ThiChuaTinh()
    {
        var customer = Guid.NewGuid();
        var product = Guid.NewGuid();
        await SeedOrderAsync(customer, product, o => { o.Confirm(); o.MarkAsPaid("pay"); });

        (await Query().HasReceivedProductAsync(customer.ToString(), product)).Should().BeFalse();
    }

    [Fact]
    public async Task DonChoXuLy_ThiChuaTinh()
    {
        var customer = Guid.NewGuid();
        var product = Guid.NewGuid();
        await SeedOrderAsync(customer, product, _ => { });

        (await Query().HasReceivedProductAsync(customer.ToString(), product)).Should().BeFalse();
    }

    [Fact]
    public async Task DonCuaKhachKhac_ThiKhongTinh()
    {
        var product = Guid.NewGuid();
        await SeedOrderAsync(Guid.NewGuid(), product, Deliver);

        (await Query().HasReceivedProductAsync(Guid.NewGuid().ToString(), product)).Should().BeFalse();
    }

    [Fact]
    public async Task DonDaGiaoNhungSanPhamKhac_ThiKhongTinh()
    {
        var customer = Guid.NewGuid();
        await SeedOrderAsync(customer, Guid.NewGuid(), Deliver);

        (await Query().HasReceivedProductAsync(customer.ToString(), Guid.NewGuid())).Should().BeFalse();
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-a-guid")]
    public async Task UserIdKhongHopLe_ThiFailClosed(string userId)
    {
        var product = Guid.NewGuid();
        await SeedOrderAsync(Guid.NewGuid(), product, Deliver);

        (await Query().HasReceivedProductAsync(userId, product)).Should().BeFalse();
    }
}
