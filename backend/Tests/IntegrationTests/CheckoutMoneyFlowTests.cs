using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BuildingBlocks.Security;
using FluentAssertions;
using IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Sales.Infrastructure;
using Xunit;

namespace IntegrationTests;

/// <summary>
/// Tiền của đơn hàng phải do SERVER quyết định.
///
/// Lỗi thật đã xảy ra: khách POST đơn giá 0đ cho hàng 27 triệu, và khách gửi kèm
/// <c>manualDiscount</c> của luồng nhân viên để tự giảm giá về 0đ. Hai test dưới đây
/// đỏ ngay nếu một trong hai lỗ đó mở lại.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public sealed class CheckoutMoneyFlowTests
{
    private const decimal ProductPrice = 27_000_000m;

    private readonly IntegrationTestFixture _fixture;

    public CheckoutMoneyFlowTests(IntegrationTestFixture fixture) => _fixture = fixture;

    [Fact(DisplayName = "Checkout: đơn giá client gửi lên bị bỏ qua, đơn lưu theo giá trong CSDL")]
    public async Task Checkout_BoQuaDonGiaClientGuiLen()
    {
        var product = await TestCatalogData.CreateProductWithStockAsync(_fixture, ProductPrice, stock: 5);
        var customer = await TestAuthentication.CreateAccountAsync(_fixture, Roles.Customer);
        using var client = TestAuthentication.ClientFor(_fixture, customer);

        var response = await client.PostAsJsonAsync("/api/sales/checkout", new
        {
            items = new[]
            {
                new { productId = product.Id, productName = "Sản phẩm kiểm thử", unitPrice = 1m, quantity = 1 },
            },
            shippingAddress = "12 Nguyễn Trãi, Quận 1, TP.HCM",
            recipientName = "Nguyễn Văn Kiểm Thử",
            recipientPhone = "0901234567",
            paymentMethod = "COD",
            // Ba field chỉ dành cho nhân viên — khách gửi lên thì phải bị bỏ qua hoàn toàn.
            manualDiscount = ProductPrice,
            shippingFee = 0m,
            customerId = Guid.NewGuid(),
        });

        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.Should().Be(HttpStatusCode.OK, $"checkout phải thành công. Phản hồi: {body}");

        var orderId = ReadOrderId(body);
        using var scope = _fixture.CreateScope();
        var sales = scope.ServiceProvider.GetRequiredService<SalesDbContext>();
        var order = await sales.Orders.AsNoTracking().FirstAsync(o => o.Id == orderId);

        order.SubtotalAmount.Should().Be(ProductPrice,
            "giá bán phải đọc từ Catalog tại thời điểm chốt đơn, không lấy unitPrice của client");
        order.DiscountAmount.Should().Be(0m,
            "khách không được phép tự áp giảm giá thủ công (manualDiscount là field của luồng nhân viên)");
        order.TotalAmount.Should().BeGreaterThanOrEqualTo(ProductPrice,
            "tổng tiền không bao giờ được thấp hơn giá hàng khi không có khuyến mãi nào");
        order.CustomerId.Should().Be(Guid.Parse(customer.UserId),
            "đơn phải gắn với người đang đăng nhập, không gắn theo customerId client gửi lên");
    }

    [Fact(DisplayName = "Checkout: đặt số lượng vượt tồn kho bị từ chối và không tạo đơn nào")]
    public async Task Checkout_VuotTonKho_BiTuChoi()
    {
        var product = await TestCatalogData.CreateProductWithStockAsync(_fixture, 1_500_000m, stock: 2);
        var customer = await TestAuthentication.CreateAccountAsync(_fixture, Roles.Customer);
        using var client = TestAuthentication.ClientFor(_fixture, customer);

        var response = await client.PostAsJsonAsync("/api/sales/checkout", new
        {
            items = new[]
            {
                new { productId = product.Id, productName = "Sản phẩm kiểm thử", unitPrice = 1_500_000m, quantity = 99 },
            },
            shippingAddress = "12 Nguyễn Trãi, Quận 1, TP.HCM",
            recipientName = "Nguyễn Văn Kiểm Thử",
            recipientPhone = "0901234567",
            paymentMethod = "COD",
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest, "không đủ hàng thì không được tạo đơn");

        using var scope = _fixture.CreateScope();
        var sales = scope.ServiceProvider.GetRequiredService<SalesDbContext>();
        var customerId = Guid.Parse(customer.UserId);
        (await sales.Orders.AsNoTracking().CountAsync(o => o.CustomerId == customerId))
            .Should().Be(0, "checkout hỏng phải rollback sạch: không còn dòng đơn nào");

        var inventory = scope.ServiceProvider.GetRequiredService<InventoryModule.Infrastructure.InventoryDbContext>();
        var item = await inventory.InventoryItems.AsNoTracking().FirstAsync(i => i.ProductId == product.Id);
        item.ReservedQuantity.Should().Be(0, "giữ chỗ tồn kho phải được nhả hết khi chốt đơn thất bại");
        item.QuantityOnHand.Should().Be(2, "tồn kho không được thay đổi khi đơn không được tạo");
    }

    [Fact(DisplayName = "Checkout: khách không chốt được giỏ hàng của người khác (IDOR trên cartId)")]
    public async Task Checkout_KhongChotDuocGioNguoiKhac()
    {
        var product = await TestCatalogData.CreateProductWithStockAsync(_fixture, 2_000_000m, stock: 5);
        var victim = await TestAuthentication.CreateAccountAsync(_fixture, Roles.Customer);
        var attacker = await TestAuthentication.CreateAccountAsync(_fixture, Roles.Customer);
        var victimId = Guid.Parse(victim.UserId);
        var attackerId = Guid.Parse(attacker.UserId);

        Guid victimCartId;
        using (var seedScope = _fixture.CreateScope())
        {
            var db = seedScope.ServiceProvider.GetRequiredService<SalesDbContext>();
            var cart = new Sales.Domain.Cart(victimId);
            cart.AddItem(product.Id, "Sản phẩm kiểm thử", 2_000_000m, 1);
            db.Carts.Add(cart);
            await db.SaveChangesAsync();
            victimCartId = cart.Id;
        }

        // Kẻ tấn công biết cartId của nạn nhân và gọi thẳng endpoint nhận cartId từ client.
        using var client = TestAuthentication.ClientFor(_fixture, attacker);
        var response = await client.PostAsJsonAsync("/api/sales/checkout/orchestrate", new
        {
            cartId = victimCartId,
            shipping = new
            {
                recipientName = "Kẻ tấn công",
                phone = "0907654321",
                streetAddress = "1 Đường Nào Đó",
                ward = "Phường 1",
                district = "Quận 1",
                province = "TP.HCM",
                shippingFee = 0m,
            },
            paymentMethod = "COD",
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            "giỏ hàng của người khác không bao giờ được chốt thành đơn của mình");

        using var scope = _fixture.CreateScope();
        var sales = scope.ServiceProvider.GetRequiredService<SalesDbContext>();
        (await sales.Orders.AsNoTracking().CountAsync(o => o.CustomerId == attackerId))
            .Should().Be(0, "không được sinh đơn nào cho kẻ tấn công");
        (await sales.Orders.AsNoTracking().CountAsync(o => o.CustomerId == victimId))
            .Should().Be(0, "cũng không được âm thầm tạo đơn cho nạn nhân");

        var cartAfter = await sales.Carts.AsNoTracking().Include(c => c.Items)
            .FirstAsync(c => c.Id == victimCartId);
        cartAfter.Items.Should().HaveCount(1, "giỏ của nạn nhân phải còn nguyên");
    }

    private static Guid ReadOrderId(string body)
    {
        using var json = JsonDocument.Parse(body);
        foreach (var name in new[] { "orderId", "id" })
        {
            if (json.RootElement.TryGetProperty(name, out var value) && value.TryGetGuid(out var id)) return id;
        }

        throw new InvalidOperationException($"Phản hồi checkout không có mã đơn: {body}");
    }
}
