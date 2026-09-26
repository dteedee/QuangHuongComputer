using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BuildingBlocks.Security;
using Catalog.Domain;
using Catalog.Infrastructure;
using FluentAssertions;
using IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Sales.Infrastructure;
using Xunit;

namespace IntegrationTests;

/// <summary>
/// Combo "Laptop + chuột" chốt qua ApiGateway thật + Postgres thật: giá combo do SERVER tính,
/// giảm combo nằm ở LineDiscount của từng dòng, VAT theo dòng cộng lại khớp tổng, và bỏ một món
/// thì combo vỡ, giá về giá lẻ.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public sealed class BundleCheckoutTests
{
    private const decimal LaptopPrice = 20_000_000m;
    private const decimal MousePrice = 500_000m;
    private const decimal ComboPrice = 19_900_000m;

    private readonly IntegrationTestFixture _fixture;

    public BundleCheckoutTests(IntegrationTestFixture fixture) => _fixture = fixture;

    [Fact(DisplayName = "Checkout combo: tổng đơn = giá combo, giảm chia về dòng, VAT theo dòng khớp")]
    public async Task Checkout_Combo_TongTienDung()
    {
        var (bundleId, laptop, mouse) = await CreateComboAsync();
        var customer = await TestAuthentication.CreateAccountAsync(_fixture, Roles.Customer);
        using var client = TestAuthentication.ClientFor(_fixture, customer);

        var add = await client.PostAsJsonAsync("/api/sales/cart/bundles", new { bundleId, quantity = 1 });
        add.StatusCode.Should().Be(HttpStatusCode.OK, await add.Content.ReadAsStringAsync());

        using var cart = JsonDocument.Parse(await client.GetStringAsync("/api/sales/cart"));
        cart.RootElement.GetProperty("totalAmount").GetDecimal().Should().Be(ComboPrice);
        cart.RootElement.GetProperty("discountAmount").GetDecimal().Should().Be(LaptopPrice + MousePrice - ComboPrice);
        cart.RootElement.GetProperty("bundles")[0].GetProperty("isApplied").GetBoolean().Should().BeTrue();
        var cartId = cart.RootElement.GetProperty("id").GetGuid();

        var checkout = await client.PostAsJsonAsync("/api/sales/checkout/orchestrate", new
        {
            cartId,
            shipping = new
            {
                recipientName = "Nguyễn Văn Combo", phone = "0901234567",
                streetAddress = "12 Nguyễn Trãi", ward = "Phường 1", district = "Quận 1", province = "TP.HCM",
                shippingFee = 0m, isPickup = true,
            },
            paymentMethod = "COD",
        });
        var body = await checkout.Content.ReadAsStringAsync();
        checkout.StatusCode.Should().Be(HttpStatusCode.OK, body);

        using var json = JsonDocument.Parse(body);
        var orderId = json.RootElement.GetProperty("orderId").GetGuid();
        using var scope = _fixture.CreateScope();
        var sales = scope.ServiceProvider.GetRequiredService<SalesDbContext>();
        var order = await sales.Orders.AsNoTracking().Include(o => o.Items).FirstAsync(o => o.Id == orderId);

        order.SubtotalAmount.Should().Be(LaptopPrice + MousePrice);
        order.TotalAmount.Should().Be(ComboPrice, "khách trả đúng giá combo (nhận tại cửa hàng, không phí ship)");
        order.DiscountAmount.Should().Be(LaptopPrice + MousePrice - ComboPrice);
        order.Items.Should().HaveCount(2).And.OnlyContain(i => i.BundleId == bundleId);
        order.Items.Sum(i => i.LineDiscount).Should().Be(LaptopPrice + MousePrice - ComboPrice);
        order.Items.Should().OnlyContain(i => i.AllocatedOrderDiscount == 0m);
        order.Items.Sum(i => i.LineTotal).Should().Be(order.TotalAmount);
        order.TaxAmount.Should().Be(order.Items.Sum(i => i.VatAmount), "VAT theo dòng cộng lại đúng thuế của đơn");
        order.Items.Single(i => i.ProductId == laptop).LineDiscount.Should().BeGreaterThan(
            order.Items.Single(i => i.ProductId == mouse).LineDiscount, "giảm chia theo tỉ lệ giá");
    }

    [Fact(DisplayName = "Giỏ combo: bỏ một món thì combo vỡ, giá các món còn lại về giá lẻ")]
    public async Task BoMotMon_ComboVo_GiaVeGiaLe()
    {
        var (bundleId, _, mouse) = await CreateComboAsync();
        var customer = await TestAuthentication.CreateAccountAsync(_fixture, Roles.Customer);
        using var client = TestAuthentication.ClientFor(_fixture, customer);

        (await client.PostAsJsonAsync("/api/sales/cart/bundles", new { bundleId, quantity = 1 }))
            .StatusCode.Should().Be(HttpStatusCode.OK);
        (await client.DeleteAsync($"/api/sales/cart/bundles/{bundleId}/items/{mouse}"))
            .StatusCode.Should().Be(HttpStatusCode.OK);

        using var cart = JsonDocument.Parse(await client.GetStringAsync("/api/sales/cart"));
        cart.RootElement.GetProperty("totalAmount").GetDecimal().Should().Be(LaptopPrice);
        cart.RootElement.GetProperty("discountAmount").GetDecimal().Should().Be(0m);
        cart.RootElement.GetProperty("items")[0].GetProperty("bundleId").ValueKind.Should().Be(JsonValueKind.Null);
    }

    private async Task<(Guid BundleId, Guid Laptop, Guid Mouse)> CreateComboAsync()
    {
        var laptop = await TestCatalogData.CreateProductWithStockAsync(_fixture, LaptopPrice, stock: 5);
        var mouse = await TestCatalogData.CreateProductWithStockAsync(_fixture, MousePrice, stock: 5);

        using var scope = _fixture.CreateScope();
        var catalog = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
        await PublishAsync(catalog, laptop.Id, mouse.Id);

        var bundle = new ProductBundle("Combo kiểm thử", "Laptop + chuột", ComboPrice, LaptopPrice + MousePrice, null,
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(7));
        bundle.AddItem(laptop.Id, true, 1, LaptopPrice);
        bundle.AddItem(mouse.Id, false, 1, MousePrice);
        catalog.ProductBundles.Add(bundle);
        await catalog.SaveChangesAsync();
        return (bundle.Id, laptop.Id, mouse.Id);
    }

    /// <summary>Combo chỉ bán món đã đăng web — đưa sản phẩm test về trạng thái công khai.</summary>
    private static async Task PublishAsync(CatalogDbContext catalog, params Guid[] ids)
    {
        var productIds = ids.ToList(); // List, không phải mảng: tránh overload Span của Contains
        var products = await catalog.Products.IgnoreQueryFilters().Where(p => productIds.Contains(p.Id)).ToListAsync();
        foreach (var product in products) product.Publish();
        await catalog.SaveChangesAsync();
    }
}
