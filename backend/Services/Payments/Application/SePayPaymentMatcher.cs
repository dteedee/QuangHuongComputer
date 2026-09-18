using Payments.Domain;

namespace Payments.Application;

/// <summary>
/// W0-10 (D04 mục 4) — khớp một khoản tiền vào SePay với PaymentIntent đang chờ.
///
/// Chỉ còn HAI chiến lược, cả hai đều BẮT BUỘC đúng số tiền VÀ đúng mã thanh toán:
///   1. nội dung chuyển khoản chứa 8 ký tự đầu của OrderId,
///   2. nội dung chuyển khoản chứa mã thanh toán đã sinh (`ClientSecret`).
///
/// "Chiến lược 3" cũ (khớp CHỈ theo số tiền khi đúng 1 intent Pending trùng tiền) ĐÃ BỊ XOÁ:
/// bất kỳ khoản tiền vào nào trùng số tiền — của khách khác, của nhà cung cấp, tiền hoàn về —
/// đều xác nhận nhầm đơn của người khác. Không khớp ⇒ vào hàng "Chưa gán" cho kế toán.
/// </summary>
public static class SePayPaymentMatcher
{
    public static PaymentIntent? Match(
        IReadOnlyList<PaymentIntent> pendingIntents,
        decimal transferAmount,
        string? content,
        string? code,
        string? description)
    {
        if (pendingIntents.Count == 0 || transferAmount <= 0) return null;

        var searchText = string.Join(
            ' ',
            (content ?? "").Trim(),
            (code ?? "").Trim(),
            (description ?? "").Trim()).ToUpperInvariant();

        if (string.IsNullOrWhiteSpace(searchText)) return null;

        // 1) mã đơn (8 ký tự đầu OrderId) + đúng số tiền
        var matched = pendingIntents.FirstOrDefault(p =>
            p.Amount == transferAmount
            && searchText.Contains(p.OrderId.ToString("N")[..8].ToUpperInvariant(), StringComparison.Ordinal));

        if (matched is not null) return matched;

        // 2) mã thanh toán sinh riêng cho intent + đúng số tiền
        return pendingIntents.FirstOrDefault(p =>
            p.Amount == transferAmount
            && !string.IsNullOrWhiteSpace(p.ClientSecret)
            && searchText.Contains(p.ClientSecret!.ToUpperInvariant(), StringComparison.Ordinal));
    }
}
