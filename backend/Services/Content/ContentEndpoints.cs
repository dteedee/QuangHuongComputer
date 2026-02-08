
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Content.Domain;
using Content.Infrastructure;

namespace Content;

public static class ContentEndpoints
{
    public static void MapContentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/content");

        // ==================== PUBLIC ENDPOINTS ====================

        // Public Posts
        group.MapGet("/posts", async (ContentDbContext db) =>
        {
            return await db.Posts
                .Where(p => p.Status == PostStatus.Published)
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

        // ==================== ADMIN ENDPOINTS ====================

        var adminGroup = group.MapGroup("/admin").RequireAuthorization(policy => policy.RequireRole("Admin", "Manager"));

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
