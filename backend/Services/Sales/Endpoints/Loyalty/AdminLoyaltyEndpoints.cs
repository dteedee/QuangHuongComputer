using System.Security.Claims;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Endpoints.Loyalty;

/// <summary>
/// Điểm thưởng phía QUẢN TRỊ: điều chỉnh tay (có chặn), danh sách tài khoản, thống kê.
/// Tách khỏi nhóm self-service để mỗi file dưới 200 dòng.
/// </summary>
internal static partial class LoyaltyEndpoints
{
    private static void MapAdminLoyaltyEndpoints(RouteGroupBuilder adminGroup)
    {
        // Admin: điều chỉnh điểm — CÓ CHẶN. Bản cũ cộng thẳng `dto.Points` vào số dư, nên một
        // giá trị âm lớn đẩy tài khoản xuống số dư ÂM (và `AdjustPoints` trong domain cũng không
        // kiểm tra). Số dư âm là dữ liệu hỏng: mọi màn hình đọc nó đều hiển thị sai.
        adminGroup.MapPost("/loyalty/{userId}/adjust", async (
            string userId,
            AdjustPointsDto dto,
            SalesDbContext db,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            if (dto.Points == 0)
                throw new RequestValidationException("points", "Số điểm điều chỉnh phải khác 0.");
            if (string.IsNullOrWhiteSpace(dto.Reason))
                throw new RequestValidationException("reason", "Điều chỉnh điểm phải ghi lý do.");

            var account = await db.LoyaltyAccounts.FirstOrDefaultAsync(l => l.UserId == userId, ct)
                ?? throw NotFoundException.For("tài khoản điểm thưởng", userId);

            if (dto.Points < 0 && Math.Abs(dto.Points) > account.AvailablePoints)
                throw new ConflictException(
                    $"Không trừ được {Math.Abs(dto.Points)} điểm: tài khoản chỉ còn {account.AvailablePoints}.");

            var adminId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "System";
            account.AdjustPoints(dto.Points, dto.Reason.Trim(), adminId);

            var transaction = new LoyaltyTransaction(
                account.Id, LoyaltyTransactionType.Adjustment, dto.Points,
                $"{dto.Reason.Trim()} (bởi {adminId})");
            transaction.SetBalanceAfter(account.AvailablePoints);
            db.LoyaltyTransactions.Add(transaction);

            await db.SaveChangesAsync(ct);

            return Results.Ok(new
            {
                message = "Điều chỉnh điểm thành công",
                newBalance = account.AvailablePoints,
                totalPoints = account.TotalPoints,
            });
        }).RequireAuthorization(Permissions.Sales.ManageAll);

        // Admin: Get all loyalty accounts
        adminGroup.MapGet("/loyalty", async (
            SalesDbContext db,
            int page = 1,
            int pageSize = 20,
            string? tier = null) =>
        {
            var query = db.LoyaltyAccounts.AsQueryable();

            if (!string.IsNullOrEmpty(tier) && Enum.TryParse<LoyaltyTier>(tier, true, out var tierValue))
            {
                query = query.Where(l => l.Tier == tierValue);
            }

            var total = await query.CountAsync();
            var accounts = await query
                .OrderByDescending(l => l.LifetimePoints)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(l => new
                {
                    l.Id,
                    l.UserId,
                    l.TotalPoints,
                    l.AvailablePoints,
                    l.LifetimePoints,
                    Tier = l.Tier.ToString(),
                    l.LastActivityAt,
                    l.CreatedAt
                })
                .ToListAsync();

            return Results.Ok(new { Total = total, Accounts = accounts });
        });

        // Admin: Loyalty stats
        adminGroup.MapGet("/loyalty/stats", async (SalesDbContext db) =>
        {
            var stats = new
            {
                TotalAccounts = await db.LoyaltyAccounts.CountAsync(),
                TotalPointsIssued = await db.LoyaltyAccounts.SumAsync(l => l.LifetimePoints),
                TotalPointsAvailable = await db.LoyaltyAccounts.SumAsync(l => l.AvailablePoints),
                TierBreakdown = new
                {
                    Bronze = await db.LoyaltyAccounts.CountAsync(l => l.Tier == LoyaltyTier.Bronze),
                    Silver = await db.LoyaltyAccounts.CountAsync(l => l.Tier == LoyaltyTier.Silver),
                    Gold = await db.LoyaltyAccounts.CountAsync(l => l.Tier == LoyaltyTier.Gold),
                    Platinum = await db.LoyaltyAccounts.CountAsync(l => l.Tier == LoyaltyTier.Platinum),
                    Diamond = await db.LoyaltyAccounts.CountAsync(l => l.Tier == LoyaltyTier.Diamond)
                }
            };

            return Results.Ok(stats);
        });
    }
}
