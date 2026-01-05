using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Infrastructure.Data;

public static class CatalogDbSeeder
{
    public static async Task SeedAsync(CatalogDbContext context)
    {
        if (await context.Products.AnyAsync()) return;

        var categories = new List<Category>
        {
            new Category("Laptops", "laptops"),
            new Category("Monitors", "monitors"),
            new Category("Accessories", "accessories")
        };

        var brands = new List<Brand>
        {
            new Brand("Dell", "Dell Inc."),
            new Brand("Apple", "Apple Inc."),
            new Brand("Logitech", "Logitech International")
        };

        await context.Categories.AddRangeAsync(categories);
        await context.Brands.AddRangeAsync(brands);
        await context.SaveChangesAsync();

        var products = new List<Product>
        {
            new Product("Dell XPS 15", 2500, "High-end laptop", categories[0].Id, brands[0].Id, 10),
            new Product("MacBook Pro M3", 3000, "Apple flagship laptop", categories[0].Id, brands[1].Id, 5),
            new Product("UltraSharp 27 Monitor", 600, "4K Monitor", categories[1].Id, brands[0].Id, 15),
            new Product("MX Master 3S", 100, "Ergonomic mouse", categories[2].Id, brands[2].Id, 50)
        };

        await context.Products.AddRangeAsync(products);
        await context.SaveChangesAsync();
    }
}
