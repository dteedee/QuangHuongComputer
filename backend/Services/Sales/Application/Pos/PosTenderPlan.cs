using Sales.Domain;

namespace Sales.Application.Pos;

/// <summary>
/// KIỂM TIỀN Ở QUẦY: các dòng tender khách trả có đủ không, thối bao nhiêu, và đây là bán đứt
/// hay đặt cọc (D10 quy tắc 9).
///
/// Quy tắc:
///  · Chỉ TIỀN MẶT mới được đưa dư (phần dư là tiền thối). Chuyển khoản / quẹt thẻ đưa dư là
///    lỗi nhập liệu, không phải tiền thối — máy POS không nhả tiền mặt cho giao dịch thẻ.
///  · Tổng ghi nhận &lt; tổng đơn ⇒ ĐẶT CỌC: đơn dừng ở <c>PartiallyPaid</c>, KHÔNG xuất hoá đơn,
///    KHÔNG được xuất kho (D10 quy tắc 9 + D07 §5). Cần quyền <c>Sales.TakeDeposit</c>.
///  · Tổng ghi nhận &gt; tổng đơn ⇒ từ chối: thu dư mà không ghi thối là thất thoát của khách.
/// </summary>
public static class PosTenderPlan
{
    public sealed record Line(PaymentTenderMethod Method, decimal Amount, decimal Tendered, string Reference);

    public sealed record Plan(
        IReadOnlyList<Line> Lines,
        decimal Collected,
        decimal ChangeDue,
        bool IsDeposit,
        string? Error);

    private static readonly Dictionary<string, PaymentTenderMethod> Methods =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["cash"] = PaymentTenderMethod.Cash,
            ["card"] = PaymentTenderMethod.Card,
            ["transfer"] = PaymentTenderMethod.Transfer,
            ["banktransfer"] = PaymentTenderMethod.Transfer,
            ["vietqr"] = PaymentTenderMethod.Transfer,
            ["sepay"] = PaymentTenderMethod.SePay,
        };

    public static Plan Build(
        IReadOnlyList<PosTenderRequest> tenders, decimal orderTotal, string orderNumberSeed)
    {
        if (tenders == null || tenders.Count == 0)
            return Fail("Đơn tại quầy phải có ít nhất một hình thức thu tiền.");

        var lines = new List<Line>(tenders.Count);
        decimal collected = 0m, change = 0m;

        foreach (var tender in tenders)
        {
            if (!Methods.TryGetValue(tender.Method ?? "", out var method))
                return Fail($"Hình thức thu tiền không hợp lệ: {tender.Method}. "
                            + "Chấp nhận: Cash, Card, Transfer/VietQR, SePay.");

            if (tender.Amount <= 0m)
                return Fail("Số tiền của mỗi dòng thu phải lớn hơn 0.");

            if (method == PaymentTenderMethod.Cash)
            {
                var tendered = tender.TenderedAmount > tender.Amount ? tender.TenderedAmount : tender.Amount;
                change += tendered - tender.Amount;
                lines.Add(new Line(method, tender.Amount, tendered,
                    tender.Reference ?? $"{orderNumberSeed}-cash-{lines.Count + 1}"));
            }
            else
            {
                if (tender.TenderedAmount > tender.Amount)
                    return Fail($"Hình thức {method} không có tiền thối — "
                                + "số tiền khách đưa phải bằng số tiền ghi nhận.");
                if (method != PaymentTenderMethod.Cash && string.IsNullOrWhiteSpace(tender.Reference))
                    return Fail($"Hình thức {method} phải có mã đối soát (số giao dịch / mã VietQR).");

                lines.Add(new Line(method, tender.Amount, tender.Amount, tender.Reference!));
            }

            collected += tender.Amount;
        }

        if (collected > orderTotal)
            return Fail($"Tổng thu {collected:#,##0}đ lớn hơn tổng đơn {orderTotal:#,##0}đ. "
                        + "Tiền mặt đưa dư phải ghi ở 'tiền khách đưa', không phải ở số tiền thu.");

        return new Plan(lines, collected, change, IsDeposit: collected < orderTotal, Error: null);
    }

    private static Plan Fail(string error)
        => new(Array.Empty<Line>(), 0m, 0m, false, error);
}
