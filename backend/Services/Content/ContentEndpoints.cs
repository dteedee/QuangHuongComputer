
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
            await cache.RemoveByPatternAsync("cache:menus*");
            await cache.RemoveByPatternAsync("cache:homepage*");

            return Results.Ok(new { Message = "Content seeded successfully" });
        });

        // Register Dynamic System Endpoints
        MapMenuEndpoints(adminGroup, group);
        MapHomepageEndpoints(adminGroup, group);

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

    // ==================== MENU MANAGEMENT (Admin) ====================

    private static void MapMenuEndpoints(RouteGroupBuilder adminGroup, RouteGroupBuilder publicGroup)
    {
        adminGroup.MapGet("/menus", async (ContentDbContext db) =>
        {
            var menus = await db.Menus
                .Include(m => m.Items)
                .OrderBy(m => m.Location)
                .ThenBy(m => m.DisplayOrder)
                .ToListAsync();
            return Results.Ok(menus);
        });

        adminGroup.MapPost("/menus", async (CreateMenuDto dto, ContentDbContext db, ICacheService cache) =>
        {
            var menu = new Menu(dto.Name, dto.Code, dto.Location, dto.DisplayOrder, dto.CssClass);
            db.Menus.Add(menu);
            await db.SaveChangesAsync();
            await cache.RemoveByPatternAsync("cache:menus*");
            return Results.Created($"/api/content/admin/menus/{menu.Id}", menu);
        });

        adminGroup.MapPut("/menus/{id:guid}", async (Guid id, UpdateMenuDto dto, ContentDbContext db, ICacheService cache) =>
        {
            var menu = await db.Menus.FindAsync(id);
            if (menu == null) return Results.NotFound();

            if (dto.IsActive.HasValue) menu.SetActive(dto.IsActive.Value);
            
            await db.SaveChangesAsync();
            await cache.RemoveByPatternAsync("cache:menus*");
            return Results.Ok(menu);
        });

        adminGroup.MapDelete("/menus/{id:guid}", async (Guid id, ContentDbContext db, ICacheService cache) =>
        {
            var menu = await db.Menus.Include(m => m.Items).FirstOrDefaultAsync(m => m.Id == id);
            if (menu == null) return Results.NotFound();
            
            db.Menus.Remove(menu);
            await db.SaveChangesAsync();
            await cache.RemoveByPatternAsync("cache:menus*");
            return Results.Ok(new { Message = "Menu deleted" });
        });

        // Menu Items
        adminGroup.MapPost("/menus/{menuId:guid}/items", async (Guid menuId, CreateMenuItemDto dto, ContentDbContext db, ICacheService cache) =>
        {
            var menu = await db.Menus.Include(m => m.Items).FirstOrDefaultAsync(m => m.Id == menuId);
            if (menu == null) return Results.NotFound();

            var item = new MenuItem(menuId, dto.Label, dto.Type, dto.Url, dto.Icon, dto.ParentId, dto.DisplayOrder, dto.OpenInNewTab, dto.PageId, dto.CategoryId);
            menu.AddItem(item);
            await db.SaveChangesAsync();
            await cache.RemoveByPatternAsync("cache:menus*");
            return Results.Created($"/api/content/admin/menus/{menuId}/items/{item.Id}", item);
        });

        adminGroup.MapPut("/menus/{menuId:guid}/items/{itemId:guid}", async (Guid menuId, Guid itemId, UpdateMenuItemDto dto, ContentDbContext db, ICacheService cache) =>
        {
            var menu = await db.Menus.Include(m => m.Items).FirstOrDefaultAsync(m => m.Id == menuId);
            if (menu == null) return Results.NotFound();

            var item = menu.Items.FirstOrDefault(i => i.Id == itemId);
            if (item == null) return Results.NotFound();

            item.Update(dto.Label, dto.Url, dto.Icon);
            if (dto.DisplayOrder.HasValue) item.SetDisplayOrder(dto.DisplayOrder.Value);
            if (dto.IsActive.HasValue) item.SetActive(dto.IsActive.Value);

            await db.SaveChangesAsync();
            await cache.RemoveByPatternAsync("cache:menus*");
            return Results.Ok(item);
        });

        adminGroup.MapPut("/menus/{menuId:guid}/items/reorder", async (Guid menuId, ReorderItemsDto dto, ContentDbContext db, ICacheService cache) =>
        {
            var menu = await db.Menus.Include(m => m.Items).FirstOrDefaultAsync(m => m.Id == menuId);
            if (menu == null) return Results.NotFound();

            foreach (var orderItem in dto.Items)
            {
                var item = menu.Items.FirstOrDefault(i => i.Id == orderItem.Id);
                if (item != null) item.SetDisplayOrder(orderItem.DisplayOrder);
            }

            await db.SaveChangesAsync();
            await cache.RemoveByPatternAsync("cache:menus*");
            return Results.Ok(new { Message = "Menu items reordered" });
        });

        adminGroup.MapDelete("/menus/{menuId:guid}/items/{itemId:guid}", async (Guid menuId, Guid itemId, ContentDbContext db, ICacheService cache) =>
        {
            var menu = await db.Menus.Include(m => m.Items).FirstOrDefaultAsync(m => m.Id == menuId);
            if (menu == null) return Results.NotFound();
            
            menu.RemoveItem(itemId);
            await db.SaveChangesAsync();
            await cache.RemoveByPatternAsync("cache:menus*");
            return Results.Ok(new { Message = "Menu item deleted" });
        });

        // Public Menu Endpoint
        publicGroup.MapGet("/menus", async (MenuLocation? location, ContentDbContext db, ICacheService cache) =>
        {
            var cacheKey = $"cache:menus:{location?.ToString() ?? "all"}";
            var cached = await cache.GetAsync<List<dynamic>>(cacheKey);
            if (cached != null) return Results.Ok(cached);

            var query = db.Menus
                .Include(m => m.Items)
                .Where(m => m.IsActive);

            if (location.HasValue)
                query = query.Where(m => m.Location == location.Value);

            var menus = await query
                .OrderBy(m => m.DisplayOrder)
                .Select(m => new
                {
                    m.Id,
                    m.Name,
                    m.Code,
                    m.Location,
                    m.DisplayOrder,
                    m.CssClass,
                    Items = m.Items.Where(i => i.IsActive).OrderBy(i => i.DisplayOrder).Select(i => new
                    {
                        i.Id,
                        i.Label,
                        i.Url,
                        i.Icon,
                        i.ParentId,
                        i.DisplayOrder,
                        i.OpenInNewTab,
                        i.Type,
                        i.CssClass,
                        i.PageId,
                        i.CategoryId
                    })
                })
                .ToListAsync<object>();

            await cache.SetAsync(cacheKey, menus, TimeSpan.FromHours(1));
            return Results.Ok(menus);
        });
    }

    // ==================== HOMEPAGE SECTIONS (Admin) ====================

    private static void MapHomepageEndpoints(RouteGroupBuilder adminGroup, RouteGroupBuilder publicGroup)
    {
        adminGroup.MapGet("/homepage/sections", async (ContentDbContext db) =>
        {
            var sections = await db.HomepageSections
                .OrderBy(s => s.DisplayOrder)
                .ToListAsync();
            return Results.Ok(sections);
        });

        adminGroup.MapPost("/homepage/sections", async (CreateHomepageSectionDto dto, ContentDbContext db, ICacheService cache) =>
        {
            var section = new HomepageSection(dto.SectionType, dto.Title, dto.DisplayOrder, dto.Configuration, dto.IsVisible, dto.CssClass);
            db.HomepageSections.Add(section);
            await db.SaveChangesAsync();
            await cache.RemoveByPatternAsync("cache:homepage*");
            return Results.Created($"/api/content/admin/homepage/sections/{section.Id}", section);
        });

        adminGroup.MapPut("/homepage/sections/{id:guid}", async (Guid id, UpdateHomepageSectionDto dto, ContentDbContext db, ICacheService cache) =>
        {
            var section = await db.HomepageSections.FindAsync(id);
            if (section == null) return Results.NotFound();

            section.Update(dto.Title ?? section.Title, dto.SectionType ?? section.SectionType, dto.Configuration, dto.CssClass);
            if (dto.IsVisible.HasValue) section.SetVisibility(dto.IsVisible.Value);

            await db.SaveChangesAsync();
            await cache.RemoveByPatternAsync("cache:homepage*");
            return Results.Ok(section);
        });

        adminGroup.MapPut("/homepage/sections/reorder", async (ReorderSectionsDto dto, ContentDbContext db, ICacheService cache) =>
        {
            foreach (var item in dto.Sections)
            {
                var section = await db.HomepageSections.FindAsync(item.Id);
                if (section != null) section.SetDisplayOrder(item.DisplayOrder);
            }

            await db.SaveChangesAsync();
            await cache.RemoveByPatternAsync("cache:homepage*");
            return Results.Ok(new { Message = "Sections reordered" });
        });

        adminGroup.MapDelete("/homepage/sections/{id:guid}", async (Guid id, ContentDbContext db, ICacheService cache) =>
        {
            var section = await db.HomepageSections.FindAsync(id);
            if (section == null) return Results.NotFound();

            db.HomepageSections.Remove(section);
            await db.SaveChangesAsync();
            await cache.RemoveByPatternAsync("cache:homepage*");
            return Results.Ok(new { Message = "Section deleted" });
        });

        // Public Homepage Sections
        publicGroup.MapGet("/homepage/sections", async (ContentDbContext db, ICacheService cache) =>
        {
            var cacheKey = "cache:homepage:sections";
            var cached = await cache.GetAsync<List<dynamic>>(cacheKey);
            if (cached != null) return Results.Ok(cached);

            var sections = await db.HomepageSections
                .Where(s => s.IsVisible && s.IsActive)
                .OrderBy(s => s.DisplayOrder)
                .Select(s => new
                {
                    s.Id,
                    s.SectionType,
                    s.Title,
                    s.DisplayOrder,
                    s.Configuration,
                    s.CssClass
                })
                .ToListAsync<object>();

            await cache.SetAsync(cacheKey, sections, TimeSpan.FromMinutes(30));
            return Results.Ok(sections);
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

// Menu DTOs
public record CreateMenuDto(string Name, string Code, MenuLocation Location, int DisplayOrder = 0, string? CssClass = null);
public record UpdateMenuDto(bool? IsActive);
public record CreateMenuItemDto(
    string Label,
    MenuItemType Type = MenuItemType.Custom,
    string? Url = null,
    string? Icon = null,
    Guid? ParentId = null,
    int DisplayOrder = 0,
    bool OpenInNewTab = false,
    Guid? PageId = null,
    Guid? CategoryId = null
);
public record UpdateMenuItemDto(string Label, string? Url = null, string? Icon = null, int? DisplayOrder = null, bool? IsActive = null);
public record ReorderItemsDto(List<OrderItemDto> Items);
public record OrderItemDto(Guid Id, int DisplayOrder);

// Homepage Section DTOs
public record CreateHomepageSectionDto(
    string SectionType,
    string Title,
    int DisplayOrder = 0,
    string? Configuration = null,
    bool IsVisible = true,
    string? CssClass = null
);
public record UpdateHomepageSectionDto(
    string? Title,
    string? SectionType,
    string? Configuration = null,
    string? CssClass = null,
    bool? IsVisible = null
);
public record ReorderSectionsDto(List<OrderItemDto> Sections);
public record VisibilityDto(bool IsVisible);
