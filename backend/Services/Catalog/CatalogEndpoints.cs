using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Catalog.Infrastructure;
using Catalog.Domain;
using BuildingBlocks.Database;
using BuildingBlocks.Caching;
using BuildingBlocks.Endpoints;

namespace Catalog;

public static class CatalogEndpoints
{
    public static void MapCatalogEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/catalog");

        group.MapGet("/products", async (CatalogDbContext db, ICacheService cache, int page = 1, int pageSize = 20, Guid? categoryId = null, Guid? brandId = null, string? search = null, string? q = null) =>
        {
            // Validate pagination parameters
            var (validPage, validPageSize) = QueryOptimizationExtensions.ValidatePaginationParams(page, pageSize);

            // Support both 'search' and 'q' parameters (q is an alias for search)
            var searchTerm = search ?? q;

            // Try to get from cache
            var cacheKey = CacheKeys.ProductsListKey(validPage, validPageSize, categoryId, brandId, searchTerm);
            var cachedResponse = await cache.GetAsync<dynamic>(cacheKey);
            if (cachedResponse is not null) return Results.Ok(cachedResponse);

            var query = db.Products.AsNoTracking()
                .Include(p => p.Category)
                .Include(p => p.Brand)
                .Where(p => p.IsActive);

            if (categoryId.HasValue)
                query = query.Where(p => p.CategoryId == categoryId.Value);

            if (brandId.HasValue)
                query = query.Where(p => p.BrandId == brandId.Value);

            if (!string.IsNullOrEmpty(searchTerm))
            {
                // Case-insensitive search using optimized LIKE
                var searchPattern = $"%{searchTerm}%";
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
                id = p.Id,
                name = p.Name,
                sku = p.Sku,
                price = p.Price,
                oldPrice = p.OldPrice,
                description = p.Description,
                specifications = p.Specifications,
                warrantyInfo = p.WarrantyInfo,
                stockLocations = p.StockLocations,
                stockQuantity = p.StockQuantity,
                status = p.Status,
                viewCount = p.ViewCount,
                soldCount = p.SoldCount,
                averageRating = p.AverageRating,
                reviewCount = p.ReviewCount,
                imageUrl = p.ImageUrl,
                lowStockThreshold = p.LowStockThreshold,
                isActive = p.IsActive,
                createdAt = p.CreatedAt,
                updatedAt = p.UpdatedAt,
                createdBy = p.CreatedBy,
                updatedBy = p.UpdatedBy,
                categoryId = p.CategoryId.ToString(),
                categoryName = p.Category?.Name,
                brandId = p.BrandId.ToString(),
                brandName = p.Brand?.Name,
                galleryImages = p.GalleryImages
            });

            var result = new
            {
                total = total,
                page = validPage,
                pageSize = validPageSize,
                totalPages = (total + validPageSize - 1) / validPageSize,
                hasNextPage = validPage < (total + validPageSize - 1) / validPageSize,
                hasPreviousPage = validPage > 1,
                products = productsResponse
            };

            // Cache for 10 minutes
            await cache.SetAsync(cacheKey, (object)result, TimeSpan.FromMinutes(10));

            return Results.Ok(result);
        });

        group.MapGet("/products/{id:guid}", async (Guid id, CatalogDbContext db, ICacheService cache) =>
        {
            var cacheKey = CacheKeys.ProductKey(id);
            var cachedProduct = await cache.GetAsync<dynamic>(cacheKey);
            if (cachedProduct is not null) return Results.Ok(cachedProduct);

            var product = await db.Products
                .AsNoTracking()
                .Include(p => p.Category)
                .Include(p => p.Brand)
                .FirstOrDefaultAsync(p => p.Id == id && p.IsActive);

            if (product == null)
                return Results.NotFound(new { Error = "Product not found" });

            var result = new
            {
                id = product.Id,
                name = product.Name,
                sku = product.Sku,
                price = product.Price,
                oldPrice = product.OldPrice,
                description = product.Description,
                specifications = product.Specifications,
                warrantyInfo = product.WarrantyInfo,
                stockLocations = product.StockLocations,
                stockQuantity = product.StockQuantity,
                status = product.Status,
                viewCount = product.ViewCount,
                soldCount = product.SoldCount,
                averageRating = product.AverageRating,
                reviewCount = product.ReviewCount,
                imageUrl = product.ImageUrl,
                lowStockThreshold = product.LowStockThreshold,
                isActive = product.IsActive,
                createdAt = product.CreatedAt,
                updatedAt = product.UpdatedAt,
                createdBy = product.CreatedBy,
                updatedBy = product.UpdatedBy,
                categoryId = product.CategoryId.ToString(),
                categoryName = product.Category?.Name,
                brandId = product.BrandId.ToString(),
                brandName = product.Brand?.Name,
                galleryImages = product.GalleryImages
            };

            // Cache for 30 minutes
            await cache.SetAsync(cacheKey, (object)result, TimeSpan.FromMinutes(30));

            return Results.Ok(result);
        });

        group.MapGet("/categories", async (CatalogDbContext db, ICacheService cache) =>
        {
            var cacheKey = CacheKeys.CategoriesKey + "_v3";
            var cachedCategories = await cache.GetAsync<List<dynamic>>(cacheKey);
            
            if (cachedCategories is not null)
                return Results.Ok(cachedCategories);

            var categories = await db.Categories
                .AsNoTracking()
                .Where(c => c.IsActive)
                .OrderBy(c => c.Name)
                .Select(c => new
                {
                    id = c.Id,
                    name = c.Name,
                    description = c.Description,
                    isActive = c.IsActive,
                    createdAt = c.CreatedAt,
                    updatedAt = c.UpdatedAt
                })
                .ToListAsync<object>(); // Cast to object list to allow dynamic serialization

            await cache.SetAsync(cacheKey, categories, TimeSpan.FromHours(1));
            return Results.Ok(categories);
        });

        group.MapGet("/brands", async (CatalogDbContext db, ICacheService cache) =>
        {
            var cacheKey = CacheKeys.BrandsKey + "_v3";
            var cachedBrands = await cache.GetAsync<List<dynamic>>(cacheKey);
            
            if (cachedBrands is not null)
                return Results.Ok(cachedBrands);

            var brands = await db.Brands
                .AsNoTracking()
                .Where(b => b.IsActive)
                .OrderBy(b => b.Name)
                .Select(b => new
                {
                    id = b.Id,
                    name = b.Name,
                    description = b.Description,
                    isActive = b.IsActive,
                    createdAt = b.CreatedAt,
                    updatedAt = b.UpdatedAt
                })
                .ToListAsync<object>();

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
            ICacheService cache,
            int page = 1,
            int pageSize = 20) =>
        {
            // Validate pagination parameters
            var (validPage, validPageSize) = QueryOptimizationExtensions.ValidatePaginationParams(page, pageSize);

            // Try to get from cache
            var cacheKey = $"{CacheKeys.ProductsListKey(validPage, validPageSize, categoryId, brandId, query)}:{minPrice}:{maxPrice}:{inStock}:{sortBy}";
            var cachedResponse = await cache.GetAsync<dynamic>(cacheKey);
            if (cachedResponse is not null) return Results.Ok(cachedResponse);

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
                id = p.Id,
                name = p.Name,
                sku = p.Sku,
                price = p.Price,
                oldPrice = p.OldPrice,
                description = p.Description,
                specifications = p.Specifications,
                warrantyInfo = p.WarrantyInfo,
                stockLocations = p.StockLocations,
                stockQuantity = p.StockQuantity,
                status = p.Status,
                viewCount = p.ViewCount,
                soldCount = p.SoldCount,
                averageRating = p.AverageRating,
                reviewCount = p.ReviewCount,
                imageUrl = p.ImageUrl,
                lowStockThreshold = p.LowStockThreshold,
                isActive = p.IsActive,
                createdAt = p.CreatedAt,
                updatedAt = p.UpdatedAt,
                createdBy = p.CreatedBy,
                updatedBy = p.UpdatedBy,
                categoryId = p.CategoryId.ToString(),
                categoryName = p.Category?.Name,
                brandId = p.BrandId.ToString(),
                brandName = p.Brand?.Name,
                galleryImages = p.GalleryImages
            });

            var result = new {
                total = total,
                page = validPage,
                pageSize = validPageSize,
                totalPages = (total + validPageSize - 1) / validPageSize,
                hasNextPage = validPage < (total + validPageSize - 1) / validPageSize,
                hasPreviousPage = validPage > 1,
                products = productsResponse
            };

            // Cache for 5 minutes (search results are dynamic)
            await cache.SetAsync(cacheKey, (object)result, TimeSpan.FromMinutes(5));

            return Results.Ok(result);
        });

        // Create Product (Admin only)
        group.MapPost("/products", async (CreateProductDto model, CatalogDbContext db, ICacheService cache, HttpContext httpContext) =>
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
                model.WarrantyInfo,
                stockLocations: model.StockLocations,
                imageUrl: model.ImageUrl,
                galleryImages: model.GalleryImages
            );

            db.Products.Add(product);
            await db.SaveChangesAsync();

            // Log Audit
            await httpContext.LogAuditAsync("Create", "Product", product.Id.ToString(), $"Name: {product.Name}, Price: {product.Price}");

            // Invalidate product caches
            await cache.RemoveByPatternAsync(CacheKeys.ProductsListPattern);

            return Results.Created($"/api/catalog/products/{product.Id}", new {
                product.Id,
                product.Name,
                product.Sku,
                product.Price,
                product.OldPrice,
                product.Description,
                product.Specifications,
                product.WarrantyInfo,
                product.StockLocations,
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
                BrandId = product.BrandId.ToString(),
                product.GalleryImages
            });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Create Category
        group.MapPost("/categories", async (CreateCategoryDto model, CatalogDbContext db, ICacheService cache, HttpContext httpContext) =>
        {
            var category = new Category(model.Name, model.Description);
            db.Categories.Add(category);
            await db.SaveChangesAsync();

            // Log Audit
            await httpContext.LogAuditAsync("Create", "Category", category.Id.ToString(), $"Name: {category.Name}");

            // Invalidate category caches
            await cache.RemoveByPatternAsync(CacheKeys.CategoriesPattern);

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
        group.MapPost("/brands", async (CreateBrandDto model, CatalogDbContext db, ICacheService cache, HttpContext httpContext) =>
        {
            var brand = new Brand(model.Name, model.Description);
            db.Brands.Add(brand);
            await db.SaveChangesAsync();

            // Log Audit
            await httpContext.LogAuditAsync("Create", "Brand", brand.Id.ToString(), $"Name: {brand.Name}");

            // Invalidate brand caches
            await cache.RemoveByPatternAsync(CacheKeys.BrandsPattern);

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
        group.MapPut("/products/{id:guid}", async (Guid id, UpdateProductDto model, CatalogDbContext db, ICacheService cache, HttpContext httpContext) =>
        {
            var product = await db.Products.FindAsync(id);
            if (product == null)
                return Results.NotFound(new { Error = "Product not found" });

            product.UpdateDetails(
                model.Name,
                model.Description,
                model.Price,
                model.OldPrice,
                model.Specifications,
                model.WarrantyInfo,
                model.StockLocations,
                model.Weight,
                model.Barcode
            );

            product.UpdateImage(model.ImageUrl ?? product.ImageUrl, model.GalleryImages);

            if (model.CategoryId.HasValue) product.UpdateCategory(model.CategoryId.Value);
            if (model.BrandId.HasValue) product.UpdateBrand(model.BrandId.Value);
            if (model.StockQuantity.HasValue) product.UpdateStockQuantity(model.StockQuantity.Value);
            if (model.LowStockThreshold.HasValue) product.UpdateLowStockThreshold(model.LowStockThreshold.Value);
            if (model.CostPrice.HasValue) product.UpdateCostPrice(model.CostPrice.Value);
            if (!string.IsNullOrEmpty(model.Sku)) product.UpdateSku(model.Sku);

            product.UpdateSeo(model.MetaTitle, model.MetaDescription, model.MetaKeywords);

            await db.SaveChangesAsync();

            // Log Audit
            await httpContext.LogAuditAsync("Update", "Product", id.ToString(), $"Name: {product.Name}, Price: {product.Price}");

            // Invalidate product caches
            await cache.RemoveAsync(CacheKeys.ProductKey(id));
            await cache.RemoveByPatternAsync(CacheKeys.ProductsListPattern);
            await cache.RemoveAsync(CacheKeys.RelatedProductsKey(id));

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
                    product.StockLocations,
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
                    BrandId = product.BrandId.ToString(),
                    product.GalleryImages
                }
            });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Delete Product
        group.MapDelete("/products/{id:guid}", async (Guid id, CatalogDbContext db, ICacheService cache, HttpContext httpContext) =>
        {
            var product = await db.Products.FindAsync(id);
            if (product == null)
                return Results.NotFound(new { Error = "Product not found" });

            product.IsActive = false;
            product.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            // Log Audit
            await httpContext.LogAuditAsync("Deactivate", "Product", id.ToString(), $"Name: {product.Name}");

            // Invalidate product caches
            await cache.RemoveAsync(CacheKeys.ProductKey(id));
            await cache.RemoveByPatternAsync(CacheKeys.ProductsListPattern);
            await cache.RemoveAsync(CacheKeys.RelatedProductsKey(id));

            return Results.Ok(new { Message = "Product deactivated" });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Update Category
        group.MapPut("/categories/{id:guid}", async (Guid id, UpdateCategoryDto model, CatalogDbContext db, ICacheService cache) =>
        {
            var category = await db.Categories.FindAsync(id);
            if (category == null)
                return Results.NotFound(new { Error = "Category not found" });

            category.UpdateDetails(model.Name, model.Description);
            if (model.IsActive.HasValue) { if (model.IsActive.Value) category.Activate(); else category.Deactivate(); }
            
            await db.SaveChangesAsync();

            // Invalidate caches
            await cache.RemoveByPatternAsync(CacheKeys.CategoriesPattern);
            await cache.RemoveByPatternAsync(CacheKeys.ProductsListPattern);

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

        // Deactivate Category (Soft Delete)
        group.MapDelete("/categories/{id:guid}", async (Guid id, CatalogDbContext db, ICacheService cache, HttpContext httpContext) =>
        {
            var category = await db.Categories.FindAsync(id);
            if (category == null)
                return Results.NotFound(new { Error = "Category not found" });

            var userId = httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "Admin";
            category.Deactivate(userId);

            // High-performance cascading deactivation
            await db.Products
                .Where(p => p.CategoryId == id)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.IsActive, false)
                                         .SetProperty(p => p.UpdatedAt, DateTime.UtcNow));

            await db.SaveChangesAsync();

            // Log Audit
            await httpContext.LogAuditAsync("Deactivate", "Category", id.ToString(), $"Name: {category.Name}");

            // Invalidate caches
            await cache.RemoveByPatternAsync(CacheKeys.CategoriesPattern);
            await cache.RemoveByPatternAsync(CacheKeys.ProductsPattern);

            return Results.Ok(new { Message = "Category and associated products deactivated" });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Activate Category
        group.MapPost("/categories/{id:guid}/activate", async (Guid id, CatalogDbContext db, ICacheService cache) =>
        {
            var category = await db.Categories.FindAsync(id);
            if (category == null)
                return Results.NotFound(new { Error = "Category not found" });

            category.Activate();

            // Note: Products remain deactivated until manually activated or recreated
            await db.SaveChangesAsync();

            // Invalidate caches
            await cache.RemoveByPatternAsync(CacheKeys.CategoriesPattern);
            await cache.RemoveByPatternAsync(CacheKeys.ProductsPattern);

            return Results.Ok(new { Message = "Category activated" });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Update Brand
        group.MapPut("/brands/{id:guid}", async (Guid id, UpdateBrandDto model, CatalogDbContext db, ICacheService cache) =>
        {
            var brand = await db.Brands.FindAsync(id);
            if (brand == null)
                return Results.NotFound(new { Error = "Brand not found" });

            brand.UpdateDetails(model.Name, model.Description);
            if (model.IsActive.HasValue) { if (model.IsActive.Value) brand.Activate(); else brand.Deactivate(); }
            
            await db.SaveChangesAsync();

            // Invalidate caches
            await cache.RemoveByPatternAsync(CacheKeys.BrandsPattern);
            await cache.RemoveByPatternAsync(CacheKeys.ProductsListPattern);

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

        // Deactivate Brand (Soft Delete)
        group.MapDelete("/brands/{id:guid}", async (Guid id, CatalogDbContext db, ICacheService cache, HttpContext httpContext) =>
        {
            var brand = await db.Brands.FindAsync(id);
            if (brand == null)
                return Results.NotFound(new { Error = "Brand not found" });

            var userId = httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "Admin";
            brand.Deactivate(userId);

            // High-performance cascading deactivation for brands
            await db.Products
                .Where(p => p.BrandId == id)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.IsActive, false)
                                         .SetProperty(p => p.UpdatedAt, DateTime.UtcNow));

            await db.SaveChangesAsync();

            // Log Audit
            await httpContext.LogAuditAsync("Deactivate", "Brand", id.ToString(), $"Name: {brand.Name}");

            // Invalidate caches
            await cache.RemoveByPatternAsync(CacheKeys.BrandsPattern);
            await cache.RemoveByPatternAsync(CacheKeys.ProductsPattern);

            return Results.Ok(new { Message = "Brand and associated products deactivated" });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Activate Brand
        group.MapPost("/brands/{id:guid}/activate", async (Guid id, CatalogDbContext db, ICacheService cache) =>
        {
            var brand = await db.Brands.FindAsync(id);
            if (brand == null)
                return Results.NotFound(new { Error = "Brand not found" });

            brand.Activate();

            // Note: Products remain deactivated until manually activated or recreated
            await db.SaveChangesAsync();

            // Invalidate caches
            await cache.RemoveByPatternAsync(CacheKeys.BrandsPattern);
            await cache.RemoveByPatternAsync(CacheKeys.ProductsPattern);

            return Results.Ok(new { Message = "Brand activated" });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Seed Data Endpoint (Development only)
        group.MapPost("/seed", async (CatalogDbContext db) =>
        {
            // Check if data already exists
            if (await db.Categories.AnyAsync() || await db.Brands.AnyAsync())
            {
                return Results.BadRequest(new { Error = "Data already exists. Clear database first." });
            }

            // Create Categories
            var categories = new List<Category>
            {
                new Category("Laptop", "Laptop văn phòng và gaming"),
                new Category("PC Gaming", "Máy tính để bàn gaming"),
                new Category("PC Văn Phòng", "Máy tính để bàn văn phòng"),
                new Category("Linh Kiện", "Linh kiện máy tính"),
                new Category("Màn Hình", "Màn hình máy tính"),
                new Category("Phụ Kiện", "Phụ kiện máy tính"),
                new Category("Bàn Phím", "Bàn phím cơ và gaming"),
                new Category("Chuột", "Chuột gaming và văn phòng"),
                new Category("Tai Nghe", "Tai nghe gaming và âm nhạc"),
                new Category("Ghế Gaming", "Ghế gaming cao cấp")
            };
            db.Categories.AddRange(categories);
            await db.SaveChangesAsync();

            // Create Brands
            var brands = new List<Brand>
            {
                new Brand("ASUS", "Thương hiệu laptop và linh kiện hàng đầu"),
                new Brand("Dell", "Thương hiệu laptop doanh nghiệp"),
                new Brand("HP", "Hewlett-Packard - Laptop và PC"),
                new Brand("Lenovo", "ThinkPad và gaming laptop"),
                new Brand("MSI", "Laptop và linh kiện gaming"),
                new Brand("Acer", "Laptop giá tốt"),
                new Brand("Gigabyte", "VGA và mainboard cao cấp"),
                new Brand("Intel", "CPU và chipset"),
                new Brand("AMD", "CPU và GPU"),
                new Brand("NVIDIA", "Card đồ họa"),
                new Brand("Samsung", "Màn hình và SSD"),
                new Brand("LG", "Màn hình UltraWide"),
                new Brand("Logitech", "Chuột và bàn phím"),
                new Brand("Razer", "Gaming gear"),
                new Brand("Corsair", "RAM và phụ kiện gaming"),
                new Brand("Kingston", "RAM và SSD"),
                new Brand("Western Digital", "Ổ cứng HDD và SSD"),
                new Brand("Seagate", "Ổ cứng HDD"),
                new Brand("HyperX", "Gaming gear Kingston"),
                new Brand("SteelSeries", "Gaming gear")
            };
            db.Brands.AddRange(brands);
            await db.SaveChangesAsync();

            // Get category and brand IDs
            var catLaptop = categories.First(c => c.Name == "Laptop").Id;
            var catPCGaming = categories.First(c => c.Name == "PC Gaming").Id;
            var catLinhKien = categories.First(c => c.Name == "Linh Kiện").Id;
            var catManHinh = categories.First(c => c.Name == "Màn Hình").Id;
            var catBanPhim = categories.First(c => c.Name == "Bàn Phím").Id;
            var catChuot = categories.First(c => c.Name == "Chuột").Id;
            var catTaiNghe = categories.First(c => c.Name == "Tai Nghe").Id;

            var brandAsus = brands.First(b => b.Name == "ASUS").Id;
            var brandDell = brands.First(b => b.Name == "Dell").Id;
            var brandHP = brands.First(b => b.Name == "HP").Id;
            var brandLenovo = brands.First(b => b.Name == "Lenovo").Id;
            var brandMSI = brands.First(b => b.Name == "MSI").Id;
            var brandAcer = brands.First(b => b.Name == "Acer").Id;
            var brandGigabyte = brands.First(b => b.Name == "Gigabyte").Id;
            var brandIntel = brands.First(b => b.Name == "Intel").Id;
            var brandAMD = brands.First(b => b.Name == "AMD").Id;
            var brandNVIDIA = brands.First(b => b.Name == "NVIDIA").Id;
            var brandSamsung = brands.First(b => b.Name == "Samsung").Id;
            var brandLG = brands.First(b => b.Name == "LG").Id;
            var brandLogitech = brands.First(b => b.Name == "Logitech").Id;
            var brandRazer = brands.First(b => b.Name == "Razer").Id;
            var brandCorsair = brands.First(b => b.Name == "Corsair").Id;

            // Create Products
            var products = new List<Product>
            {
                // Laptops
                new Product("ASUS ROG Strix G16 2024", 42990000, 38000000, "Laptop gaming cao cấp Intel Core i9-14900HX, RTX 4070, 16GB DDR5, 1TB SSD", catLaptop, brandAsus, 15, 
                    specifications: "{\"CPU\": \"Intel Core i9-14900HX\", \"RAM\": \"16GB DDR5\", \"SSD\": \"1TB\", \"GPU\": \"RTX 4070 8GB\", \"Display\": \"16 inch QHD+ 240Hz\"}", 
                    stockLocations: "[{\"city\": \"TP. HCM\", \"address\": \"285 Hai Bà Trưng - Quận 1\"}, {\"city\": \"Hà Nội\", \"address\": \"131 Lê Thanh Nghị\"}]",
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/asus-rog-strix-g16_j5dhxn.jpg"),
                
                new Product("ASUS TUF Gaming F15 2024", 28990000, 25000000, "Laptop gaming Intel Core i7-13620H, RTX 4060, 16GB DDR5, 512GB SSD", catLaptop, brandAsus, 25, 
                    specifications: "{\"CPU\": \"Intel Core i7-13620H\", \"RAM\": \"16GB DDR5\", \"SSD\": \"512GB\", \"GPU\": \"RTX 4060 8GB\", \"Display\": \"15.6 inch FHD 144Hz\"}", 
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/asus-tuf-f15_xvzrpc.jpg"),
                
                new Product("Dell XPS 15 2024", 45990000, 42000000, "Laptop cao cấp Intel Core Ultra 7-155H, 32GB RAM, 1TB SSD, OLED 3.5K", catLaptop, brandDell, 10, 
                    specifications: "{\"CPU\": \"Intel Core Ultra 7-155H\", \"RAM\": \"32GB DDR5\", \"SSD\": \"1TB\", \"Display\": \"15.6 inch OLED 3.5K\"}", 
                    stockLocations: "[{\"city\": \"TP. HCM\", \"address\": \"499/1 Quang Trung - Gò Vấp\"}]",
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/dell-xps-15_kfqzxm.jpg"),
                
                new Product("Dell Inspiron 15 3520", 15990000, 13500000, "Laptop văn phòng Intel Core i5-1235U, 8GB RAM, 512GB SSD", catLaptop, brandDell, 30, 
                    specifications: "{\"CPU\": \"Intel Core i5-1235U\", \"RAM\": \"8GB DDR4\", \"SSD\": \"512GB\", \"Display\": \"15.6 inch FHD\"}", 
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/dell-inspiron-15_qweabc.jpg"),
                
                new Product("HP Victus 16 2024", 26990000, 23000000, "Laptop gaming AMD Ryzen 7 7840HS, RTX 4060, 16GB DDR5, 512GB SSD", catLaptop, brandHP, 20, 
                    specifications: "{\"CPU\": \"AMD Ryzen 7 7840HS\", \"RAM\": \"16GB DDR5\", \"SSD\": \"512GB\", \"GPU\": \"RTX 4060 8GB\", \"Display\": \"16.1 inch FHD 144Hz\"}", 
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/hp-victus-16_abcdef.jpg"),
                
                new Product("Lenovo ThinkPad X1 Carbon Gen 12", 52990000, 48000000, "Laptop doanh nhân Intel Core Ultra 7, 32GB RAM, 1TB SSD", catLaptop, brandLenovo, 8, 
                    specifications: "{\"CPU\": \"Intel Core Ultra 7-155U\", \"RAM\": \"32GB LPDDR5\", \"SSD\": \"1TB\", \"Display\": \"14 inch 2.8K OLED\"}", 
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/lenovo-thinkpad-x1_ghijkl.jpg"),
                
                new Product("MSI Katana 15 2024", 24990000, 21500000, "Laptop gaming Intel Core i7-13620H, RTX 4050, 16GB DDR5, 512GB SSD", catLaptop, brandMSI, 18, 
                    specifications: "{\"CPU\": \"Intel Core i7-13620H\", \"RAM\": \"16GB DDR5\", \"SSD\": \"512GB\", \"GPU\": \"RTX 4050 6GB\", \"Display\": \"15.6 inch FHD 144Hz\"}", 
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/msi-katana-15_mnopqr.jpg"),
                
                new Product("Acer Nitro V 15 ANV15-51", 22990000, 19500000, "Laptop gaming Intel Core i5-13420H, RTX 4050, 16GB DDR5, 512GB SSD", catLaptop, brandAcer, 22, 
                    specifications: "{\"CPU\": \"Intel Core i5-13420H\", \"RAM\": \"16GB DDR5\", \"SSD\": \"512GB\", \"GPU\": \"RTX 4050 6GB\", \"Display\": \"15.6 inch FHD 144Hz\"}", 
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/acer-nitro-v15_stuvwx.jpg"),

                // PC Gaming
                new Product("PC Gaming QH Beast i9-14900K RTX 4090", 89990000, 82000000, "PC Gaming cao cấp Intel Core i9-14900K, RTX 4090 24GB, 64GB DDR5, 2TB NVMe", catPCGaming, brandAsus, 5, 
                    specifications: "{\"CPU\": \"Intel Core i9-14900K\", \"RAM\": \"64GB DDR5 6000MHz\", \"SSD\": \"2TB NVMe Gen4\", \"GPU\": \"RTX 4090 24GB\", \"PSU\": \"1000W Gold\", \"Case\": \"NZXT H9 Elite\"}", 
                    stockLocations: "[{\"city\": \"Hà Nội\", \"address\": \"Số 131 Lê Thanh Nghị - Phường Bạch Mai\"}]",
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/pc-gaming-beast_yzabcd.jpg"),
                
                new Product("PC Gaming QH Pro i7-14700K RTX 4070 Ti", 52990000, 47000000, "PC Gaming Intel Core i7-14700K, RTX 4070 Ti Super, 32GB DDR5, 1TB NVMe", catPCGaming, brandMSI, 8, 
                    specifications: "{\"CPU\": \"Intel Core i7-14700K\", \"RAM\": \"32GB DDR5 5600MHz\", \"SSD\": \"1TB NVMe Gen4\", \"GPU\": \"RTX 4070 Ti Super 16GB\", \"PSU\": \"850W Gold\"}", 
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/pc-gaming-pro_efghij.jpg"),
                
                new Product("PC Gaming QH Starter R5-7600 RTX 4060", 22990000, 19500000, "PC Gaming AMD Ryzen 5 7600, RTX 4060, 16GB DDR5, 512GB NVMe", catPCGaming, brandGigabyte, 15, 
                    specifications: "{\"CPU\": \"AMD Ryzen 5 7600\", \"RAM\": \"16GB DDR5 5200MHz\", \"SSD\": \"512GB NVMe\", \"GPU\": \"RTX 4060 8GB\", \"PSU\": \"650W Bronze\"}", 
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/pc-gaming-starter_klmnop.jpg"),

                // Components
                new Product("Intel Core i9-14900K", 15990000, 14000000, "CPU Intel thế hệ 14 cao cấp nhất, 24 nhân 32 luồng, 6.0GHz", catLinhKien, brandIntel, 12, 
                    specifications: "{\"Cores\": \"24 (8P+16E)\", \"Threads\": \"32\", \"Base Clock\": \"3.2GHz\", \"Boost Clock\": \"6.0GHz\", \"TDP\": \"125W\", \"Socket\": \"LGA 1700\"}", 
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/intel-i9-14900k_qrstuv.jpg"),
                
                new Product("AMD Ryzen 9 7950X3D", 17990000, 16000000, "CPU AMD cao cấp nhất cho gaming, 16 nhân 32 luồng, 3D V-Cache", catLinhKien, brandAMD, 8, 
                    specifications: "{\"Cores\": \"16\", \"Threads\": \"32\", \"Base Clock\": \"4.2GHz\", \"Boost Clock\": \"5.7GHz\", \"L3 Cache\": \"128MB 3D V-Cache\", \"TDP\": \"120W\"}", 
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/amd-7950x3d_wxyzab.jpg"),
                
                new Product("NVIDIA GeForce RTX 4090 Founders Edition", 52990000, 48000000, "Card đồ họa mạnh nhất thế giới, 24GB GDDR6X", catLinhKien, brandNVIDIA, 3, 
                    specifications: "{\"VRAM\": \"24GB GDDR6X\", \"Cores\": \"16384 CUDA\", \"Boost Clock\": \"2.52GHz\", \"TDP\": \"450W\", \"Interface\": \"PCIe 4.0 x16\"}", 
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/rtx-4090-fe_cdefgh.jpg"),
                
                new Product("ASUS ROG STRIX RTX 4080 Super OC", 32990000, 29000000, "Card đồ họa gaming cao cấp, 16GB GDDR6X, tản nhiệt 3 quạt", catLinhKien, brandAsus, 6, 
                    specifications: "{\"VRAM\": \"16GB GDDR6X\", \"Cores\": \"10240 CUDA\", \"Boost Clock\": \"2.62GHz\", \"TDP\": \"320W\", \"Cooling\": \"3 Fan Axial-tech\"}", 
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/asus-rog-4080-super_ijklmn.jpg"),
                
                new Product("Corsair Vengeance DDR5 32GB (2x16GB) 6000MHz", 3990000, 3400000, "RAM DDR5 cao cấp cho gaming và workstation", catLinhKien, brandCorsair, 40, 
                    specifications: "{\"Capacity\": \"32GB (2x16GB)\", \"Speed\": \"6000MHz\", \"Latency\": \"CL36\", \"Voltage\": \"1.35V\", \"RGB\": \"Yes\"}", 
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/corsair-vengeance-ddr5_opqrst.jpg"),
                
                new Product("Samsung 990 Pro 2TB NVMe", 5490000, 4800000, "SSD NVMe Gen4 cao cấp, tốc độ đọc 7450MB/s", catLinhKien, brandSamsung, 25, 
                    specifications: "{\"Capacity\": \"2TB\", \"Interface\": \"PCIe 4.0 x4 NVMe\", \"Read Speed\": \"7450MB/s\", \"Write Speed\": \"6900MB/s\", \"TBW\": \"1200TB\"}", 
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/samsung-990-pro_uvwxyz.jpg"),

                // Monitors
                new Product("ASUS ROG Swift PG32UQX", 52990000, 47000000, "Màn hình gaming 32 inch 4K 144Hz Mini LED HDR 1400", catManHinh, brandAsus, 4, 
                    specifications: "{\"Size\": \"32 inch\", \"Resolution\": \"3840x2160 4K\", \"Refresh Rate\": \"144Hz\", \"Panel\": \"IPS Mini LED\", \"HDR\": \"HDR 1400\", \"Response\": \"1ms\"}", 
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/asus-pg32uqx_123456.jpg"),
                
                new Product("LG UltraGear 27GP950-B", 18990000, 16500000, "Màn hình gaming 27 inch 4K 160Hz Nano IPS", catManHinh, brandLG, 10, 
                    specifications: "{\"Size\": \"27 inch\", \"Resolution\": \"3840x2160 4K\", \"Refresh Rate\": \"160Hz\", \"Panel\": \"Nano IPS\", \"HDR\": \"HDR 600\", \"Response\": \"1ms\"}", 
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/lg-27gp950_789012.jpg"),
                
                new Product("Samsung Odyssey G9 49 inch", 35990000, 32000000, "Màn hình cong gaming 49 inch DQHD 240Hz", catManHinh, brandSamsung, 6, 
                    specifications: "{\"Size\": \"49 inch\", \"Resolution\": \"5120x1440 DQHD\", \"Refresh Rate\": \"240Hz\", \"Panel\": \"VA Curved 1000R\", \"HDR\": \"HDR 1000\", \"Response\": \"1ms\"}", 
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/samsung-odyssey-g9_345678.jpg"),

                // Keyboards
                new Product("Logitech G Pro X TKL", 3290000, 2800000, "Bàn phím cơ gaming TKL, hot-swap, RGB", catBanPhim, brandLogitech, 30, 
                    specifications: "{\"Layout\": \"TKL\", \"Switch\": \"GX Red/Blue/Brown\", \"Hot-swap\": \"Yes\", \"RGB\": \"LIGHTSYNC RGB\", \"Connection\": \"Wired USB-C\"}", 
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/logitech-gpro-tkl_901234.jpg"),
                
                new Product("Razer BlackWidow V4 Pro", 5990000, 5200000, "Bàn phím cơ gaming full-size, Green Switch, RGB", catBanPhim, brandRazer, 15, 
                    specifications: "{\"Layout\": \"Full-size\", \"Switch\": \"Razer Green\", \"RGB\": \"Razer Chroma\", \"Wrist Rest\": \"Included\", \"Media Keys\": \"Yes\"}", 
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/razer-blackwidow-v4_567890.jpg"),
                
                new Product("Corsair K100 RGB", 6490000, 5700000, "Bàn phím cơ gaming cao cấp, OPX Switch, iCUE", catBanPhim, brandCorsair, 12, 
                    specifications: "{\"Layout\": \"Full-size\", \"Switch\": \"Corsair OPX\", \"RGB\": \"per-key iCUE\", \"Macro\": \"6 keys\", \"Polling Rate\": \"4000Hz\"}", 
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/corsair-k100_abcdef.jpg"),

                // Mice
                new Product("Logitech G Pro X Superlight 2", 4290000, 3700000, "Chuột gaming không dây nhẹ nhất thế giới, 60g", catChuot, brandLogitech, 25, 
                    specifications: "{\"Sensor\": \"HERO 2\", \"DPI\": \"32000\", \"Weight\": \"60g\", \"Battery\": \"95 hours\", \"Connection\": \"LIGHTSPEED Wireless\"}", 
                    stockLocations: "[{\"city\": \"Đà Nẵng\", \"address\": \"123 Nguyễn Văn Linh\"}]",
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/logitech-superlight2_ghijkl.jpg"),
                
                new Product("Chuột Logitech G502 Hero", 1200000, 1380000, "Chuột gaming huyền thoại, cảm biến HERO 25K, 11 nút lập trình", catChuot, brandLogitech, 40, 
                    specifications: "{\"Sensor\": \"HERO 25K\", \"DPI\": \"25600\", \"IPS\": \"400+\", \"Buttons\": \"11\", \"Weight\": \"121g\", \"RGB\": \"LIGHTSYNC\"}",
                    stockLocations: "[{\"city\": \"TP. HCM\", \"address\": \"ABC Cách Mạng Tháng 8\"}, {\"city\": \"Hà Nội\", \"address\": \"XYZ Thái Hà\"}]",
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/logitech-g502-hero_abcdef.jpg"),
                
                new Product("Razer DeathAdder V3 Pro", 4590000, 4000000, "Chuột gaming không dây ergonomic, Focus Pro sensor", catChuot, brandRazer, 20, 
                    specifications: "{\"Sensor\": \"Focus Pro 30K\", \"DPI\": \"30000\", \"Weight\": \"63g\", \"Battery\": \"90 hours\", \"Connection\": \"HyperSpeed Wireless\"}", 
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/razer-deathadder-v3_mnopqr.jpg"),

                // Headsets
                new Product("Logitech G Pro X 2 Lightspeed", 6290000, 5500000, "Tai nghe gaming không dây cao cấp, Graphene drivers", catTaiNghe, brandLogitech, 15, 
                    specifications: "{\"Driver\": \"50mm Graphene\", \"Frequency\": \"20Hz-20kHz\", \"Mic\": \"Detachable Blue Voice\", \"Battery\": \"50 hours\", \"Connection\": \"LIGHTSPEED/Bluetooth\"}", 
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/logitech-gpro-x2_stuvwx.jpg"),
                
                new Product("Razer BlackShark V2 Pro 2023", 5490000, 4800000, "Tai nghe gaming không dây, THX Spatial Audio", catTaiNghe, brandRazer, 18, 
                    specifications: "{\"Driver\": \"50mm TriForce Titanium\", \"Frequency\": \"12Hz-28kHz\", \"Mic\": \"Detachable HyperClear Super Wideband\", \"Battery\": \"70 hours\", \"Connection\": \"HyperSpeed Wireless\"}", 
                    imageUrl: "https://res.cloudinary.com/dnmoxu3yq/image/upload/v1736619282/razer-blackshark-v2-pro_yzabcd.jpg"),
            };

            db.Products.AddRange(products);
            await db.SaveChangesAsync();

            return Results.Ok(new {
                Message = "Seed data created successfully",
                Categories = categories.Count,
                Brands = brands.Count,
                Products = products.Count
            });
        });

        // ============================================
        // Product Reviews Endpoints
        // ============================================

        // Get reviews for a product
        group.MapGet("/products/{productId:guid}/reviews", async (Guid productId, CatalogDbContext db, bool? approvedOnly = true) =>
        {
            var query = db.ProductReviews
                .AsNoTracking()
                .Where(r => r.ProductId == productId);

            if (approvedOnly == true)
            {
                query = query.Where(r => r.IsApproved);
            }

            var reviews = await query
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    r.Id,
                    r.ProductId,
                    r.CustomerId,
                    r.Rating,
                    r.Title,
                    r.Comment,
                    r.IsVerifiedPurchase,
                    r.IsApproved,
                    r.HelpfulCount,
                    r.CreatedAt
                })
                .ToListAsync();

            return Results.Ok(reviews);
        });

        // Create a new review (Public endpoint)
        group.MapPost("/products/{productId:guid}/reviews", async (
            Guid productId,
            CreateProductReviewDto dto,
            CatalogDbContext db,
            HttpContext context) =>
        {
            // Get user ID from claims if authenticated, otherwise use anonymous
            var userId = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                ?? $"anonymous_{Guid.NewGuid()}";

            // Check if product exists
            var productExists = await db.Products.AnyAsync(p => p.Id == productId);
            if (!productExists)
            {
                return Results.NotFound(new { message = "Sản phẩm không tồn tại" });
            }

            // Check if user already reviewed this product
            var existingReview = await db.ProductReviews
                .FirstOrDefaultAsync(r => r.ProductId == productId && r.CustomerId == userId);

            if (existingReview != null)
            {
                return Results.BadRequest(new { message = "Bạn đã đánh giá sản phẩm này rồi" });
            }

            var review = new ProductReview(
                productId: productId,
                customerId: userId,
                rating: dto.Rating,
                comment: dto.Comment,
                title: dto.Title,
                isVerifiedPurchase: false // Can be updated later based on purchase history
            );

            db.ProductReviews.Add(review);
            await db.SaveChangesAsync();

            return Results.Created($"/api/catalog/products/{productId}/reviews/{review.Id}", new
            {
                review.Id,
                message = "Đánh giá của bạn đang chờ duyệt"
            });
        });

        // Admin: Approve a review
        var reviewsAdmin = app.MapGroup("/api/catalog/reviews/admin")
            .RequireAuthorization(policy => policy.RequireRole("Admin"));

        reviewsAdmin.MapPost("/{reviewId:guid}/approve", async (
            Guid reviewId,
            CatalogDbContext db,
            HttpContext context) =>
        {
            var review = await db.ProductReviews.FindAsync(reviewId);
            if (review == null)
            {
                return Results.NotFound();
            }

            var approverUserId = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "Admin";
            review.Approve(approverUserId);
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Đã duyệt đánh giá thành công" });
        });

        reviewsAdmin.MapGet("/pending", async (CatalogDbContext db) =>
        {
            var pendingReviews = await db.ProductReviews
                .AsNoTracking()
                .Where(r => !r.IsApproved)
                .Join(db.Products,
                    review => review.ProductId,
                    product => product.Id,
                    (review, product) => new
                    {
                        review.Id,
                        review.ProductId,
                        ProductName = product.Name,
                        review.CustomerId,
                        review.Rating,
                        review.Title,
                        review.Comment,
                        review.IsVerifiedPurchase,
                        review.CreatedAt
                    })
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return Results.Ok(pendingReviews);
        });

        // ============================================
        // Related Products Endpoint
        // ============================================

        group.MapGet("/products/{productId:guid}/related", async (Guid productId, CatalogDbContext db, ICacheService cache, int limit = 8) =>
        {
            var cacheKey = CacheKeys.RelatedProductsKey(productId);
            var cachedRelated = await cache.GetAsync<List<dynamic>>(cacheKey);
            if (cachedRelated != null) return Results.Ok(cachedRelated);

            // Get the current product to find related ones
            var product = await db.Products
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == productId);

            if (product == null)
            {
                return Results.NotFound();
            }

            // Find related products: same category or brand, excluding current product
            var relatedProducts = await db.Products
                .AsNoTracking()
                .Include(p => p.Category)
                .Include(p => p.Brand)
                .Where(p => p.IsActive && p.Id != productId)
                .Where(p => p.CategoryId == product.CategoryId || p.BrandId == product.BrandId)
                .OrderByDescending(p => p.CategoryId == product.CategoryId) // Prioritize same category
                .ThenByDescending(p => p.CreatedAt)
                .Take(limit)
                .Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.Description,
                    p.Price,
                    p.OldPrice,
                    p.ImageUrl,
                    p.StockQuantity,
                    Category = new { p.Category.Id, p.Category.Name },
                    Brand = new { p.Brand.Id, p.Brand.Name }
                })
                .ToListAsync<object>();

            // Cache for 30 minutes
            await cache.SetAsync(cacheKey, relatedProducts, TimeSpan.FromMinutes(30));

            return Results.Ok(relatedProducts);
        });
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
    string? WarrantyInfo = null,
    string? StockLocations = null,
    string? ImageUrl = null,
    string? GalleryImages = null);

public record UpdateProductDto(
    string Name,
    string Description,
    decimal Price,
    decimal? OldPrice = null,
    decimal? CostPrice = null,
    Guid? CategoryId = null,
    Guid? BrandId = null,
    int? StockQuantity = null,
    int? LowStockThreshold = null,
    string? Sku = null,
    string? Barcode = null,
    decimal? Weight = null,
    string? Specifications = null,
    string? WarrantyInfo = null,
    string? StockLocations = null,
    string? ImageUrl = null,
    string? GalleryImages = null,
    string? MetaTitle = null,
    string? MetaDescription = null,
    string? MetaKeywords = null);

public record CreateCategoryDto(string Name, string Description);

public record CreateProductReviewDto(int Rating, string Comment, string? Title = null);
public record UpdateCategoryDto(string Name, string Description, bool? IsActive = null);
public record CreateBrandDto(string Name, string Description);
public record UpdateBrandDto(string Name, string Description, bool? IsActive = null);
