using System.Diagnostics;
using System.Net;
using System.Text.Json;
using BuildingBlocks.Contracts;
using Catalog.Infrastructure;
using FluentAssertions;
using IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Sales.Domain;
using Sales.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace IntegrationTests;

/// <summary>
/// "Thường được mua cùng" trên Postgres thật: câu GROUP BY của Sales phải dịch được sang SQL,
/// đơn huỷ không tính, endpoint công khai (không token) và rơi về "related" khi thiếu dữ liệu.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public sealed class BoughtTogetherTests
{
    private readonly IntegrationTestFixture _fixture;
    private readonly ITestOutputHelper _output;

    public BoughtTogetherTests(IntegrationTestFixture fixture, ITestOutputHelper output)
    {
        _fixture = fixture;
        _output = output;
    }

    [Fact(DisplayName = "Mua kèm: xếp theo số đơn chung, đơn huỷ không tính, khách vãng lai gọi được")]
    public async Task XepHangTheoDonChung_BoDonHuy()
    {
        var anchor = await PublishedProductAsync(20_000_000m);
        var mouse = await PublishedProductAsync(300_000m);
        var bag = await PublishedProductAsync(500_000m);
        var cancelledOnly = await PublishedProductAsync(100_000m);

        await SeedOrdersAsync(Deliver, 3, anchor, mouse);
        await SeedOrdersAsync(Deliver, 2, anchor, bag);
        await SeedOrdersAsync(o => o.Cancel("khách huỷ"), 5, anchor, cancelledOnly);

        using var client = _fixture.CreateClient(); // không đăng nhập
        var response = await client.GetAsync($"/api/catalog/products/{anchor}/bought-together?limit=6");
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.Should().Be(HttpStatusCode.OK, body);

        using var json = JsonDocument.Parse(body);
        json.RootElement.GetProperty("source").GetString().Should().Be("co-purchase");
        var items = json.RootElement.GetProperty("items").EnumerateArray()
            .Select(i => (i.GetProperty("product").GetProperty("id").GetGuid(), i.GetProperty("orderCount").GetInt32()))
            .ToList();
        items.Should().Equal((mouse, 3), (bag, 2));
        json.RootElement.GetProperty("total").GetDecimal().Should().Be(20_800_000m);

        // Bỏ chọn balo: tổng do server tính lại, danh sách gợi ý giữ nguyên.
        using var partial = JsonDocument.Parse(await client.GetStringAsync(
            $"/api/catalog/products/{anchor}/bought-together?limit=6&selected={mouse}"));
        partial.RootElement.GetProperty("total").GetDecimal().Should().Be(20_300_000m);
        partial.RootElement.GetProperty("items").GetArrayLength().Should().Be(2);
    }

    [Fact(DisplayName = "Mua kèm: chưa đủ dữ liệu thì rơi về sản phẩm cùng danh mục")]
    public async Task ThieuDuLieu_RoiVeRelated()
    {
        var anchor = await TestCatalogData.CreateProductWithStockAsync(_fixture, 1_000_000m, stock: 5);
        await PublishAsync(anchor.Id);
        var sibling = await SiblingProductAsync(anchor, 400_000m);
        var lonelyPair = await PublishedProductAsync(50_000m);
        await SeedOrdersAsync(Deliver, 1, anchor.Id, lonelyPair); // 1 đơn chung < ngưỡng 2 đơn

        using var client = _fixture.CreateClient();
        var body = await client.GetStringAsync($"/api/catalog/products/{anchor.Id}/bought-together");

        using var json = JsonDocument.Parse(body);
        json.RootElement.GetProperty("source").GetString().Should().Be("related");
        var items = json.RootElement.GetProperty("items").EnumerateArray().ToList();
        items.Select(i => i.GetProperty("product").GetProperty("id").GetGuid()).Should().Equal(sibling);
        items.Should().OnlyContain(i => i.GetProperty("orderCount").GetInt32() == 0);
        json.RootElement.GetProperty("total").GetDecimal().Should().Be(1_400_000m);
    }

    [Fact(DisplayName = "Mua kèm: một câu truy vấn trên 100k dòng đơn vẫn dưới 1 giây")]
    public async Task HieuNang_100kDongDon()
    {
        var anchor = Guid.NewGuid();
        var pool = Enumerable.Range(0, 400).Select(_ => Guid.NewGuid()).ToArray();
        var random = new Random(42);

        // 5 000 đơn × 20 dòng = 100 000 dòng; 1/10 số đơn có sản phẩm gốc. Ít đơn, nhiều dòng:
        // OrderNumber chỉ lấy 8 ký tự hex của Id nên 5k đơn giữ xác suất trùng ở mức không đáng kể.
        for (var batch = 0; batch < 5; batch++)
        {
            using var scope = _fixture.CreateScope();
            var sales = scope.ServiceProvider.GetRequiredService<SalesDbContext>();
            sales.ChangeTracker.AutoDetectChangesEnabled = false;
            for (var n = 0; n < 1_000; n++)
            {
                var products = pool.OrderBy(_ => random.Next()).Take(20).ToList();
                if (n % 10 == 0) products[0] = anchor;
                var order = NewOrder(products);
                Deliver(order);
                sales.Orders.Add(order);
            }
            await sales.SaveChangesAsync();
        }

        using (var scope = _fixture.CreateScope())
        {
            var query = scope.ServiceProvider.GetRequiredService<ICoPurchaseQuery>();
            await query.GetCoPurchasedAsync(anchor, TimeSpan.FromDays(180), 2, 48); // làm nóng

            var watch = Stopwatch.StartNew();
            var rows = await query.GetCoPurchasedAsync(anchor, TimeSpan.FromDays(180), 2, 48);
            watch.Stop();
            _output.WriteLine($"co-purchase trên 100k dòng: {watch.ElapsedMilliseconds} ms, {rows.Count} kết quả");

            rows.Should().NotBeEmpty();
            rows.Select(r => r.OrderCount).Should().BeInDescendingOrder();
            watch.ElapsedMilliseconds.Should().BeLessThan(1_000);
        }
    }

    private async Task<Guid> PublishedProductAsync(decimal price)
    {
        var product = await TestCatalogData.CreateProductWithStockAsync(_fixture, price, stock: 10);
        await PublishAsync(product.Id);
        return product.Id;
    }

    private async Task PublishAsync(Guid productId)
    {
        using var scope = _fixture.CreateScope();
        var catalog = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
        var entity = await catalog.Products.FirstAsync(p => p.Id == productId);
        entity.Publish();
        await catalog.SaveChangesAsync();
    }

    /// <summary>Sản phẩm đã đăng, còn hàng, CÙNG danh mục với <paramref name="anchor"/>.</summary>
    private async Task<Guid> SiblingProductAsync(TestProduct anchor, decimal price)
    {
        using var scope = _fixture.CreateScope();
        var catalog = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
        var product = new Catalog.Domain.Product(
            $"Cùng danh mục {Guid.NewGuid():N}"[..24], price, price / 2, "", anchor.CategoryId, anchor.BrandId,
            stockQuantity: 3, sku: $"IT-S-{Guid.NewGuid():N}"[..14]);
        product.Publish();
        catalog.Products.Add(product);
        await catalog.SaveChangesAsync();
        return product.Id;
    }

    private async Task SeedOrdersAsync(Action<Order> advance, int count, params Guid[] products)
    {
        using var scope = _fixture.CreateScope();
        var sales = scope.ServiceProvider.GetRequiredService<SalesDbContext>();
        for (var i = 0; i < count; i++)
        {
            var order = NewOrder(products);
            advance(order);
            sales.Orders.Add(order);
        }
        await sales.SaveChangesAsync();
    }

    private static Order NewOrder(IEnumerable<Guid> products) => new(
        Guid.NewGuid(), "Vĩnh Bảo, Hải Phòng",
        products.Select((p, i) => new OrderItem(p, "SP kiểm thử", 100_000m, 1, sequence: i)).ToList());

    private static void Deliver(Order o)
    {
        o.Confirm();
        o.MarkAsPaid("pay");
        o.MarkAsShipped("GHN-1", "GHN");
        o.MarkAsDelivered();
    }
}
