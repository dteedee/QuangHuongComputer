using FluentAssertions;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace UnitTests.Domain.Sales;

/// <summary>
/// W0-4 verify — GET /api/sales/cart chiếu <c>InventoryItem.AvailableQuantity</c> trong một
/// projection EF. Thuộc tính đó KHÔNG được map (nó là <c>QuantityOnHand - ReservedQuantity</c>
/// tính trong C#), nên nếu EF không dịch/không client-eval được thì handler sẽ ném ở runtime —
/// và try/catch mới thêm sẽ NUỐT lỗi thành 500 "Không tải được giỏ hàng", tức là giỏ vẫn hỏng
/// nhưng im lặng. Test này dịch câu query bằng provider Npgsql thật (không kết nối DB).
/// </summary>
public class CartInventoryProjectionTranslationTests
{
    private static InventoryDbContext NewContext()
    {
        var options = new DbContextOptionsBuilder<InventoryDbContext>()
            .UseNpgsql("Host=localhost;Database=never-connected;Username=x;Password=x")
            .Options;
        return new InventoryDbContext(options);
    }

    [Fact]
    public void CartProjection_AvailableQuantity_DichDuocSangSql()
    {
        using var db = NewContext();
        var productIds = new List<Guid> { Guid.NewGuid() };

        var query = db.InventoryItems
            .AsNoTracking()
            .Where(i => productIds.Contains(i.ProductId))
            .Select(i => new { i.ProductId, i.VariantId, i.AvailableQuantity });

        var sql = query.ToQueryString();

        // EF phải kéo cả hai cột gốc về rồi tính hiệu ở client — nếu một cột thiếu thì
        // AvailableQuantity trả sai và giỏ hàng báo tồn kho sai.
        sql.Should().Contain("QuantityOnHand");
        sql.Should().Contain("ReservedQuantity");
    }

    /// <summary>
    /// W0-4 thêm <c>Cart.TaxAmount</c> / <c>Cart.EffectiveDiscountAmount</c> (get-only, tính từ
    /// DiscountAllocator). Bảng "Carts" KHÔNG có hai cột đó và wave 0 cấm migration — nếu EF map
    /// chúng theo convention thì MỌI truy vấn giỏ hàng sẽ lỗi "column c.TaxAmount does not exist",
    /// và try/catch mới ở GET /api/sales/cart sẽ che thành 500 chung chung.
    /// </summary>
    [Fact]
    public void Cart_ThuocTinhTinhToan_KhongDuocEfMapThanhCot()
    {
        var options = new DbContextOptionsBuilder<global::Sales.Infrastructure.SalesDbContext>()
            .UseNpgsql("Host=localhost;Database=never-connected;Username=x;Password=x")
            .Options;
        using var db = new global::Sales.Infrastructure.SalesDbContext(options);

        var cart = db.Model.FindEntityType(typeof(global::Sales.Domain.Cart))!;
        var mapped = cart.GetProperties().Select(p => p.Name).ToList();

        mapped.Should().NotContain("TaxAmount");
        mapped.Should().NotContain("EffectiveDiscountAmount");
        mapped.Should().NotContain("TotalAmount");
        mapped.Should().NotContain("SubtotalAmount");
        mapped.Should().Contain("DiscountAmount");
    }
}
