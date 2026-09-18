using Payments.Domain;

namespace Payments.Application;

/// <summary>
/// W0-10 (D04 mục 4) — khớp một khoản tiền vào SePay với PaymentIntent đang chờ.
///
/// Chỉ còn HAI chiến lược tự động, cả hai đều BẮT BUỘC đúng số tiền VÀ đúng mã thanh toán:
///   1. nội dung chuyển khoản chứa 8 ký tự đầu của OrderId,
///   2. nội dung chuyển khoản chứa mã thanh toán đã sinh (<see cref="PaymentIntent.PaymentCode"/>,
///      hoặc <see cref="PaymentIntent.ClientSecret"/> của dữ liệu cũ).
///
/// "Chiến lược 3" cũ (khớp CHỈ theo số tiền khi đúng 1 intent Pending trùng tiền) ĐÃ BỊ XOÁ:
/// bất kỳ khoản tiền vào nào trùng số tiền — của khách khác, của nhà cung cấp, tiền hoàn về —
/// đều xác nhận nhầm đơn của người khác. Không khớp ⇒ vào hàng "Chưa gán" cho kế toán.
///
/// W2-4 thêm <see cref="Suggest"/>: cùng điều kiện "trùng tiền + đúng 1 ứng viên" nhưng trả về một
/// **GỢI Ý** để người thật bấm gán, KHÔNG BAO GIỜ tự xác nhận. Đó là luật D04 sống sót sau khi
/// chiến lược 3 bị xoá, và nó tồn tại vì có app ngân hàng bỏ mất nội dung chuyển khoản.
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

        var searchText = BuildSearchText(content, code, description);
        if (string.IsNullOrWhiteSpace(searchText)) return null;

        // 1) mã đơn (8 ký tự đầu OrderId) + đúng số tiền
        var matched = pendingIntents.FirstOrDefault(p =>
            p.Amount == transferAmount
            && searchText.Contains(p.OrderId.ToString("N")[..8].ToUpperInvariant(), StringComparison.Ordinal));

        if (matched is not null) return matched;

        // 2) mã thanh toán sinh riêng cho intent + đúng số tiền
        return pendingIntents.FirstOrDefault(p =>
            p.Amount == transferAmount
            && PaymentCodeOf(p) is { Length: > 0 } pc
            && searchText.Contains(pc, StringComparison.Ordinal));
    }

    /// <summary>
    /// Ứng viên duy nhất trùng số tiền và còn trong cửa sổ giữ đơn → gợi ý cho kế toán.
    /// Trả null khi có 0 hoặc &gt;1 ứng viên: mơ hồ thì để người quyết định, không đoán.
    /// </summary>
    public static PaymentIntent? Suggest(
        IReadOnlyList<PaymentIntent> pendingIntents,
        decimal transferAmount,
        DateTime nowUtc)
    {
        if (pendingIntents.Count == 0 || transferAmount <= 0) return null;

        var candidates = pendingIntents
            .Where(p => p.Amount == transferAmount)
            .Where(p => p.ExpiresAt is null || p.ExpiresAt >= nowUtc)
            .Take(2)
            .ToList();

        return candidates.Count == 1 ? candidates[0] : null;
    }

    private static string BuildSearchText(string? content, string? code, string? description)
        => string.Join(
            ' ',
            (content ?? "").Trim(),
            (code ?? "").Trim(),
            (description ?? "").Trim()).ToUpperInvariant();

    private static string PaymentCodeOf(PaymentIntent intent)
    {
        var raw = intent.PaymentCode ?? intent.ClientSecret;
        // Chuỗi trắng KHÔNG phải mã: `Contains(" ")` gần như luôn đúng ⇒ khớp nhầm đơn người khác.
        return string.IsNullOrWhiteSpace(raw) ? string.Empty : raw.Trim().ToUpperInvariant();
    }
}
