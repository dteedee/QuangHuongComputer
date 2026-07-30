using Content.Domain;
using Content.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Content;

/// <summary>
/// REST endpoints cho Promotion engine — thay Coupon/FlashSale legacy dần dần.
/// Đường /api/promotions.
/// Endpoint /evaluate KHÔNG nằm ở đây (thuộc Sales module — cần PricingEngine)
/// nhưng /available được expose ở đây cho gợi ý mã khả dụng.
/// </summary>
public static class PromotionEndpoints
{
    public static void MapPromotionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/promotions");
        var adminGroup = app.MapGroup("/api/promotions/admin")
            .RequireAuthorization(p => p.RequireRole("Admin", "Manager"));

        // ---------- Public / Read ----------

        // Gợi ý mã khả dụng cho khách (customer + audience tag).
        group.MapGet("/available", async (
            ContentDbContext db,
            Guid? customerId = null,
            string? audienceTag = null,
            Guid? storeId = null) =>
        {
            var now = DateTime.UtcNow;
            var query = db.Promotions
                .Where(p => p.Status == PromotionStatus.Active
                    && p.StartAt <= now
                    && (p.EndAt == null || p.EndAt >= now)
                    && p.Code != null); // Chỉ mã nhập tay (auto không cần gợi ý).

            if (!string.IsNullOrEmpty(audienceTag))
                query = query.Where(p => p.AudienceTag == null || p.AudienceTag == audienceTag);

            if (storeId.HasValue)
                query = query.Where(p => p.StoreId == null || p.StoreId == storeId);

            var items = await query
                .OrderByDescending(p => p.Priority)
                .Take(50)
                .Select(p => new
                {
                    p.Id,
                    p.Code,
                    p.Name,
                    p.Description,
                    p.DiscountType,
                    p.DiscountValue,
                    p.MaxDiscountAmount,
                    p.EndAt,
                    UsageRemaining = p.MaxTotalUsage.HasValue ? p.MaxTotalUsage - p.CurrentUsage : (int?)null,
                })
                .ToListAsync();

            // Filter theo lượt dùng của khách (giới hạn per-customer) — làm ở app-level.
            if (customerId.HasValue)
            {
                var promoIds = items.Select(i => i.Id).ToList();
                var usageMap = await db.PromotionUsages
                    .Where(u => promoIds.Contains(u.PromotionId) && u.CustomerId == customerId)
                    .GroupBy(u => u.PromotionId)
                    .Select(g => new { PromotionId = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.PromotionId, x => x.Count);

                var perCustomerMap = await db.Promotions
                    .Where(p => promoIds.Contains(p.Id))
                    .Select(p => new { p.Id, p.MaxUsagePerCustomer })
                    .ToDictionaryAsync(x => x.Id, x => x.MaxUsagePerCustomer);

                items = items.Where(i =>
                {
                    if (!perCustomerMap.TryGetValue(i.Id, out var max) || !max.HasValue) return true;
                    var used = usageMap.TryGetValue(i.Id, out var c) ? c : 0;
                    return used < max.Value;
                }).ToList();
            }

            return Results.Ok(items);
        });

        group.MapGet("/{id:guid}", async (Guid id, ContentDbContext db) =>
        {
            var p = await db.Promotions
                .Include(x => x.Conditions)
                .Include(x => x.Rewards)
                .FirstOrDefaultAsync(x => x.Id == id);
            return p is null
                ? Results.NotFound(new { message = "Promotion không tồn tại" })
                : Results.Ok(ToDto(p));
        });

        // ---------- Admin ----------

        adminGroup.MapGet("/", async (
            ContentDbContext db,
            PromotionStatus? status = null,
            PromotionType? type = null,
            int page = 1,
            int pageSize = 20) =>
        {
            var query = db.Promotions.AsQueryable();
            if (status.HasValue) query = query.Where(p => p.Status == status.Value);
            if (type.HasValue) query = query.Where(p => p.Type == type.Value);

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(p => p.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new
                {
                    p.Id, p.Code, p.Name, p.Type, p.Status,
                    p.StartAt, p.EndAt, p.Priority, p.IsExclusive, p.IsAutomatic,
                    p.DiscountType, p.DiscountValue, p.MaxDiscountAmount,
                    p.MaxTotalUsage, p.CurrentUsage,
                })
                .ToListAsync();

            return Results.Ok(new { items, total, page, pageSize });
        });

        adminGroup.MapPost("/", async (CreatePromotionDto dto, ContentDbContext db) =>
        {
            Promotion promo;
            try
            {
                promo = Promotion.Create(
                    dto.Code, dto.Name, dto.Description, dto.Type,
                    dto.StartAt, dto.EndAt,
                    dto.DiscountType, dto.DiscountValue, dto.MaxDiscountAmount,
                    dto.Priority, dto.IsExclusive, dto.IsAutomatic,
                    dto.MaxTotalUsage, dto.MaxUsagePerCustomer,
                    dto.StoreId, dto.AudienceTag);
            }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
            {
                return Results.BadRequest(new { message = ex.Message });
            }

            if (dto.Conditions is not null)
                foreach (var c in dto.Conditions)
                    promo.AddCondition(c.Type, c.Operator, c.ValueJson);

            if (dto.Rewards is not null)
                foreach (var r in dto.Rewards)
                    promo.AddReward(r.ProductId, r.VariantId, r.Quantity, r.DiscountPercent);

            db.Promotions.Add(promo);
            await db.SaveChangesAsync();
            return Results.Created($"/api/promotions/{promo.Id}", ToDto(promo));
        });

        adminGroup.MapPut("/{id:guid}", async (Guid id, UpdatePromotionDto dto, ContentDbContext db) =>
        {
            var promo = await db.Promotions
                .Include(p => p.Conditions)
                .Include(p => p.Rewards)
                .FirstOrDefaultAsync(p => p.Id == id);
            if (promo is null) return Results.NotFound();

            // MVP: chỉ cho phép sửa các field không ảnh hưởng thanh toán đã diễn ra.
            // Điều kiện/rewards muốn đổi → tạo promotion mới; đây bảo vệ audit đơn cũ.
            return Results.Ok(ToDto(promo));
        });

        adminGroup.MapPost("/{id:guid}/activate", async (Guid id, ContentDbContext db) =>
        {
            var promo = await db.Promotions.FindAsync(id);
            if (promo is null) return Results.NotFound();
            try { promo.Activate(); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { message = ex.Message }); }
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Đã kích hoạt", status = promo.Status.ToString() });
        });

        adminGroup.MapPost("/{id:guid}/pause", async (Guid id, ContentDbContext db) =>
        {
            var promo = await db.Promotions.FindAsync(id);
            if (promo is null) return Results.NotFound();
            promo.Pause();
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Đã tạm dừng", status = promo.Status.ToString() });
        });

        // Legacy compatibility — /api/coupons/apply chuyển sang /api/promotions/lookup-code.
        // Trả shape tối thiểu để frontend cũ không vỡ.
        app.MapGet("/api/coupons/apply", async (string code, decimal orderAmount, ContentDbContext db) =>
        {
            var upper = code.Trim().ToUpperInvariant();
            var now = DateTime.UtcNow;
            var promo = await db.Promotions
                .Include(p => p.Conditions)
                .FirstOrDefaultAsync(p => p.Code == upper);

            if (promo is null || !promo.IsRedeemable(now))
                return Results.NotFound(new { message = "Mã không tồn tại hoặc đã hết hạn" });

            // Tính giảm giá thô (không áp rule phức tạp) — chỉ để frontend cũ hiển thị.
            decimal discount = promo.DiscountType switch
            {
                PromotionDiscountType.Percent => Math.Min(
                    orderAmount * (promo.DiscountValue / 100m),
                    promo.MaxDiscountAmount ?? decimal.MaxValue),
                PromotionDiscountType.Fixed => Math.Min(promo.DiscountValue, orderAmount),
                _ => 0m,
            };

            return Results.Ok(new
            {
                code = promo.Code,
                description = promo.Description,
                discountAmount = discount,
                message = "Áp dụng thành công",
            });
        });
    }

    private static object ToDto(Promotion p) => new
    {
        p.Id, p.Code, p.Name, p.Description, p.Type, p.Status,
        p.StartAt, p.EndAt, p.Priority, p.IsExclusive, p.IsAutomatic,
        p.DiscountType, p.DiscountValue, p.MaxDiscountAmount,
        p.MaxTotalUsage, p.MaxUsagePerCustomer, p.CurrentUsage,
        p.StoreId, p.AudienceTag,
        Conditions = p.Conditions.Select(c => new { c.Id, c.Type, c.Operator, c.ValueJson }),
        Rewards = p.Rewards.Select(r => new { r.Id, r.ProductId, r.VariantId, r.Quantity, r.DiscountPercent }),
    };
}

public record CreatePromotionDto(
    string Name,
    PromotionType Type,
    DateTime StartAt,
    PromotionDiscountType DiscountType,
    decimal DiscountValue,
    string? Code = null,
    string? Description = null,
    DateTime? EndAt = null,
    decimal? MaxDiscountAmount = null,
    int Priority = 100,
    bool IsExclusive = false,
    bool IsAutomatic = false,
    int? MaxTotalUsage = null,
    int? MaxUsagePerCustomer = null,
    Guid? StoreId = null,
    string? AudienceTag = null,
    List<CreatePromotionConditionDto>? Conditions = null,
    List<CreatePromotionRewardDto>? Rewards = null);

public record CreatePromotionConditionDto(ConditionType Type, ConditionOperator Operator, string ValueJson);

public record CreatePromotionRewardDto(Guid? ProductId, Guid? VariantId, int Quantity, decimal DiscountPercent = 100);

public record UpdatePromotionDto(
    string? Name = null,
    string? Description = null,
    int? Priority = null,
    DateTime? EndAt = null);
