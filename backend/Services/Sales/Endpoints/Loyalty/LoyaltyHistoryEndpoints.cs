using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Endpoints.Loyalty;

/// <summary>Sao kê điểm của chính khách hàng. Tách ra để mỗi file dưới 200 dòng.</summary>
internal static partial class LoyaltyEndpoints
{
    private static void MapLoyaltyHistoryEndpoints(RouteGroupBuilder group)
    {
        // Get loyalty transactions history
        group.MapGet("/loyalty/transactions", async (
            SalesDbContext db,
            ClaimsPrincipal user,
            int page = 1,
            int pageSize = 20,
            string? type = null) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            var account = await db.LoyaltyAccounts
                .FirstOrDefaultAsync(l => l.UserId == userId);

            if (account == null)
                return Results.Ok(new { Total = 0, Transactions = new List<object>() });

            var query = db.LoyaltyTransactions
                .Where(t => t.AccountId == account.Id);

            if (!string.IsNullOrEmpty(type) && Enum.TryParse<LoyaltyTransactionType>(type, true, out var transType))
            {
                query = query.Where(t => t.Type == transType);
            }

            var total = await query.CountAsync();
            var transactions = await query
                .OrderByDescending(t => t.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new
                {
                    t.Id,
                    Type = t.Type.ToString(),
                    t.Points,
                    t.Description,
                    t.OrderId,
                    t.ReferenceCode,
                    t.BalanceAfter,
                    t.CreatedAt
                })
                .ToListAsync();

            return Results.Ok(new { Total = total, Transactions = transactions });
        });
    }
}
