using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Catalog.Infrastructure;
using Catalog.Domain;
using BuildingBlocks.Database;
using BuildingBlocks.Caching;

namespace Catalog;

public static class CatalogEndpoints
{
    public static void MapCatalogEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/catalog");

        group.MapGet("/products", async (CatalogDbContext db, int page = 1, int pageSize = 20, Guid? categoryId = null, Guid? brandId = null, string? search = null) =>
        {
            // Validate pagination parameters
            var (validPage, validPageSize) = QueryOptimizationExtensions.ValidatePaginationParams(page, pageSize);
            
            var query = db.Products.AsNoTracking()
                .Include(p => p.Category)
                .Include(p => p.Brand)
                .Where(p => p.IsActive);

            if (categoryId.HasValue)
                query = query.Where(p => p.CategoryId == categoryId.Value);

            if (brandId.HasValue)
                query = query.Where(p => p.BrandId == brandId.Value);

            if (!string.IsNullOrEmpty(search))
            {
                // Case-insensitive search using optimized LIKE
                var searchPattern = $"%{search}%";
                query = query.Where(p => 
                    EF.Functions.Like(p.Name, searchPattern) ||
                    EF.Functions.Like(p.Description, searchPattern) ||
                    EF.Functions.Like(p.Sku, searchPattern));
            }

            var total = await query.CountAsync();
            var products = await query
                .OrderByDescending(p => p.CreatedAt)
                .Skip((validPage - 1) * validPageSize)
                .Take(validPageSize)
                .ToListAsync();

            // Convert to snake_case for frontend
            var productsResponse = products.Select(p => new
            {
                p.Id,
                p.Name,
                p.Sku,
                p.Price,
                p.OldPrice,
                p.Description,
                p.Specifications,
                p.WarrantyInfo,
                p.StockQuantity,
                p.Status,
                p.ViewCount,
                p.SoldCount,
                p.AverageRating,
                p.ReviewCount,
                p.ImageUrl,
                p.LowStockThreshold,
                p.IsActive,
                p.CreatedAt,
                p.UpdatedAt,
                p.CreatedBy,
                p.UpdatedBy,
                CategoryId = p.CategoryId.ToString(),
                CategoryName = p.Category?.Name,
                BrandId = p.BrandId.ToString(),
                BrandName = p.Brand?.Name
            });

            return Results.Ok(new
            {
                Total = total,
                Page = validPage,
                PageSize = validPageSize,
                TotalPages = (total + validPageSize - 1) / validPageSize,
                HasNextPage = validPage < (total + validPageSize - 1) / validPageSize,
                HasPreviousPage = validPage > 1,
                Products = productsResponse
            });
        });

        group.MapGet("/products/{id:guid}", async (Guid id, CatalogDbContext db) =>
        {
            var product = await db.Products
                .AsNoTracking()
                .Include(p => p.Category)
                .Include(p => p.Brand)
                .FirstOrDefaultAsync(p => p.Id == id && p.IsActive);
                
            if (product == null)
                return Results.NotFound(new { Error = "Product not found" });

            return Results.Ok(new
            {
                product.Id,
                product.Name,
                product.Sku,
                product.Price,
                product.OldPrice,
                product.Description,
                product.Specifications,
                product.WarrantyInfo,
                product.StockQuantity,
                product.Status,
                product.ViewCount,
                product.SoldCount,
                product.AverageRating,
                product.ReviewCount,
                product.ImageUrl,
                product.LowStockThreshold,
                product.IsActive,
                product.CreatedAt,
                product.UpdatedAt,
                product.CreatedBy,
                product.UpdatedBy,
                CategoryId = product.CategoryId.ToString(),
                CategoryName = product.Category?.Name,
                BrandId = product.BrandId.ToString(),
                BrandName = product.Brand?.Name
            });
        });

        group.MapGet("/categories", async (CatalogDbContext db, ICacheService cache) =>
        {
            var cacheKey = CacheKeys.CategoriesKey;
            var cachedCategories = await cache.GetAsync<List<dynamic>>(cacheKey);
            
            if (cachedCategories != null)
                return Results.Ok(cachedCategories);

            var categories = await db.Categories
                .AsNoTracking()
                .Where(c => c.IsActive)
                .OrderBy(c => c.Name)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Description,
                    c.IsActive,
                    c.CreatedAt,
                    c.UpdatedAt
                })
                .ToListAsync();

            await cache.SetAsync(cacheKey, categories, TimeSpan.FromHours(1));
            return Results.Ok(categories);
        });

        group.MapGet("/brands", async (CatalogDbContext db, ICacheService cache) =>
        {
            var cacheKey = CacheKeys.BrandsKey;
            var cachedBrands = await cache.GetAsync<List<dynamic>>(cacheKey);
            
            if (cachedBrands != null)
                return Results.Ok(cachedBrands);

            var brands = await db.Brands
                .AsNoTracking()
                .Where(b => b.IsActive)
                .OrderBy(b => b.Name)
                .Select(b => new
                {
                    b.Id,
                    b.Name,
                    b.Description,
                    b.IsActive,
                    b.CreatedAt,
                    b.UpdatedAt
                })
                .ToListAsync();

            await cache.SetAsync(cacheKey, brands, TimeSpan.FromHours(1));
            return Results.Ok(brands);
        });

        // Advanced Search & Filter
        group.MapGet("/products/search", async (
            string? query,
            Guid? categoryId,
            Guid? brandId,
            decimal? minPrice,
            decimal? maxPrice,
            bool? inStock,
            string? sortBy,
            CatalogDbContext db,
            int page = 1,
            int pageSize = 20) =>
        {
            // Validate pagination parameters
            var (validPage, validPageSize) = QueryOptimizationExtensions.ValidatePaginationParams(page, pageSize);
            
            var productsQuery = db.Products
                .AsNoTracking()
                .Include(p => p.Category)
                .Include(p => p.Brand)
                .Where(p => p.IsActive);

            if (!string.IsNullOrWhiteSpace(query))
            {
                // Case-insensitive search using optimized LIKE
                var searchPattern = $"%{query}%";
                productsQuery = productsQuery.Where(p =>
                    EF.Functions.Like(p.Name, searchPattern) ||
                    EF.Functions.Like(p.Description, searchPattern) ||
                    EF.Functions.Like(p.Sku, searchPattern));
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

            // Sorting with snake_case
            productsQuery = sortBy switch
            {
                "price_asc" => productsQuery.OrderBy(p => p.Price),
                "price_desc" => productsQuery.OrderByDescending(p => p.Price),
                "newest" => productsQuery.OrderByDescending(p => p.CreatedAt),
                "popular" => productsQuery.OrderByDescending(p => p.ViewCount),
                "name" => productsQuery.OrderBy(p => p.Name),
                _ => productsQuery.OrderByDescending(p => p.CreatedAt) // Default: newest first
            };

            var total = await productsQuery.CountAsync();
            var products = await productsQuery
                .Skip((validPage - 1) * validPageSize)
                .Take(validPageSize)
                .ToListAsync();

            // Convert to snake_case for frontend
            var productsResponse = products.Select(p => new
            {
                p.Id,
                p.Name,
                p.Sku,
                p.Price,
                p.OldPrice,
                p.Description,
                p.Specifications,
                p.WarrantyInfo,
                p.StockQuantity,
                p.Status,
                p.ViewCount,
                p.SoldCount,
                p.AverageRating,
                p.ReviewCount,
                p.ImageUrl,
                p.LowStockThreshold,
                p.IsActive,
                p.CreatedAt,
                p.UpdatedAt,
                p.CreatedBy,
                p.UpdatedBy,
                CategoryId = p.CategoryId.ToString(),
                CategoryName = p.Category?.Name,
                BrandId = p.BrandId.ToString(),
                BrandName = p.Brand?.Name
            });

            return Results.Ok(new {
                Total = total,
                Page = validPage,
                PageSize = validPageSize,
                TotalPages = (total + validPageSize - 1) / validPageSize,
                HasNextPage = validPage < (total + validPageSize - 1) / validPageSize,
                HasPreviousPage = validPage > 1,
                Products = productsResponse
            });
        }).RequireRateLimiting("api_general");

        // Create Product (Admin only)
        group.MapPost("/products", async (CreateProductDto model, CatalogDbContext db) =>
        {
            var product = new Product(
                model.Name,
                model.Price,
                model.CostPrice,
                model.Description,
                model.CategoryId,
                model.BrandId,
                model.StockQuantity,
                model.Sku,
                model.OldPrice,
                model.Specifications,
                model.WarrantyInfo
            );

            db.Products.Add(product);
            await db.SaveChangesAsync();
            return Results.Created($"/api/catalog/products/{product.Id}", new {
                product.Id,
                product.Name,
                product.Sku,
                product.Price,
                product.OldPrice,
                product.Description,
                product.Specifications,
                product.WarrantyInfo,
                product.StockQuantity,
                product.Status,
                product.ViewCount,
                product.SoldCount,
                product.AverageRating,
                product.ReviewCount,
                product.ImageUrl,
                product.LowStockThreshold,
                product.IsActive,
                product.CreatedAt,
                product.UpdatedAt,
                product.CreatedBy,
                product.UpdatedBy,
                CategoryId = product.CategoryId.ToString(),
                BrandId = product.BrandId.ToString()
            });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Create Category
        group.MapPost("/categories", async (CreateCategoryDto model, CatalogDbContext db) =>
        {
            var category = new Category(model.Name, model.Description);
            db.Categories.Add(category);
            await db.SaveChangesAsync();
            return Results.Created($"/api/catalog/categories/{category.Id}", new {
                category.Id,
                category.Name,
                category.Description,
                category.IsActive,
                category.CreatedAt,
                category.UpdatedAt
            });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Create Brand
        group.MapPost("/brands", async (CreateBrandDto model, CatalogDbContext db) =>
        {
            var brand = new Brand(model.Name, model.Description);
            db.Brands.Add(brand);
            await db.SaveChangesAsync();
            return Results.Created($"/api/catalog/brands/{brand.Id}", new {
                brand.Id,
                brand.Name,
                brand.Description,
                brand.IsActive,
                brand.CreatedAt,
                brand.UpdatedAt
            });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Update Product
        group.MapPut("/products/{id:guid}", async (Guid id, UpdateProductDto model, CatalogDbContext db) =>
        {
            var product = await db.Products.FindAsync(id);
            if (product == null)
                return Results.NotFound(new { Error = "Product not found" });

            product.UpdateDetails(model.Name, model.Description, model.Price, model.OldPrice, model.Specifications, model.WarrantyInfo);
            await db.SaveChangesAsync();
            
            return Results.Ok(new { 
                Message = "Product updated", 
                Product = new {
                    product.Id,
                    product.Name,
                    product.Sku,
                    product.Price,
                    product.OldPrice,
                    product.Description,
                    product.Specifications,
                    product.WarrantyInfo,
                    product.StockQuantity,
                    product.Status,
                    product.ViewCount,
                    product.SoldCount,
                    product.AverageRating,
                    product.ReviewCount,
                    product.ImageUrl,
                    product.LowStockThreshold,
                    product.IsActive,
                    product.CreatedAt,
                    product.UpdatedAt,
                    product.CreatedBy,
                    product.UpdatedBy,
                    CategoryId = product.CategoryId.ToString(),
                    BrandId = product.BrandId.ToString()
                }
            });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Delete Product
        group.MapDelete("/products/{id:guid}", async (Guid id, CatalogDbContext db) =>
        {
            var product = await db.Products.FindAsync(id);
            if (product == null)
                return Results.NotFound(new { Error = "Product not found" });

            product.IsActive = false;
            product.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Product deactivated" });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Update Category
        group.MapPut("/categories/{id:guid}", async (Guid id, UpdateCategoryDto model, CatalogDbContext db) =>
        {
            var category = await db.Categories.FindAsync(id);
            if (category == null)
                return Results.NotFound(new { Error = "Category not found" });

            category.UpdateDetails(model.Name, model.Description);
            await db.SaveChangesAsync();
            return Results.Ok(new { 
                Message = "Category updated", 
                Category = new {
                    category.Id,
                    category.Name,
                    category.Description,
                    category.IsActive,
                    category.CreatedAt,
                    category.UpdatedAt
                }
            });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Delete Category
        group.MapDelete("/categories/{id:guid}", async (Guid id, CatalogDbContext db) =>
        {
            var category = await db.Categories.FindAsync(id);
            if (category == null)
                return Results.NotFound(new { Error = "Category not found" });

            category.IsActive = false;
            category.UpdatedAt = DateTime.UtcNow;
            
            // High-performance cascading deactivation
            await db.Products
                .Where(p => p.CategoryId == id)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.IsActive, false)
                                         .SetProperty(p => p.UpdatedAt, DateTime.UtcNow));

            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Category and associated products deactivated" });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Update Brand
        group.MapPut("/brands/{id:guid}", async (Guid id, UpdateBrandDto model, CatalogDbContext db) =>
        {
            var brand = await db.Brands.FindAsync(id);
            if (brand == null)
                return Results.NotFound(new { Error = "Brand not found" });

            brand.UpdateDetails(model.Name, model.Description);
            await db.SaveChangesAsync();
            return Results.Ok(new { 
                Message = "Brand updated", 
                Brand = new {
                    brand.Id,
                    brand.Name,
                    brand.Description,
                    brand.IsActive,
                    brand.CreatedAt,
                    brand.UpdatedAt
                }
            });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Delete Brand
        group.MapDelete("/brands/{id:guid}", async (Guid id, CatalogDbContext db) =>
        {
            var brand = await db.Brands.FindAsync(id);
            if (brand == null)
                return Results.NotFound(new { Error = "Brand not found" });

            brand.IsActive = false;
            brand.UpdatedAt = DateTime.UtcNow;
            
            // High-performance cascading deactivation for brands
            await db.Products
                .Where(p => p.BrandId == id)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.IsActive, false)
                                         .SetProperty(p => p.UpdatedAt, DateTime.UtcNow));

            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Brand and associated products deactivated" });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));
    }
}

public record CreateProductDto(
    string Name,
    string Description,
    decimal Price,
    decimal CostPrice,
    Guid CategoryId,
    Guid BrandId,
    int StockQuantity,
    string? Sku = null,
    decimal? OldPrice = null,
    string? Specifications = null,
    string? WarrantyInfo = null);

public record UpdateProductDto(
    string Name,
    string Description,
    decimal Price,
    decimal? OldPrice = null,
    string? Specifications = null,
    string? WarrantyInfo = null);

public record CreateCategoryDto(string Name, string Description);
public record UpdateCategoryDto(string Name, string Description);
public record CreateBrandDto(string Name, string Description);
public record UpdateBrandDto(string Name, string Description);
