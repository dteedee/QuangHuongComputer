using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Catalog.Infrastructure;
using Catalog.Domain;

namespace Catalog;

public static class CatalogEndpoints
{
    public static void MapCatalogEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/catalog");

        group.MapGet("/products", async (CatalogDbContext db, int page = 1, int pageSize = 20, Guid? categoryId = null, Guid? brandId = null, string? search = null) =>
        {
            var query = db.Products.AsQueryable();

            if (categoryId.HasValue)
                query = query.Where(p => p.CategoryId == categoryId.Value);

            if (brandId.HasValue)
                query = query.Where(p => p.BrandId == brandId.Value);

            if (!string.IsNullOrEmpty(search))
                query = query.Where(p => p.Name.Contains(search) || p.Description.Contains(search));

            var total = await query.CountAsync();
            var products = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Results.Ok(new
            {
                Total = total,
                Page = page,
                PageSize = pageSize,
                Products = products
            });
        });

        group.MapGet("/products/{id:guid}", async (Guid id, CatalogDbContext db) =>
        {
            return await db.Products.FindAsync(id) is Product product 
                ? Results.Ok(product) 
                : Results.NotFound(new { Error = "Product not found" });
        });

        group.MapGet("/categories", async (CatalogDbContext db) =>
        {
            return await db.Categories.ToListAsync();
        });

        group.MapGet("/brands", async (CatalogDbContext db) =>
        {
            return await db.Brands.ToListAsync();
        });

        // Advanced Search & Filter
        group.MapGet("/products/search", async (
            string? query,
            Guid? categoryId,
            Guid? brandId,
            decimal? minPrice,
            decimal? maxPrice,
            bool? inStock,
            CatalogDbContext db) =>
        {
            var productsQuery = db.Products.AsQueryable();

            if (!string.IsNullOrWhiteSpace(query))
            {
                productsQuery = productsQuery.Where(p => 
                    p.Name.Contains(query) || 
                    p.Description.Contains(query));
            }

            if (categoryId.HasValue)
            {
                productsQuery = productsQuery.Where(p => p.CategoryId == categoryId.Value);
            }

            if (brandId.HasValue)
            {
                productsQuery = productsQuery.Where(p => p.BrandId == brandId.Value);
            }

            if (minPrice.HasValue)
            {
                productsQuery = productsQuery.Where(p => p.Price >= minPrice.Value);
            }

            if (maxPrice.HasValue)
            {
                productsQuery = productsQuery.Where(p => p.Price <= maxPrice.Value);
            }

            if (inStock.HasValue && inStock.Value)
            {
                productsQuery = productsQuery.Where(p => p.StockQuantity > 0);
            }

            var products = await productsQuery.ToListAsync();
            return Results.Ok(products);
        });

        // Create Product (Admin only)
        group.MapPost("/products", async (CreateProductDto model, CatalogDbContext db) =>
        {
            var product = new Product(
                model.Name,
                model.Price,
                model.Description,
                model.CategoryId,
                model.BrandId,
                model.StockQuantity
            );

            db.Products.Add(product);
            await db.SaveChangesAsync();
            return Results.Created($"/api/catalog/products/{product.Id}", product);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Create Category
        group.MapPost("/categories", async (CreateCategoryDto model, CatalogDbContext db) =>
        {
            var category = new Category(model.Name, model.Description);
            db.Categories.Add(category);
            await db.SaveChangesAsync();
            return Results.Created($"/api/catalog/categories/{category.Id}", category);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Create Brand
        group.MapPost("/brands", async (CreateBrandDto model, CatalogDbContext db) =>
        {
            var brand = new Brand(model.Name, model.Description);
            db.Brands.Add(brand);
            await db.SaveChangesAsync();
            return Results.Created($"/api/catalog/brands/{brand.Id}", brand);
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Update Product
        group.MapPut("/products/{id:guid}", async (Guid id, UpdateProductDto model, CatalogDbContext db) =>
        {
            var product = await db.Products.FindAsync(id);
            if (product == null)
                return Results.NotFound(new { Error = "Product not found" });

            product.UpdateDetails(model.Name, model.Description, model.Price);
            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Product updated", Product = product });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Delete Product
        group.MapDelete("/products/{id:guid}", async (Guid id, CatalogDbContext db) =>
        {
            var product = await db.Products.FindAsync(id);
            if (product == null)
                return Results.NotFound(new { Error = "Product not found" });

            db.Products.Remove(product);
            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Product deleted" });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Update Category
        group.MapPut("/categories/{id:guid}", async (Guid id, UpdateCategoryDto model, CatalogDbContext db) =>
        {
            var category = await db.Categories.FindAsync(id);
            if (category == null)
                return Results.NotFound(new { Error = "Category not found" });

            category.UpdateDetails(model.Name, model.Description);
            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Category updated", Category = category });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Delete Category
        group.MapDelete("/categories/{id:guid}", async (Guid id, CatalogDbContext db) =>
        {
            var category = await db.Categories.FindAsync(id);
            if (category == null)
                return Results.NotFound(new { Error = "Category not found" });

            var hasProducts = await db.Products.AnyAsync(p => p.CategoryId == id);
            if (hasProducts)
                return Results.BadRequest(new { Error = "Cannot delete category with existing products" });

            db.Categories.Remove(category);
            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Category deleted" });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Update Brand
        group.MapPut("/brands/{id:guid}", async (Guid id, UpdateBrandDto model, CatalogDbContext db) =>
        {
            var brand = await db.Brands.FindAsync(id);
            if (brand == null)
                return Results.NotFound(new { Error = "Brand not found" });

            brand.UpdateDetails(model.Name, model.Description);
            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Brand updated", Brand = brand });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Delete Brand
        group.MapDelete("/brands/{id:guid}", async (Guid id, CatalogDbContext db) =>
        {
            var brand = await db.Brands.FindAsync(id);
            if (brand == null)
                return Results.NotFound(new { Error = "Brand not found" });

            var hasProducts = await db.Products.AnyAsync(p => p.BrandId == id);
            if (hasProducts)
                return Results.BadRequest(new { Error = "Cannot delete brand with existing products" });

            db.Brands.Remove(brand);
            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Brand deleted" });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));
    }
}

public record CreateProductDto(string Name, string Description, decimal Price, Guid CategoryId, Guid BrandId, int StockQuantity);
public record UpdateProductDto(string Name, string Description, decimal Price);
public record CreateCategoryDto(string Name, string Description);
public record UpdateCategoryDto(string Name, string Description);
public record CreateBrandDto(string Name, string Description);
public record UpdateBrandDto(string Name, string Description);
