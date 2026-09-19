using Catalog.Domain;
using Catalog.Infrastructure;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace IntegrationTests.Infrastructure;

/// <summary>Sản phẩm do test tự tạo, kèm tồn kho — không phụ thuộc dữ liệu seed sẵn.</summary>
public sealed record TestProduct(Guid Id, string Sku, decimal Price, Guid CategoryId, Guid BrandId);

/// <summary>
/// Dữ liệu danh mục cho test nghiệp vụ. Mỗi test tự tạo sản phẩm riêng (tên/SKU ngẫu nhiên)
/// để không test nào phụ thuộc thứ tự chạy hay dữ liệu của test khác.
/// </summary>
public static class TestCatalogData
{
    /// <summary>Tạo danh mục + thương hiệu + sản phẩm giá <paramref name="price"/> và nhập kho chính.</summary>
    public static async Task<TestProduct> CreateProductWithStockAsync(
        IntegrationTestFixture fixture, decimal price, int stock)
    {
        using var scope = fixture.CreateScope();
        var catalog = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
        var inventory = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var category = new Category($"Danh mục kiểm thử {suffix}", "Tạo bởi test tích hợp");
        var brand = new Brand($"Thương hiệu kiểm thử {suffix}", "Tạo bởi test tích hợp");
        catalog.Categories.Add(category);
        catalog.Brands.Add(brand);
        await catalog.SaveChangesAsync();

        var product = new Product(
            name: $"Sản phẩm kiểm thử {suffix}",
            price: price,
            costPrice: price / 2m,
            description: "Sản phẩm do test tích hợp tạo ra",
            categoryId: category.Id,
            brandId: brand.Id,
            stockQuantity: stock,
            sku: $"IT-{suffix}");
        catalog.Products.Add(product);
        await catalog.SaveChangesAsync();

        inventory.InventoryItems.Add(new InventoryItem(
            productId: product.Id,
            initialQuantity: stock,
            reorderLevel: 0,
            warehouseId: InventoryModule.Infrastructure.Seed.WarehouseSeeder.MainId));
        await inventory.SaveChangesAsync();

        return new TestProduct(product.Id, product.Sku, price, category.Id, brand.Id);
    }
}
