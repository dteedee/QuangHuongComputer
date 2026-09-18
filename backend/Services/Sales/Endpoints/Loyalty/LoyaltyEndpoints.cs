using System.Security.Claims;
using System.Text.Json;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using BuildingBlocks.SharedKernel;
using BuildingBlocks.Validation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Sales.Domain;
using Sales.Infrastructure;
using Catalog.Infrastructure;
using InventoryModule.Infrastructure;
using Content.Infrastructure;
using Content.Domain;
using Sales.Application.Pricing;
using MassTransit;
using BuildingBlocks.Messaging.IntegrationEvents;

namespace Sales.Endpoints.Loyalty;

/// <summary>
/// Điểm thưởng — trích NGUYÊN VĂN bởi W2-3. Từ commit này thuộc **W2-10**.
/// </summary>
internal static partial class LoyaltyEndpoints
{
    public static void MapLoyaltyEndpoints(RouteGroupBuilder group, RouteGroupBuilder adminGroup)
    {
        // ==================== LOYALTY POINTS ENDPOINTS ====================

        // Get user's loyalty account
        group.MapGet("/loyalty", async (SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            var account = await db.LoyaltyAccounts
                .FirstOrDefaultAsync(l => l.UserId == userId);

            if (account == null)
            {
                // Auto-create account for new users
                account = new LoyaltyAccount(userId);
                db.LoyaltyAccounts.Add(account);
                await db.SaveChangesAsync();
            }

            return Results.Ok(new
            {
                account.Id,
                account.UserId,
                account.TotalPoints,
                account.AvailablePoints,
                account.LifetimePoints,
                Tier = account.Tier.ToString(),
                TierLevel = (int)account.Tier,
                PointsMultiplier = account.GetPointsMultiplier(),
                account.LastActivityAt,
                account.TierExpiresAt,
                NextTierPoints = GetNextTierPoints(account.Tier, account.LifetimePoints),
                RedemptionValue = LoyaltyAccount.CalculateRedemptionValue(account.AvailablePoints)
            });
        });

        MapLoyaltyHistoryEndpoints(group);

        // Redeem points
        group.MapPost("/loyalty/redeem", async (
            RedeemPointsDto dto,
            SalesDbContext db,
            ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            var account = await db.LoyaltyAccounts
                .FirstOrDefaultAsync(l => l.UserId == userId);

            if (account == null)
                return Results.NotFound(new { message = "Tài khoản loyalty không tồn tại" });

            if (dto.Points <= 0)
                return Results.BadRequest(new { message = "Số điểm phải lớn hơn 0" });

            if (dto.Points > account.AvailablePoints)
                return Results.BadRequest(new { message = $"Không đủ điểm. Hiện có: {account.AvailablePoints} điểm" });

            try
            {
                var redemptionValue = LoyaltyAccount.CalculateRedemptionValue(dto.Points);
                account.RedeemPoints(dto.Points, dto.Description ?? "Đổi điểm lấy giảm giá", dto.OrderId);

                // Create transaction record
                var transaction = new LoyaltyTransaction(
                    account.Id,
                    LoyaltyTransactionType.Redeem,
                    -dto.Points,
                    dto.Description ?? "Đổi điểm lấy giảm giá",
                    dto.OrderId
                );
                transaction.SetBalanceAfter(account.AvailablePoints);
                db.LoyaltyTransactions.Add(transaction);

                await db.SaveChangesAsync();

                return Results.Ok(new
                {
                    message = "Đổi điểm thành công",
                    pointsRedeemed = dto.Points,
                    redemptionValue,
                    remainingPoints = account.AvailablePoints
                });
            }
            catch (InvalidOperationException)
            {
                // Domain đã kiểm số dư ở trên; đến đây chỉ còn là tranh chấp đồng thời.
                return Results.BadRequest(new { message = "Số dư điểm vừa thay đổi. Vui lòng thử lại." });
            }
        });

        // Calculate points for order (preview)
        group.MapGet("/loyalty/calculate/{orderAmount:decimal}", async (
            decimal orderAmount,
            SalesDbContext db,
            ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var multiplier = 1.0m;

            if (!string.IsNullOrEmpty(userId))
            {
                var account = await db.LoyaltyAccounts
                    .FirstOrDefaultAsync(l => l.UserId == userId);

                if (account != null)
                {
                    multiplier = account.GetPointsMultiplier();
                }
            }

            var points = LoyaltyAccount.CalculatePointsForOrder(orderAmount, multiplier);

            return Results.Ok(new
            {
                orderAmount,
                multiplier,
                pointsToEarn = points,
                message = $"Bạn sẽ nhận được {points} điểm cho đơn hàng này"
            });
        });

        MapAdminLoyaltyEndpoints(adminGroup);
    }

    private static object? GetNextTierPoints(LoyaltyTier currentTier, int lifetimePoints)
    {
        return currentTier switch
        {
            LoyaltyTier.Bronze => new { nextTier = "Silver", pointsNeeded = 5000 - lifetimePoints },
            LoyaltyTier.Silver => new { nextTier = "Gold", pointsNeeded = 20000 - lifetimePoints },
            LoyaltyTier.Gold => new { nextTier = "Platinum", pointsNeeded = 50000 - lifetimePoints },
            LoyaltyTier.Platinum => new { nextTier = "Diamond", pointsNeeded = 100000 - lifetimePoints },
            _ => null // Diamond is max
        };
    }
}
