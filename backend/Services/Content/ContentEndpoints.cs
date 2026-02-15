
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

        // ==================== FLASH SALES PUBLIC ENDPOINTS ====================

        // Get active flash sales
        group.MapGet("/flash-sales/active", async (ContentDbContext db, ICacheService cache) =>
        {
            var cacheKey = "cache:flash-sales:active";
            var cached = await cache.GetAsync<List<object>>(cacheKey);
            if (cached != null) return Results.Ok(cached);

            var now = DateTime.UtcNow;

            // Update statuses first
            var flashSalesToUpdate = await db.FlashSales
                .Where(f => f.IsActive)
                .ToListAsync();

            foreach (var fs in flashSalesToUpdate)
            {
                fs.UpdateStatus();
            }
            await db.SaveChangesAsync();

            var flashSales = await db.FlashSales
                .Where(f => f.IsActive && f.Status == FlashSaleStatus.Active)
                .OrderBy(f => f.DisplayOrder)
                .Select(f => new
                {
                    f.Id,
                    f.Name,
                    f.Description,
                    f.ImageUrl,
                    f.BannerImageUrl,
                    f.DiscountType,
                    f.DiscountValue,
                    f.MaxDiscount,
                    f.StartTime,
                    f.EndTime,
                    f.ProductIds,
                    f.CategoryIds,
                    f.ApplyToAllProducts,
                    f.MaxQuantityPerOrder,
                    f.TotalQuantityLimit,
                    f.SoldQuantity,
                    f.BadgeText,
                    f.BadgeColor,
                    f.Status,
                    TimeRemaining = f.EndTime > now ? (f.EndTime - now).TotalSeconds : 0
                })
                .ToListAsync<object>();

            // Cache for 1 minute (flash sales need frequent updates)
            await cache.SetAsync(cacheKey, flashSales, TimeSpan.FromMinutes(1));

            return Results.Ok(flashSales);
        });

        // Get upcoming flash sales
        group.MapGet("/flash-sales/upcoming", async (ContentDbContext db) =>
        {
            var now = DateTime.UtcNow;

            var flashSales = await db.FlashSales
                .Where(f => f.IsActive && f.StartTime > now)
                .OrderBy(f => f.StartTime)
                .Take(5)
                .Select(f => new
                {
                    f.Id,
                    f.Name,
                    f.Description,
                    f.ImageUrl,
                    f.BannerImageUrl,
                    f.DiscountType,
                    f.DiscountValue,
                    f.StartTime,
                    f.EndTime,
                    f.BadgeText,
                    f.BadgeColor,
                    TimeUntilStart = (f.StartTime - now).TotalSeconds
                })
                .ToListAsync();

            return Results.Ok(flashSales);
        });

        // Get flash sale by ID
        group.MapGet("/flash-sales/{id:guid}", async (Guid id, ContentDbContext db) =>
        {
            var flashSale = await db.FlashSales.FindAsync(id);
            if (flashSale == null)
                return Results.NotFound(new { message = "Flash Sale không tồn tại" });

            flashSale.UpdateStatus();
            await db.SaveChangesAsync();

            var now = DateTime.UtcNow;
            return Results.Ok(new
            {
                flashSale.Id,
                flashSale.Name,
                flashSale.Description,
                flashSale.ImageUrl,
                flashSale.BannerImageUrl,
                flashSale.DiscountType,
                flashSale.DiscountValue,
                flashSale.MaxDiscount,
                flashSale.StartTime,
                flashSale.EndTime,
                flashSale.ProductIds,
                flashSale.CategoryIds,
                flashSale.ApplyToAllProducts,
                flashSale.MaxQuantityPerOrder,
                flashSale.TotalQuantityLimit,
                flashSale.SoldQuantity,
                flashSale.BadgeText,
                flashSale.BadgeColor,
                flashSale.Status,
                flashSale.IsActive,
                IsCurrentlyActive = flashSale.IsCurrentlyActive(),
                TimeRemaining = flashSale.EndTime > now ? (flashSale.EndTime - now).TotalSeconds : 0
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

        // ==================== CONTACT ENDPOINTS ====================

        // Submit contact message (Public)
        group.MapPost("/contact", async (CreateContactMessageDto dto, ContentDbContext db, HttpContext httpContext) =>
        {
            var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString();

            var message = new ContactMessage(
                fullName: dto.FullName,
                phone: dto.Phone,
                email: dto.Email,
                subject: dto.Subject,
                message: dto.Message,
                ipAddress: ipAddress
            );

            db.ContactMessages.Add(message);
            await db.SaveChangesAsync();

            return Results.Created($"/api/content/contact/{message.Id}", new
            {
                message = "Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi trong thời gian sớm nhất.",
                id = message.Id
            });
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

        // ==================== FLASH SALES ADMIN ENDPOINTS ====================

        // Get all flash sales (Admin)
        adminGroup.MapGet("/flash-sales", async (ContentDbContext db, string? status = null) =>
        {
            var query = db.FlashSales.AsQueryable();

            if (!string.IsNullOrEmpty(status) && Enum.TryParse<FlashSaleStatus>(status, true, out var statusEnum))
            {
                query = query.Where(f => f.Status == statusEnum);
            }

            var flashSales = await query
                .OrderByDescending(f => f.CreatedAt)
                .Select(f => new
                {
                    f.Id,
                    f.Name,
                    f.Description,
                    f.DiscountType,
                    f.DiscountValue,
                    f.StartTime,
                    f.EndTime,
                    f.Status,
                    f.IsActive,
                    f.TotalQuantityLimit,
                    f.SoldQuantity,
                    f.DisplayOrder,
                    f.CreatedAt
                })
                .ToListAsync();

            return Results.Ok(flashSales);
        });

        // Get flash sale detail (Admin)
        adminGroup.MapGet("/flash-sales/{id:guid}", async (Guid id, ContentDbContext db) =>
        {
            var flashSale = await db.FlashSales.FindAsync(id);
            if (flashSale == null)
                return Results.NotFound(new { message = "Flash Sale không tồn tại" });

            return Results.Ok(flashSale);
        });

        // Create flash sale (Admin)
        adminGroup.MapPost("/flash-sales", async (CreateFlashSaleDto dto, ContentDbContext db, ICacheService cache) =>
        {
            var flashSale = new FlashSale(
                name: dto.Name,
                description: dto.Description,
                discountType: dto.DiscountType,
                discountValue: dto.DiscountValue,
                startTime: dto.StartTime,
                endTime: dto.EndTime,
                maxDiscount: dto.MaxDiscount,
                imageUrl: dto.ImageUrl,
                bannerImageUrl: dto.BannerImageUrl,
                productIds: dto.ProductIds,
                categoryIds: dto.CategoryIds,
                applyToAllProducts: dto.ApplyToAllProducts,
                maxQuantityPerOrder: dto.MaxQuantityPerOrder,
                totalQuantityLimit: dto.TotalQuantityLimit,
                displayOrder: dto.DisplayOrder,
                badgeText: dto.BadgeText,
                badgeColor: dto.BadgeColor
            );

            // Auto-activate if start time is now or past
            if (dto.StartTime <= DateTime.UtcNow && dto.EndTime > DateTime.UtcNow)
            {
                flashSale.Activate();
            }

            db.FlashSales.Add(flashSale);
            await db.SaveChangesAsync();

            // Invalidate cache
            await cache.RemoveByPatternAsync("cache:flash-sales*");

            return Results.Created($"/api/content/admin/flash-sales/{flashSale.Id}", new
            {
                flashSale.Id,
                flashSale.Name,
                flashSale.Status,
                message = "Flash Sale đã được tạo thành công"
            });
        });

        // Update flash sale (Admin)
        adminGroup.MapPut("/flash-sales/{id:guid}", async (Guid id, UpdateFlashSaleDto dto, ContentDbContext db, ICacheService cache) =>
        {
            var flashSale = await db.FlashSales.FindAsync(id);
            if (flashSale == null)
                return Results.NotFound(new { message = "Flash Sale không tồn tại" });

            flashSale.UpdateDetails(
                name: dto.Name ?? flashSale.Name,
                description: dto.Description ?? flashSale.Description,
                discountType: dto.DiscountType ?? flashSale.DiscountType,
                discountValue: dto.DiscountValue ?? flashSale.DiscountValue,
                startTime: dto.StartTime ?? flashSale.StartTime,
                endTime: dto.EndTime ?? flashSale.EndTime,
                maxDiscount: dto.MaxDiscount,
                imageUrl: dto.ImageUrl,
                bannerImageUrl: dto.BannerImageUrl,
                productIds: dto.ProductIds,
                categoryIds: dto.CategoryIds,
                applyToAllProducts: dto.ApplyToAllProducts ?? flashSale.ApplyToAllProducts,
                maxQuantityPerOrder: dto.MaxQuantityPerOrder,
                totalQuantityLimit: dto.TotalQuantityLimit,
                displayOrder: dto.DisplayOrder ?? flashSale.DisplayOrder,
                badgeText: dto.BadgeText,
                badgeColor: dto.BadgeColor
            );

            flashSale.UpdateStatus();
            await db.SaveChangesAsync();

            // Invalidate cache
            await cache.RemoveByPatternAsync("cache:flash-sales*");

            return Results.Ok(new { message = "Flash Sale đã được cập nhật", flashSale });
        });

        // Activate flash sale (Admin)
        adminGroup.MapPost("/flash-sales/{id:guid}/activate", async (Guid id, ContentDbContext db, ICacheService cache) =>
        {
            var flashSale = await db.FlashSales.FindAsync(id);
            if (flashSale == null)
                return Results.NotFound(new { message = "Flash Sale không tồn tại" });

            try
            {
                flashSale.Activate();
                await db.SaveChangesAsync();
                await cache.RemoveByPatternAsync("cache:flash-sales*");
                return Results.Ok(new { message = "Flash Sale đã được kích hoạt", status = flashSale.Status.ToString() });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { message = ex.Message });
            }
        });

        // Deactivate flash sale (Admin)
        adminGroup.MapPost("/flash-sales/{id:guid}/deactivate", async (Guid id, ContentDbContext db, ICacheService cache) =>
        {
            var flashSale = await db.FlashSales.FindAsync(id);
            if (flashSale == null)
                return Results.NotFound(new { message = "Flash Sale không tồn tại" });

            flashSale.Deactivate();
            await db.SaveChangesAsync();
            await cache.RemoveByPatternAsync("cache:flash-sales*");

            return Results.Ok(new { message = "Flash Sale đã được hủy", status = flashSale.Status.ToString() });
        });

        // Delete flash sale (Admin)
        adminGroup.MapDelete("/flash-sales/{id:guid}", async (Guid id, ContentDbContext db, ICacheService cache) =>
        {
            var flashSale = await db.FlashSales.FindAsync(id);
            if (flashSale == null)
                return Results.NotFound(new { message = "Flash Sale không tồn tại" });

            db.FlashSales.Remove(flashSale);
            await db.SaveChangesAsync();
            await cache.RemoveByPatternAsync("cache:flash-sales*");

            return Results.Ok(new { message = "Flash Sale đã được xóa" });
        });

        // Get flash sale statistics (Admin)
        adminGroup.MapGet("/flash-sales/stats", async (ContentDbContext db) =>
        {
            var now = DateTime.UtcNow;

            var stats = new
            {
                Total = await db.FlashSales.CountAsync(),
                Active = await db.FlashSales.CountAsync(f => f.Status == FlashSaleStatus.Active && f.IsActive),
                Scheduled = await db.FlashSales.CountAsync(f => f.Status == FlashSaleStatus.Scheduled && f.IsActive),
                Ended = await db.FlashSales.CountAsync(f => f.Status == FlashSaleStatus.Ended),
                TotalSold = await db.FlashSales.SumAsync(f => f.SoldQuantity)
            };

            return Results.Ok(stats);
        });

        // ==================== CONTACT MESSAGE ADMIN ENDPOINTS ====================

        // Get all contact messages
        adminGroup.MapGet("/contact-messages", async (
            ContentDbContext db,
            ContactMessageStatus? status = null,
            int page = 1,
            int pageSize = 20) =>
        {
            var query = db.ContactMessages.AsQueryable();

            if (status.HasValue)
            {
                query = query.Where(c => c.Status == status.Value);
            }

            var total = await query.CountAsync();
            var messages = await query
                .OrderByDescending(c => c.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(c => new
                {
                    c.Id,
                    c.FullName,
                    c.Phone,
                    c.Email,
                    c.Subject,
                    c.Message,
                    c.Status,
                    c.AdminNotes,
                    c.RepliedBy,
                    c.RepliedAt,
                    c.IpAddress,
                    c.CreatedAt,
                    c.UpdatedAt
                })
                .ToListAsync();

            return Results.Ok(new
            {
                messages,
                total,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling(total / (double)pageSize)
            });
        });

        // Get contact message by ID
        adminGroup.MapGet("/contact-messages/{id:guid}", async (Guid id, ContentDbContext db) =>
        {
            var message = await db.ContactMessages.FindAsync(id);
            if (message == null)
                return Results.NotFound(new { message = "Tin nhắn không tồn tại" });

            return Results.Ok(message);
        });

        // Mark as read
        adminGroup.MapPost("/contact-messages/{id:guid}/read", async (Guid id, ContentDbContext db) =>
        {
            var message = await db.ContactMessages.FindAsync(id);
            if (message == null)
                return Results.NotFound(new { message = "Tin nhắn không tồn tại" });

            message.MarkAsRead();
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Đã đánh dấu đã đọc", status = message.Status.ToString() });
        });

        // Mark as replied
        adminGroup.MapPost("/contact-messages/{id:guid}/reply", async (
            Guid id,
            ReplyContactMessageDto dto,
            ContentDbContext db,
            HttpContext httpContext) =>
        {
            var message = await db.ContactMessages.FindAsync(id);
            if (message == null)
                return Results.NotFound(new { message = "Tin nhắn không tồn tại" });

            var repliedBy = httpContext.User.Identity?.Name ?? "Admin";
            message.MarkAsReplied(repliedBy, dto.Notes);
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Đã đánh dấu đã trả lời", status = message.Status.ToString() });
        });

        // Add notes
        adminGroup.MapPost("/contact-messages/{id:guid}/notes", async (
            Guid id,
            AddContactNotesDto dto,
            ContentDbContext db) =>
        {
            var message = await db.ContactMessages.FindAsync(id);
            if (message == null)
                return Results.NotFound(new { message = "Tin nhắn không tồn tại" });

            message.AddNotes(dto.Notes);
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Đã thêm ghi chú" });
        });

        // Archive message
        adminGroup.MapPost("/contact-messages/{id:guid}/archive", async (Guid id, ContentDbContext db) =>
        {
            var message = await db.ContactMessages.FindAsync(id);
            if (message == null)
                return Results.NotFound(new { message = "Tin nhắn không tồn tại" });

            message.Archive();
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Đã lưu trữ tin nhắn", status = message.Status.ToString() });
        });

        // Delete message
        adminGroup.MapDelete("/contact-messages/{id:guid}", async (Guid id, ContentDbContext db) =>
        {
            var message = await db.ContactMessages.FindAsync(id);
            if (message == null)
                return Results.NotFound(new { message = "Tin nhắn không tồn tại" });

            db.ContactMessages.Remove(message);
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Đã xóa tin nhắn" });
        });

        // Get contact message statistics
        adminGroup.MapGet("/contact-messages/stats", async (ContentDbContext db) =>
        {
            var stats = new
            {
                Total = await db.ContactMessages.CountAsync(),
                New = await db.ContactMessages.CountAsync(c => c.Status == ContactMessageStatus.New),
                Read = await db.ContactMessages.CountAsync(c => c.Status == ContactMessageStatus.Read),
                Replied = await db.ContactMessages.CountAsync(c => c.Status == ContactMessageStatus.Replied),
                Archived = await db.ContactMessages.CountAsync(c => c.Status == ContactMessageStatus.Archived)
            };

            return Results.Ok(stats);
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

// Flash Sale DTOs
public record CreateFlashSaleDto(
    string Name,
    string Description,
    DiscountType DiscountType,
    decimal DiscountValue,
    DateTime StartTime,
    DateTime EndTime,
    decimal? MaxDiscount = null,
    string? ImageUrl = null,
    string? BannerImageUrl = null,
    string? ProductIds = null,
    string? CategoryIds = null,
    bool ApplyToAllProducts = false,
    int? MaxQuantityPerOrder = null,
    int? TotalQuantityLimit = null,
    int DisplayOrder = 0,
    string? BadgeText = null,
    string? BadgeColor = null
);

public record UpdateFlashSaleDto(
    string? Name = null,
    string? Description = null,
    DiscountType? DiscountType = null,
    decimal? DiscountValue = null,
    DateTime? StartTime = null,
    DateTime? EndTime = null,
    decimal? MaxDiscount = null,
    string? ImageUrl = null,
    string? BannerImageUrl = null,
    string? ProductIds = null,
    string? CategoryIds = null,
    bool? ApplyToAllProducts = null,
    int? MaxQuantityPerOrder = null,
    int? TotalQuantityLimit = null,
    int? DisplayOrder = null,
    string? BadgeText = null,
    string? BadgeColor = null
);

// Contact Message DTOs
public record CreateContactMessageDto(
    string FullName,
    string Phone,
    string? Email,
    string Subject,
    string Message
);

public record ReplyContactMessageDto(string? Notes = null);
public record AddContactNotesDto(string Notes);
