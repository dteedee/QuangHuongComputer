using CRM.Domain;

namespace CRM.Services;

public interface IRfmCalculationService
{
    /// <summary>
    /// Calculate RFM scores for a specific customer
    /// </summary>
    Task<CustomerAnalytics?> CalculateForCustomerAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Calculate RFM scores for all customers
    /// </summary>
    Task<int> CalculateForAllCustomersAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Get recency score based on days since last purchase
    /// </summary>
    int GetRecencyScore(int daysSinceLastPurchase);

    /// <summary>
    /// Get frequency score based on order count
    /// </summary>
    int GetFrequencyScore(int orderCount);

    /// <summary>
    /// Get monetary score based on total spent (VND)
    /// </summary>
    int GetMonetaryScore(decimal totalSpent);
}
