using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Sales.Application.Orders;
using Sales.Domain;
using Sales.Infrastructure;
using Xunit;

namespace UnitTests.Domain.Sales;

/// <summary>
/// "Thường được mua cùng" — số đếm cặp sản phẩm cùng đơn (ICoPurchaseQuery trong Sales).
/// Xếp hạng theo số đơn chung; đơn huỷ/chưa giao/quá 180 ngày không tính; quà tặng không tính.
/// </summary>
public class CoPurchaseQueryTests : IDisposable
{
    private static readonly TimeSpan Window = TimeSpan.FromDays(180);

    private readonly SalesDbContext _db = new(new DbContextOptionsBuilder<SalesDbContext>()
        .UseInMemoryDatabase("co-purchase-" + Guid.NewGuid()).Options);

    private readonly Guid _anchor = Guid.NewGuid();

    public void Dispose() => _db.Dispose();

    private CoPurchaseQuery Query() => new(_db);

    private async Task SeedAsync(Action<Order> advance, params Guid[] products) =>
        await SeedAsync(advance, OrderChannels.Web, null, products);

    private async Task SeedAsync(Action<Order> advance, string channel, DateTime? orderDate, params Guid[] products)
    {
        var items = products.Select(p => new OrderItem(p, "SP", 1_000_000m, 1)).ToList();
        var order = new Order(Guid.NewGuid(), "HP", items, channel: channel);
        advance(order);
        _db.Orders.Add(order);
        if (orderDate.HasValue) _db.Entry(order).Property(o => o.OrderDate).CurrentValue = orderDate.Value;
        await _db.SaveChangesAsync();
    }

    private static void Deliver(Order o)
    {
        o.Confirm();
        o.MarkAsPaid("pay");
        o.MarkAsShipped("GHN-1", "GHN");
        o.MarkAsDelivered();
    }

    [Fact]
    public async Task XepHangTheoSoDonChung_GiamDan()
    {
        var mouse = Guid.NewGuid();
        var bag = Guid.NewGuid();
        var ram = Guid.NewGuid();
        await SeedAsync(Deliver, _anchor, mouse, bag);
        await SeedAsync(Deliver, _anchor, mouse, ram);
        await SeedAsync(Deliver, _anchor, mouse, bag);
        await SeedAsync(Deliver, mouse, ram, ram); // không chứa sản phẩm gốc — không tính

        var result = await Query().GetCoPurchasedAsync(_anchor, Window, 1, 10);

        result.Select(r => (r.ProductId, r.OrderCount)).Should().Equal((mouse, 3), (bag, 2), (ram, 1));
    }

    [Fact]
    public async Task DonHuy_VaDonChuaGiao_KhongTinh()
    {
        var mouse = Guid.NewGuid();
        await SeedAsync(o => o.Cancel("khách huỷ"), _anchor, mouse);
        await SeedAsync(o => { o.Confirm(); o.MarkAsPaid("pay"); }, _anchor, mouse);
        await SeedAsync(o => { o.Confirm(); o.MarkAsPaid("pay"); o.MarkAsShipped("X", "GHN"); }, _anchor, mouse);

        (await Query().GetCoPurchasedAsync(_anchor, Window, 1, 10)).Should().BeEmpty();
    }

    [Fact]
    public async Task DonPosDaBanGiaoTaiQuay_DuocTinh()
    {
        var mouse = Guid.NewGuid();
        await SeedAsync(o => { o.Confirm(); o.MarkAsFulfilled(); }, OrderChannels.Pos, null, _anchor, mouse);
        // Cùng trạng thái nhưng đơn web (đã xuất kho, chưa giao tới khách) thì chưa tính.
        await SeedAsync(o => { o.Confirm(); o.MarkAsFulfilled(); }, OrderChannels.Web, null, _anchor, Guid.NewGuid());

        var result = await Query().GetCoPurchasedAsync(_anchor, Window, 1, 10);

        result.Should().ContainSingle().Which.Should().Be(new BuildingBlocks.Contracts.CoPurchaseCount(mouse, 1));
    }

    [Fact]
    public async Task DonQua180Ngay_KhongTinh()
    {
        var mouse = Guid.NewGuid();
        await SeedAsync(Deliver, OrderChannels.Web, DateTime.UtcNow.AddDays(-181), _anchor, mouse);

        (await Query().GetCoPurchasedAsync(_anchor, Window, 1, 10)).Should().BeEmpty();
    }

    [Fact]
    public async Task DuoiNguongSoDon_BiLoai_VaTakeGioiHanKetQua()
    {
        var mouse = Guid.NewGuid();
        var bag = Guid.NewGuid();
        var pad = Guid.NewGuid();
        await SeedAsync(Deliver, _anchor, mouse, bag);
        await SeedAsync(Deliver, _anchor, mouse, bag);
        await SeedAsync(Deliver, _anchor, mouse, pad);

        var result = await Query().GetCoPurchasedAsync(_anchor, Window, minOrders: 2, take: 1);

        result.Should().ContainSingle().Which.ProductId.Should().Be(mouse);
    }

    [Fact]
    public async Task HaiDongCungSanPhamTrongMotDon_DemMotDon()
    {
        var mouse = Guid.NewGuid();
        await SeedAsync(Deliver, _anchor, mouse, mouse);

        var result = await Query().GetCoPurchasedAsync(_anchor, Window, 1, 10);

        result.Should().ContainSingle().Which.OrderCount.Should().Be(1);
    }

    [Fact]
    public async Task DongQuaTang_KhongTinh()
    {
        var gift = Guid.NewGuid();
        var order = new Order(Guid.NewGuid(), "HP", new List<OrderItem>
        {
            new(_anchor, "Laptop", 20_000_000m, 1),
            new(gift, "Balo tặng", 0m, 1, isGift: true),
        });
        Deliver(order);
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        (await Query().GetCoPurchasedAsync(_anchor, Window, 1, 10)).Should().BeEmpty();
    }

    [Fact]
    public async Task SanPhamRong_TraRong()
    {
        (await Query().GetCoPurchasedAsync(Guid.Empty, Window, 1, 10)).Should().BeEmpty();
    }
}
