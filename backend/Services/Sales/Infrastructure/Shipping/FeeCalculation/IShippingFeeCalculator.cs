namespace Sales.Infrastructure.Shipping.FeeCalculation;

public record ShippingFeeQuoteRequest(
    decimal NetSubtotal,
    bool IsPickup,
    string? ProvinceCode = null,
    string? WardCode = null,
    int WeightGrams = 500);

public record ShippingFeeQuoteResult(
    decimal Fee,
    bool IsFreeShipping,
    string Source,
    string? EstimatedDeliveryDays = null);

/// <summary>
/// NGUỒN DUY NHẤT tính phí ship phía server cho track W2-11 (song song với
/// <c>Sales.Application.Pricing.ShippingFeePolicy</c> của W0-4/W2-3, mà module này không có quyền
/// sửa — xem ghi chú trong <c>ShippingFeeCalculator</c>).
///
/// Không endpoint nào nhận <c>shippingFee</c> từ client; phí luôn tính lại ở đây từ
/// <see cref="ShippingFeeQuoteRequest.NetSubtotal"/> đã tính phía server.
/// </summary>
public interface IShippingFeeCalculator
{
    Task<ShippingFeeQuoteResult> QuoteAsync(ShippingFeeQuoteRequest request, CancellationToken ct = default);
}
