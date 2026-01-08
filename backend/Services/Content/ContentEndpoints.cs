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

        // Public Posts
        group.MapGet("/posts", async (ContentDbContext db) =>
        {
            return await db.Posts
                .Where(p => p.IsPublished)
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
            return Results.Ok(coupon);
        });

        // Admin Endpoints
        var adminGroup = group.MapGroup("/admin").RequireAuthorization(policy => policy.RequireRole("Admin", "Manager"));

        // Post Management
        adminGroup.MapGet("/posts", async (ContentDbContext db) =>
        {
            return await db.Posts.OrderByDescending(p => p.CreatedAt).ToListAsync();
        });

        adminGroup.MapPost("/posts", async (CreatePostDto model, ContentDbContext db) =>
        {
            var post = new Post(model.Title, model.Slug, model.Body, model.Type);
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
        adminGroup.MapGet("/coupons", async (ContentDbContext db) =>
        {
            return await db.Coupons.ToListAsync();
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
                model.ValidUntil,
                model.UsageLimit
            );
            db.Coupons.Add(coupon);
            await db.SaveChangesAsync();
            return Results.Created($"/api/content/admin/coupons/{coupon.Id}", coupon);
        });

        adminGroup.MapDelete("/coupons/{id:guid}", async (Guid id, ContentDbContext db) =>
        {
            var coupon = await db.Coupons.FindAsync(id);
            if (coupon == null) return Results.NotFound();
            db.Coupons.Remove(coupon);
            await db.SaveChangesAsync();
            return Results.Ok(new { Message = "Coupon deleted" });
        });
    }
}

public record CreatePostDto(string Title, string Slug, string Body, PostType Type, bool IsPublished);
public record UpdatePostDto(string Title, string Body, bool IsPublished);
public record CreateCouponDto(
    string Code,
    string Description,
    DiscountType DiscountType,
    decimal DiscountValue,
    decimal MinOrderAmount,
    decimal? MaxDiscount,
    DateTime ValidFrom,
    DateTime ValidUntil,
    int? UsageLimit
);
