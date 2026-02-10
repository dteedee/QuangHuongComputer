
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Content.Domain;
using Content.Infrastructure;
using BuildingBlocks.Caching;

namespace Content;

public static class ContentEndpoints
{
    public static void MapContentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/content");

        // ==================== PUBLIC ENDPOINTS ====================

        // Public Posts
        group.MapGet("/posts", async (PostType? type, ContentDbContext db) =>
        {
            var query = db.Posts.Where(p => p.Status == PostStatus.Published);
            
            if (type.HasValue)
            {
                query = query.Where(p => p.Type == type.Value);
            }

            return await query
                .OrderByDescending(p => p.PublishedAt)
                .ToListAsync();
        });

        group.MapGet("/posts/{slug}", async (string slug, ContentDbContext db) =>
        {
            var post = await db.Posts.FirstOrDefaultAsync(p => p.Slug == slug);
            return post is not null ? Results.Ok(post) : Results.NotFound();
        });

        // Public Coupons
        group.MapGet("/coupons/{code}", async (string code, decimal? orderAmount, ContentDbContext db) =>
        {
            var coupon = await db.Coupons.FirstOrDefaultAsync(c => c.Code == code);
            var amount = orderAmount ?? 0;
            if (coupon == null || !coupon.IsValid(amount))
                return Results.NotFound(new { Message = "Mã giảm giá không tồn tại hoặc không hợp lệ" });
            return Results.Ok(new
            {
                coupon.Id,
                coupon.Code,
                coupon.Description,
                coupon.DiscountType,
                coupon.DiscountValue,
                coupon.MinOrderAmount,
                coupon.MaxDiscount,
                coupon.ValidFrom,
                coupon.ValidTo,
                coupon.UsageLimit,
                coupon.UsedCount,
                coupon.IsActive,
                IsValid = coupon.IsValid(amount)
            });
        });

        // Public Banners (For Homepage, Tết Theme, etc.)
        group.MapGet("/banners", async (BannerPosition? position, ContentDbContext db, ICacheService cache) =>
        {
            var cacheKey = CacheKeys.BannersKey(position?.ToString());
            var cachedBanners = await cache.GetAsync<List<dynamic>>(cacheKey);
            if (cachedBanners != null) return Results.Ok(cachedBanners);

            var now = DateTime.UtcNow;
            var query = db.Banners
                .Where(b => b.IsActive && b.StartDate <= now && (b.EndDate == null || b.EndDate >= now));

            if (position.HasValue)
            {
                query = query.Where(b => b.Position == position.Value);
            }

            var banners = await query
                .OrderBy(b => b.DisplayOrder)
                .Select(b => new
                {
                    b.Id,
                    b.Title,
                    b.ImageUrl,
                    b.LinkUrl,
                    b.Position,
                    b.DisplayOrder,
                    b.AltText
                })
                .ToListAsync<object>();

            // Cache for 1 hour
            await cache.SetAsync(cacheKey, banners, TimeSpan.FromHours(1));

            return Results.Ok(banners);
        });

        // ==================== ADMIN ENDPOINTS ====================

        // ==================== PAGES ENDPOINTS ====================

        group.MapGet("/pages/{slug}", async (string slug, ContentDbContext db, ICacheService cache) =>
        {
            var cacheKey = $"cache:page:{slug}";
            var cachedPage = await cache.GetAsync<dynamic>(cacheKey);
            if (cachedPage != null) return Results.Ok(cachedPage);

            var page = await db.Pages.FirstOrDefaultAsync(p => p.Slug == slug && p.IsPublished);
            if (page == null) return Results.NotFound();

            // Cache for 1 hour
            await cache.SetAsync(cacheKey, (object)page, TimeSpan.FromHours(1));

            return Results.Ok(page);
        });

        // ==================== ADMIN ENDPOINTS ====================

        var adminGroup = group.MapGroup("/admin").RequireAuthorization(policy => policy.RequireRole("Admin", "Manager"));

        adminGroup.MapPost("/seed", async (ContentDbContext db, ICacheService cache) =>
        {
            await Content.Infrastructure.Data.ContentDbSeeder.SeedAsync(db);

            // Invalidate all content caches
            await cache.RemoveByPatternAsync("cache:banners*");
            await cache.RemoveByPatternAsync("cache:page*");
            await cache.RemoveByPatternAsync("cache:posts*");

            return Results.Ok(new { Message = "Content seeded successfully" });
        });

        // Page Management
        adminGroup.MapGet("/pages", async (ContentDbContext db) =>
        {
            return await db.Pages.OrderBy(p => p.Title).ToListAsync();
        });

        adminGroup.MapGet("/pages/{id:guid}", async (Guid id, ContentDbContext db) =>
        {
            var page = await db.Pages.FindAsync(id);
            return page != null ? Results.Ok(page) : Results.NotFound();
        });

        adminGroup.MapPost("/pages", async (CreatePageDto model, ContentDbContext db) =>
        {
            var page = new CMSPage(model.Title, model.Slug, model.Content, model.Type);
            if (model.IsPublished) page.Publish();
            
            db.Pages.Add(page);
            await db.SaveChangesAsync();
            return Results.Created($"/api/content/pages/{page.Slug}", page);
        });

        adminGroup.MapPut("/pages/{id:guid}", async (Guid id, UpdatePageDto model, ContentDbContext db) =>
        {
            var page = await db.Pages.FindAsync(id);
            if (page == null) return Results.NotFound();

            page.Update(model.Title, model.Content);
            if (model.IsPublished && !page.IsPublished) page.Publish();
            else if (!model.IsPublished && page.IsPublished) page.Unpublish();

            await db.SaveChangesAsync();
            return Results.Ok(page);
        });

        // Post Management
        adminGroup.MapGet("/posts", async (ContentDbContext db) =>
        {
            return await db.Posts.OrderByDescending(p => p.CreatedAt).ToListAsync();
        });

        adminGroup.MapGet("/posts/{id:guid}", async (Guid id, ContentDbContext db) =>
        {
            var post = await db.Posts.FindAsync(id);
            return post != null ? Results.Ok(post) : Results.NotFound();
        });

        adminGroup.MapPost("/posts", async (CreatePostDto model, ContentDbContext db) =>
        {
            var post = new Post(model.Title, model.Slug, model.Body);
            if (model.IsPublished) post.Publish();

            db.Posts.Add(post);
            await db.SaveChangesAsync();
            return Results.Created($"/api/content/posts/{post.Slug}", post);
        });

        adminGroup.MapPut("/posts/{id:guid}", async (Guid id, UpdatePostDto model, ContentDbContext db) =>
        {
            var post = await db.Posts.FindAsync(id);
            if (post == null) return Results.NotFound();

            post.UpdateDetails(model.Title, model.Body);
            if (model.IsPublished && !post.IsPublished) post.Publish();
            else if (!model.IsPublished && post.IsPublished) post.Unpublish();

            await db.SaveChangesAsync();
            return Results.Ok(post);
        });

        adminGroup.MapDelete("/posts/{id:guid}", async (Guid id, ContentDbContext db) =>
        {
            var post = await db.Posts.FindAsync(id);
            if (post == null) return Results.NotFound();
            db.Posts.Remove(post);
            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Post deleted" });
        });

        // Coupon Management
        adminGroup.MapGet("/coupons", async (ContentDbContext db, string? status = null) =>
        {
            var query = db.Coupons.AsQueryable();

            if (!string.IsNullOrEmpty(status))
            {
                if (status == "active")
                    query = query.Where(c => c.IsActive && c.ValidTo > DateTime.UtcNow);
                else if (status == "expired")
                    query = query.Where(c => !c.IsActive || c.ValidTo <= DateTime.UtcNow);
            }

            return await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
        });

        adminGroup.MapGet("/coupons/{id:guid}", async (Guid id, ContentDbContext db) =>
        {
            var coupon = await db.Coupons.FindAsync(id);
            if (coupon == null)
                return Results.NotFound(new { Error = "Coupon not found" });

            return Results.Ok(coupon);
        });

        adminGroup.MapPost("/coupons", async (CreateCouponDto model, ContentDbContext db) =>
        {
            var coupon = new Coupon(
                model.Code,
                model.Description,
                model.DiscountType,
                model.DiscountValue,
                model.MinOrderAmount,
                model.MaxDiscount,
                model.ValidFrom,
                model.ValidTo,
                model.UsageLimit
            );
            db.Coupons.Add(coupon);
            await db.SaveChangesAsync();
            return Results.Created($"/api/content/admin/coupons/{coupon.Id}", coupon);
        });

        adminGroup.MapPut("/coupons/{id:guid}", async (Guid id, UpdateCouponDto model, ContentDbContext db) =>
        {
            var coupon = await db.Coupons.FindAsync(id);
            if (coupon == null)
                return Results.NotFound(new { Error = "Coupon not found" });

            if (model.Description != null)
                coupon.UpdateDescription(model.Description);

            if (model.DiscountValue.HasValue)
                coupon.UpdateDiscountValue(model.DiscountValue.Value);

            if (model.MinOrderAmount.HasValue)
                coupon.UpdateMinOrderAmount(model.MinOrderAmount.Value);

            if (model.MaxDiscount.HasValue)
                coupon.UpdateMaxDiscount(model.MaxDiscount.Value);

            if (model.ValidFrom.HasValue)
                coupon.UpdateValidFrom(model.ValidFrom.Value);

            if (model.ValidTo.HasValue)
                coupon.UpdateValidTo(model.ValidTo.Value);

            if (model.UsageLimit.HasValue)
                coupon.UpdateUsageLimit(model.UsageLimit.Value);

            if (model.IsActive.HasValue && model.IsActive.Value && !coupon.IsActive)
                coupon.Activate();
            else if (model.IsActive.HasValue && !model.IsActive.Value && coupon.IsActive)
                coupon.Deactivate();

            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                Message = "Coupon updated",
                Coupon = coupon
            });
        });

        adminGroup.MapDelete("/coupons/{id:guid}", async (Guid id, ContentDbContext db) =>
        {
            var coupon = await db.Coupons.FindAsync(id);
            if (coupon == null) return Results.NotFound();
            db.Coupons.Remove(coupon);
            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Coupon deleted" });
        });

        // Validate Coupon (Admin - for testing/validation)
        adminGroup.MapPost("/coupons/validate", async (ValidateCouponDto model, ContentDbContext db) =>
        {
            var coupon = await db.Coupons.FirstOrDefaultAsync(c => c.Code == model.Code.ToUpper());
            if (coupon == null)
                return Results.NotFound(new { Valid = false, Message = "Mã giảm giá không tồn tại" });

            var isValid = coupon.IsValid(model.OrderAmount);
            var discountAmount = 0m;

            if (isValid)
            {
                if (coupon.DiscountType == DiscountType.Percentage)
                {
                    discountAmount = model.OrderAmount * (coupon.DiscountValue / 100);
                    if (coupon.MaxDiscount.HasValue && discountAmount > coupon.MaxDiscount.Value)
                        discountAmount = coupon.MaxDiscount.Value;
                }
                else
                {
                    discountAmount = coupon.DiscountValue;
                }
            }

            return Results.Ok(new
            {
                Valid = isValid,
                Coupon = new
                {
                    coupon.Id,
                    coupon.Code,
                    coupon.Description,
                    coupon.DiscountType,
                    coupon.DiscountValue,
                    coupon.MinOrderAmount,
                    coupon.MaxDiscount,
                    coupon.ValidFrom,
                    coupon.ValidTo,
                    coupon.UsageLimit,
                    coupon.UsedCount,
                    coupon.IsActive
                },
                DiscountAmount = discountAmount,
                FinalAmount = model.OrderAmount - discountAmount,
                Message = isValid ? "Mã giảm giá hợp lệ" : "Mã giảm giá không hợp lệ",
                Reasons = !isValid ? new[] {
                    !coupon.IsActive ? "Mã giảm giá đã bị vô hiệu hóa" : null,
                    coupon.ValidTo < DateTime.UtcNow ? "Mã giảm giá đã hết hạn" : null,
                    coupon.UsageLimit.HasValue && coupon.UsedCount >= coupon.UsageLimit ? "Mã giảm giá đã hết lượt sử dụng" : null,
                    model.OrderAmount < coupon.MinOrderAmount ? $"Đơn hàng tối thiểu {coupon.MinOrderAmount:N0}đ" : null
                }.Where(r => r != null).ToArray() : null
            });
        });

        // Banner Management (Admin)
        adminGroup.MapGet("/banners", async (ContentDbContext db) =>
        {
            var banners = await db.Banners
                .OrderBy(b => b.Position)
                .ThenBy(b => b.DisplayOrder)
                .ToListAsync();
            return Results.Ok(banners);
        });

        adminGroup.MapPost("/banners", async (CreateBannerDto dto, ContentDbContext db, ICacheService cache) =>
        {
            var banner = new Banner(
                name: dto.Title,
                imageUrl: dto.ImageUrl,
                position: dto.Position,
                linkUrl: dto.LinkUrl,
                title: dto.Title,
                startDate: dto.StartDate,
                endDate: dto.EndDate,
                displayOrder: dto.DisplayOrder,
                altText: dto.AltText
            );

            if (!dto.IsActive)
            {
                banner.SetActive(false);
            }

            db.Banners.Add(banner);
            await db.SaveChangesAsync();

            // Invalidate banner caches
            await cache.RemoveByPatternAsync(CacheKeys.BannersPattern);

            return Results.Created($"/api/content/admin/banners/{banner.Id}", banner);
        });

        adminGroup.MapPut("/banners/{id:guid}", async (Guid id, UpdateBannerDto dto, ContentDbContext db, ICacheService cache) =>
        {
            var banner = await db.Banners.FindAsync(id);
            if (banner == null)
            {
                return Results.NotFound();
            }

            banner.Update(dto.Title, dto.ImageUrl, dto.LinkUrl);

            if (dto.DisplayOrder.HasValue)
            {
                banner.SetDisplayOrder(dto.DisplayOrder.Value);
            }

            if (dto.IsActive.HasValue)
            {
                banner.SetActive(dto.IsActive.Value);
            }

            await db.SaveChangesAsync();

            // Invalidate banner caches
            await cache.RemoveByPatternAsync(CacheKeys.BannersPattern);

            return Results.Ok(banner);
        });
        adminGroup.MapDelete("/banners/{id:guid}", async (Guid id, ContentDbContext db, ICacheService cache) =>
        {
            var banner = await db.Banners.FindAsync(id);
            if (banner == null)
            {
                return Results.NotFound();
            }

            db.Banners.Remove(banner);
            await db.SaveChangesAsync();

            // Invalidate banner caches
            await cache.RemoveByPatternAsync(CacheKeys.BannersPattern);

            return Results.Ok(new { Message = "Banner deleted successfully" });
        });
    }
}

// ==================== DTOs ====================

public record CreatePostDto(string Title, string Slug, string Body, bool IsPublished);
public record UpdatePostDto(string Title, string Body, bool IsPublished);

public record CreateCouponDto(
    string Code,
    string Description,
    DiscountType DiscountType,
    decimal DiscountValue,
    decimal MinOrderAmount,
    decimal? MaxDiscount,
    DateTime ValidFrom,
    DateTime ValidTo,
    int? UsageLimit
);

public record UpdateCouponDto(
    string? Description,
    decimal? DiscountValue,
    decimal? MinOrderAmount,
    decimal? MaxDiscount,
    DateTime? ValidFrom,
    DateTime? ValidTo,
    int? UsageLimit,
    bool? IsActive
);

public record ValidateCouponDto(
    string Code,
    decimal OrderAmount
);

public record CreatePageDto(string Title, string Slug, string Content, PageType Type, bool IsPublished);
public record UpdatePageDto(string Title, string Content, bool IsPublished);

public record CreateBannerDto(
    string Title,
    string ImageUrl,
    string? LinkUrl,
    BannerPosition Position,
    int DisplayOrder,
    string? AltText = null,
    DateTime? StartDate = null,
    DateTime? EndDate = null,
    bool IsActive = true
);

public record UpdateBannerDto(
    string Title,
    string ImageUrl,
    string? LinkUrl,
    string? AltText = null,
    int? DisplayOrder = null,
    DateTime? StartDate = null,
    DateTime? EndDate = null,
    bool? IsActive = null
);
