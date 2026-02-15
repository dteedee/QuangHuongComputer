using CRM.Domain;
using CRM.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CRM.Services;

public class RfmCalculationService : IRfmCalculationService
{
    private readonly CrmDbContext _crmDb;
    private readonly ILogger<RfmCalculationService> _logger;

    // RFM Thresholds (configurable)
    private static readonly int[] RecencyDaysThresholds = { 30, 60, 90, 180 }; // <= 30 = 5, <= 60 = 4, etc.
    private static readonly int[] FrequencyCountThresholds = { 10, 5, 3, 1 }; // >= 10 = 5, >= 5 = 4, etc.
    private static readonly decimal[] MonetaryAmountThresholds = { 50_000_000m, 20_000_000m, 10_000_000m, 5_000_000m }; // VND

    public RfmCalculationService(
        CrmDbContext crmDb,
        ILogger<RfmCalculationService> logger)
    {
        _crmDb = crmDb;
        _logger = logger;
    }

    public async Task<CustomerAnalytics?> CalculateForCustomerAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        // Get or create CustomerAnalytics record
        var analytics = await _crmDb.CustomerAnalytics
            .FirstOrDefaultAsync(c => c.UserId == userId, cancellationToken);

        if (analytics == null)
        {
            analytics = new CustomerAnalytics(userId);
            _crmDb.CustomerAnalytics.Add(analytics);
        }

        // Get order data from Sales database (cross-database query via connection)
        // In real implementation, this would query Sales.Orders
        // For now, we'll simulate with placeholder logic
        var orderStats = await GetOrderStatsForUser(userId, cancellationToken);

        // Calculate RFM scores
        int recencyScore = GetRecencyScore(orderStats.DaysSinceLastPurchase);
        int frequencyScore = GetFrequencyScore(orderStats.OrderCount);
        int monetaryScore = GetMonetaryScore(orderStats.TotalSpent);

        // Update analytics
        analytics.UpdateOrderStats(
            orderStats.OrderCount,
            orderStats.TotalSpent,
            orderStats.FirstPurchaseDate,
            orderStats.LastPurchaseDate);

        analytics.UpdateRfmScores(recencyScore, frequencyScore, monetaryScore);

        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Calculated RFM for user {UserId}: R={Recency}, F={Frequency}, M={Monetary}, Total={Total}",
            userId, recencyScore, frequencyScore, monetaryScore, analytics.TotalRfmScore);

        return analytics;
    }

    public async Task<int> CalculateForAllCustomersAsync(CancellationToken cancellationToken = default)
    {
        int processedCount = 0;

        // Get all user IDs that have orders
        var userIds = await GetUsersWithOrdersAsync(cancellationToken);

        foreach (var userId in userIds)
        {
            if (cancellationToken.IsCancellationRequested)
                break;

            try
            {
                await CalculateForCustomerAsync(userId, cancellationToken);
                processedCount++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to calculate RFM for user {UserId}", userId);
            }
        }

        _logger.LogInformation("RFM calculation completed. Processed {Count} customers.", processedCount);

        return processedCount;
    }

    public int GetRecencyScore(int daysSinceLastPurchase)
    {
        if (daysSinceLastPurchase <= RecencyDaysThresholds[0]) return 5; // <= 30 days
        if (daysSinceLastPurchase <= RecencyDaysThresholds[1]) return 4; // <= 60 days
        if (daysSinceLastPurchase <= RecencyDaysThresholds[2]) return 3; // <= 90 days
        if (daysSinceLastPurchase <= RecencyDaysThresholds[3]) return 2; // <= 180 days
        return 1; // > 180 days
    }

    public int GetFrequencyScore(int orderCount)
    {
        if (orderCount >= FrequencyCountThresholds[0]) return 5; // >= 10 orders
        if (orderCount >= FrequencyCountThresholds[1]) return 4; // >= 5 orders
        if (orderCount >= FrequencyCountThresholds[2]) return 3; // >= 3 orders
        if (orderCount >= FrequencyCountThresholds[3]) return 2; // >= 1 order
        return 1; // 0 orders
    }

    public int GetMonetaryScore(decimal totalSpent)
    {
        if (totalSpent >= MonetaryAmountThresholds[0]) return 5; // >= 50M VND
        if (totalSpent >= MonetaryAmountThresholds[1]) return 4; // >= 20M VND
        if (totalSpent >= MonetaryAmountThresholds[2]) return 3; // >= 10M VND
        if (totalSpent >= MonetaryAmountThresholds[3]) return 2; // >= 5M VND
        return 1; // < 5M VND
    }

    // Helper method to get order statistics for a user
    // In real implementation, this would query the Sales database
    private async Task<OrderStatsDto> GetOrderStatsForUser(Guid userId, CancellationToken cancellationToken)
    {
        // TODO: Implement cross-database query to Sales.Orders
        // For now, return placeholder data
        // This would typically be implemented via:
        // 1. Direct cross-database query if same DB server
        // 2. HTTP call to Sales service
        // 3. Event-driven sync of order data

        await Task.CompletedTask;

        return new OrderStatsDto(0, 0m, null, null, int.MaxValue);
    }

    // Get all users that have orders
    private async Task<List<Guid>> GetUsersWithOrdersAsync(CancellationToken cancellationToken)
    {
        // TODO: Query Sales database for distinct customer IDs
        // For now, return existing analytics user IDs
        return await _crmDb.CustomerAnalytics
            .AsNoTracking()
            .Select(c => c.UserId)
            .ToListAsync(cancellationToken);
    }

    private record OrderStatsDto(
        int OrderCount,
        decimal TotalSpent,
        DateTime? FirstPurchaseDate,
        DateTime? LastPurchaseDate,
        int DaysSinceLastPurchase);
}
