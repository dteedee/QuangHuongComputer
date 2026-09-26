using System.Security.Claims;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Paging;
using BuildingBlocks.Repository;
using BuildingBlocks.Security;
using Catalog.Application.Reviews;
using Catalog.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Catalog;

/// <summary>
/// "Phản hồi từ Quang Hưởng" + danh sách đánh giá cho trang quản trị.
/// Mọi route dưới <c>/reviews/admin</c> và đòi <c>Catalog.Manage</c> — khách hàng (kể cả chính
/// người viết đánh giá) không bao giờ ghi được phản hồi của cửa hàng.
/// </summary>
public static class CatalogReviewReplyEndpoints
{
    public static void MapCatalogReviewReplyEndpoints(this IEndpointRouteBuilder group)
    {
        var admin = group.MapGroup("/reviews/admin").RequirePermission(Permissions.Catalog.Manage);

        // status = pending | approved | all (mặc định all); replied = true | false (bỏ trống = tất cả).
        admin.MapGet("/list", async ([AsParameters] PagedRequest paging, string? status, bool? replied,
            CatalogDbContext db, CancellationToken ct) =>
        {
            var query = db.ProductReviews.AsNoTracking().AsQueryable();
            query = status switch
            {
                "pending" => query.Where(r => !r.IsApproved),
                "approved" => query.Where(r => r.IsApproved),
                _ => query,
            };
            if (replied == true) query = query.Where(r => r.ReplyText != null);
            if (replied == false) query = query.Where(r => r.ReplyText == null);
            if (paging.NormalizedSearch is { } search)
                query = query.Where(r => r.Comment.Contains(search) || (r.Title != null && r.Title.Contains(search)));

            var total = await query.CountAsync(ct);
            var rows = await query.OrderByDescending(r => r.CreatedAt).Skip(paging.Skip).Take(paging.Take).ToListAsync(ct);
            var productIds = rows.Select(r => r.ProductId).Distinct().ToList();
            var names = await db.Products.IgnoreQueryFilters().AsNoTracking()
                .Where(p => productIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name, ct);

            var items = rows.Select(r => new AdminReviewView(
                ReviewResponseMapper.ToView(r), names.GetValueOrDefault(r.ProductId), r.RepliedBy)).ToList();
            return Results.Ok(new PagedResult<AdminReviewView>(items, total, paging.Page, paging.PageSize));
        });

        admin.MapPost("/{reviewId:guid}/reply", (Guid reviewId, ReviewReplyDto dto, CatalogDbContext db, HttpContext http, CancellationToken ct)
            => SaveReplyAsync(reviewId, dto, db, http, isEdit: false, ct));

        admin.MapPut("/{reviewId:guid}/reply", (Guid reviewId, ReviewReplyDto dto, CatalogDbContext db, HttpContext http, CancellationToken ct)
            => SaveReplyAsync(reviewId, dto, db, http, isEdit: true, ct));

        admin.MapDelete("/{reviewId:guid}/reply", async (Guid reviewId, CatalogDbContext db, HttpContext http, CancellationToken ct) =>
        {
            var review = await db.ProductReviews.FindAsync(new object?[] { reviewId }, ct);
            if (review == null) return Results.NotFound(new { message = "Không tìm thấy đánh giá" });
            if (!review.HasReply) return Results.NotFound(new { message = "Đánh giá này chưa có phản hồi" });

            review.DeleteReply();
            await db.SaveChangesAsync(ct);
            await http.LogAuditAsync("DeleteReply", "ProductReview", reviewId.ToString(), "Xoá phản hồi của cửa hàng");
            return Results.NoContent();
        });
    }

    private static async Task<IResult> SaveReplyAsync(
        Guid reviewId, ReviewReplyDto dto, CatalogDbContext db, HttpContext http, bool isEdit, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Text))
            throw new RequestValidationException("text", "Nội dung phản hồi là bắt buộc.");
        if (dto.Text.Trim().Length > Domain.ProductReview.MaxReplyLength)
            throw new RequestValidationException("text", $"Phản hồi tối đa {Domain.ProductReview.MaxReplyLength} ký tự.");

        var review = await db.ProductReviews.FindAsync(new object?[] { reviewId }, ct);
        if (review == null) return Results.NotFound(new { message = "Không tìm thấy đánh giá" });

        var staffId = http.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(staffId)) return Results.Unauthorized();

        if (isEdit && !review.HasReply) return Results.NotFound(new { message = "Đánh giá này chưa có phản hồi để sửa" });
        if (!isEdit && review.HasReply)
            return Results.Conflict(new { message = "Đánh giá này đã có phản hồi, hãy sửa phản hồi hiện có" });

        if (isEdit) review.EditReply(dto.Text, staffId, DateTime.UtcNow);
        else review.Reply(dto.Text, staffId, DateTime.UtcNow);
        await db.SaveChangesAsync(ct);
        await http.LogAuditAsync(isEdit ? "EditReply" : "Reply", "ProductReview", reviewId.ToString(), "Phản hồi đánh giá");

        return Results.Ok(ReviewResponseMapper.ToView(review));
    }
}
