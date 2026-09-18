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

        // Truy vấn thật số liệu đơn hàng từ bảng Orders (module Sales) qua raw SQL trên cùng connection.
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
        // W2-8 step 4: trước đây gọi CalculateForCustomerAsync() trong vòng lặp — N truy vấn SQL
        // sang Orders + N SaveChanges cho N khách hàng. Giờ gộp thành MỘT truy vấn GROUP BY lấy
        // toàn bộ thống kê đơn hàng, rồi cập nhật entity theo lô và SaveChanges một lần.
        var statsByUser = await GetOrderStatsForAllUsersAsync(cancellationToken);

        if (statsByUser.Count == 0)
        {
            _logger.LogInformation("RFM calculation: no users with orders found.");
            return 0;
        }

        var userIds = statsByUser.Keys.ToList();
        var existing = await _crmDb.CustomerAnalytics
            .Where(c => userIds.Contains(c.UserId))
            .ToDictionaryAsync(c => c.UserId, cancellationToken);

        int processedCount = 0;
        foreach (var (userId, stats) in statsByUser)
        {
            if (cancellationToken.IsCancellationRequested)
                break;

            if (!existing.TryGetValue(userId, out var analytics))
            {
                analytics = new CustomerAnalytics(userId);
                _crmDb.CustomerAnalytics.Add(analytics);
            }

            analytics.UpdateOrderStats(stats.OrderCount, stats.TotalSpent, stats.FirstPurchaseDate, stats.LastPurchaseDate);
            analytics.UpdateRfmScores(
                GetRecencyScore(stats.DaysSinceLastPurchase),
                GetFrequencyScore(stats.OrderCount),
                GetMonetaryScore(stats.TotalSpent));

            processedCount++;
        }

        await _crmDb.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("RFM calculation completed. Processed {Count} customers (set-based).", processedCount);

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
    // Queries the Sales database Orders table directly
    private async Task<OrderStatsDto> GetOrderStatsForUser(Guid userId, CancellationToken cancellationToken)
    {
        var connection = _crmDb.Database.GetDbConnection();
        bool wasClosed = connection.State == System.Data.ConnectionState.Closed;

        if (wasClosed) await connection.OpenAsync(cancellationToken);

        try
        {
            using var command = connection.CreateCommand();
            command.CommandText = @"
                SELECT 
                    COUNT(""Id"") as OrderCount,
                    COALESCE(SUM(""TotalAmount""), 0) as TotalSpent,
                    MIN(""OrderDate"") as FirstPurchaseDate,
                    MAX(""OrderDate"") as LastPurchaseDate
                FROM public.""Orders""
                WHERE ""CustomerId"" = @UserId AND ""IsActive"" = true
                  AND ""Status"" NOT IN (0, 7, 99)"; // Loại Pending(0)/Draft(7)/Cancelled(99) — chỉ tính đơn đã xác nhận/thanh toán trở lên (Sales.OrderStatus)

            var parameter = command.CreateParameter();
            parameter.ParameterName = "@UserId";
            parameter.Value = userId;
            command.Parameters.Add(parameter);

            using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (await reader.ReadAsync(cancellationToken))
            {
                int orderCount = reader.GetInt32(0);
                decimal totalSpent = reader.GetDecimal(1);
                DateTime? firstPurchaseDate = reader.IsDBNull(2) ? null : reader.GetDateTime(2);
                DateTime? lastPurchaseDate = reader.IsDBNull(3) ? null : reader.GetDateTime(3);

                int daysSinceLastPurchase = int.MaxValue;
                if (lastPurchaseDate.HasValue)
                {
                    daysSinceLastPurchase = (int)(DateTime.UtcNow - lastPurchaseDate.Value).TotalDays;
                }

                return new OrderStatsDto(orderCount, totalSpent, firstPurchaseDate, lastPurchaseDate, daysSinceLastPurchase);
            }

            return new OrderStatsDto(0, 0m, null, null, int.MaxValue);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get order stats for user {UserId}", userId);
            return new OrderStatsDto(0, 0m, null, null, int.MaxValue);
        }
        finally
        {
            if (wasClosed) await connection.CloseAsync();
        }
    }

    // W2-8 step 4: một truy vấn GROUP BY cho TOÀN BỘ khách hàng có đơn hàng, thay vì N truy vấn
    // (một cho danh sách UserId + N cho từng thống kê) như bản cũ.
    private async Task<Dictionary<Guid, OrderStatsDto>> GetOrderStatsForAllUsersAsync(CancellationToken cancellationToken)
    {
        var result = new Dictionary<Guid, OrderStatsDto>();
        var connection = _crmDb.Database.GetDbConnection();
        bool wasClosed = connection.State == System.Data.ConnectionState.Closed;

        if (wasClosed) await connection.OpenAsync(cancellationToken);

        try
        {
            using var command = connection.CreateCommand();
            command.CommandText = @"
                SELECT
                    ""CustomerId"",
                    COUNT(""Id"") as OrderCount,
                    COALESCE(SUM(""TotalAmount""), 0) as TotalSpent,
                    MIN(""OrderDate"") as FirstPurchaseDate,
                    MAX(""OrderDate"") as LastPurchaseDate
                FROM public.""Orders""
                WHERE ""IsActive"" = true AND ""Status"" NOT IN (0, 7, 99)
                GROUP BY ""CustomerId""";

            using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                if (reader.IsDBNull(0)) continue;

                var userId = reader.GetGuid(0);
                int orderCount = reader.GetInt32(1);
                decimal totalSpent = reader.GetDecimal(2);
                DateTime? firstPurchaseDate = reader.IsDBNull(3) ? null : reader.GetDateTime(3);
                DateTime? lastPurchaseDate = reader.IsDBNull(4) ? null : reader.GetDateTime(4);
                int daysSinceLastPurchase = lastPurchaseDate.HasValue
                    ? (int)(DateTime.UtcNow - lastPurchaseDate.Value).TotalDays
                    : int.MaxValue;

                result[userId] = new OrderStatsDto(orderCount, totalSpent, firstPurchaseDate, lastPurchaseDate, daysSinceLastPurchase);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get order stats for all users");
        }
        finally
        {
            if (wasClosed) await connection.CloseAsync();
        }

        return result;
    }

    private record OrderStatsDto(
        int OrderCount,
        decimal TotalSpent,
        DateTime? FirstPurchaseDate,
        DateTime? LastPurchaseDate,
        int DaysSinceLastPurchase);
}
