using Catalog.Domain;
using Catalog.Infrastructure;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace IntegrationTests.Infrastructure;

/// <summary>Một cảnh chuyển kho: sản phẩm theo dõi serial, tồn ở kho chính, và một kho nhận mới.</summary>
public sealed record TransferScene(
    Guid ProductId, Guid SourceItemId, Guid FromWarehouseId, Guid ToWarehouseId,
    IReadOnlyList<string> Serials, decimal UnitCost);

public static class TestTransferData
{
    /// <summary>
    /// Danh mục bật <c>IsSerialTracked</c>, sản phẩm có <paramref name="quantity"/> máy ở kho chính
    /// (giá vốn <paramref name="unitCost"/>), mỗi máy một serial InStock, cộng một kho chi nhánh trống.
    /// </summary>
    public static async Task<TransferScene> CreateAsync(
        IntegrationTestFixture fixture, int quantity, decimal unitCost = 5_000_000m, bool serialTracked = true)
    {
        using var scope = fixture.CreateScope();
        var catalog = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
        var inventory = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        var category = new Category($"Danh mục chuyển kho {suffix}", "test");
        category.UpdatePolicy(isSerialTracked: serialTracked);
        var brand = new Brand($"Hãng chuyển kho {suffix}", "test");
        catalog.Categories.Add(category);
        catalog.Brands.Add(brand);
        await catalog.SaveChangesAsync();

        var product = new Product($"Máy chuyển kho {suffix}", 9_000_000m, unitCost, "test",
            category.Id, brand.Id, quantity, sku: $"CK-{suffix}");
        catalog.Products.Add(product);
        await catalog.SaveChangesAsync();

        var from = InventoryModule.Infrastructure.Seed.WarehouseSeeder.MainId;
        var to = new Warehouse($"CN-{suffix}", $"Chi nhánh {suffix}", WarehouseType.Branch);
        inventory.Warehouses.Add(to);

        var item = new InventoryItem(product.Id, quantity, reorderLevel: 0, warehouseId: from, averageCost: unitCost);
        inventory.InventoryItems.Add(item);

        var serials = new List<string>();
        if (serialTracked)
        {
            for (var i = 0; i < quantity; i++)
            {
                var serial = $"SN-{suffix}-{i}";
                serials.Add(serial);
                inventory.SerialNumbers.Add(new SerialNumber(serial, product.Id, from, productName: product.Name));
            }
        }
        await inventory.SaveChangesAsync();

        return new TransferScene(product.Id, item.Id, from, to.Id, serials, unitCost);
    }
}
