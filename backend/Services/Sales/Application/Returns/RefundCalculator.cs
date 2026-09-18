using Sales.Domain;

namespace Sales.Application.Returns;

/// <summary>
/// TIỀN HOÀN — D01.
///
/// Nguyên tắc: hoàn từ <c>OrderItems.LineTotal</c> (= <c>payable_i</c>, đã gồm VAT, đã trừ mọi
/// khuyến mãi được phân bổ) và <c>OrderItems.VatAmount</c> ĐÃ ĐÓNG BĂNG trên đơn gốc — KHÔNG tính
/// lại theo giá hiện tại và KHÔNG theo thuế suất hôm nay. Hoàn theo giá niêm yết hôm nay là hoàn
/// cho khách phần khuyến mãi họ chưa từng trả; hoàn theo thuế suất hôm nay là lệch tờ khai thuế.
///
/// Quy tắc phần dư (D01): trả nhiều lần trên cùng một dòng thì mỗi lần trừ lần cuối hoàn
/// <c>Round(payable_i × q / qty_i)</c>, lần CUỐI hoàn phần còn lại. Không có nó, dòng 1.268.113đ
/// số lượng 3 trả từng cái một chỉ hoàn về 1.268.112đ — thiếu 1đ, và 1đ đó không bao giờ khớp sổ.
/// </summary>
public static class RefundCalculator
{
    public sealed record Refund(decimal Amount, decimal VatAmount, decimal FeeAmount, decimal Payable);

    /// <summary>
    /// Số tiền hoàn cho <paramref name="quantity"/> đơn vị của dòng, đã tính phần dư.
    /// <paramref name="alreadyRefundedQuantity"/> là số đã hoàn ở các lần trước của CÙNG dòng.
    /// </summary>
    public static decimal PortionOf(OrderItem item, int quantity, int alreadyRefundedQuantity)
    {
        if (quantity <= 0 || item.Quantity <= 0) return 0m;

        var remainingQty = item.Quantity - alreadyRefundedQuantity;
        if (quantity >= remainingQty)
        {
            // Lần cuối: lấy đúng phần còn lại để tổng hoàn bằng CHÍNH XÁC payable_i.
            var refundedSoFar = Round(item.LineTotal * alreadyRefundedQuantity / item.Quantity);
            return item.LineTotal - refundedSoFar;
        }

        return Round(item.LineTotal * quantity / item.Quantity);
    }

    /// <summary>
    /// Hoàn TRỌN DÒNG (mô hình hiện tại: một <c>ReturnRequest</c> = một dòng đơn, vì
    /// <c>ReturnRequests</c> chưa có cột số lượng — xem integration request W2-10).
    /// <paramref name="feePercent"/> chỉ khác 0 với lý do "đổi ý" (D08).
    /// </summary>
    public static Refund ForWholeLine(OrderItem item, decimal feePercent)
    {
        var payable = item.LineTotal;
        var fee = feePercent <= 0m ? 0m : Round(payable * feePercent / 100m);
        if (fee > payable) fee = payable;

        var amount = payable - fee;

        // VAT hoàn theo ĐÚNG tỉ lệ phần tiền thực hoàn, ở thuế suất của hoá đơn gốc.
        var vat = payable <= 0m ? 0m : Round(item.VatAmount * amount / payable);

        return new Refund(amount, vat, fee, payable);
    }

    /// <summary>D01 §3.1 — làm tròn ĐỒNG, AwayFromZero (mặc định .NET là ToEven → lệch ở .5).</summary>
    private static decimal Round(decimal value) => Math.Round(value, 0, MidpointRounding.AwayFromZero);
}
