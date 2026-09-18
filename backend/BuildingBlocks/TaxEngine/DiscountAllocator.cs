namespace BuildingBlocks.TaxEngine;

/// <summary>
/// W1-15 / D01 §3.2 — phân bổ giảm giá CẤP ĐƠN về từng dòng bằng phương pháp SỐ DƯ LỚN NHẤT,
/// để Σ alloc_i == D tuyệt đối (không lệch 1đ) và mọi số tiền là số nguyên không âm.
/// Hàm thuần, không I/O. Đây là bản DÙNG CHUNG; bản tạm ở
/// <c>Sales/Application/Pricing/DiscountAllocator.cs</c> (W0-4) bị W2-3 xoá.
///
/// BA CHỐT CHẶN BẮT BUỘC (mỗi cái đã được script chứng minh là load-bearing — D01 §3.2):
///  1. <b>Clamp</b> D = min(D, Σ gross): thiếu → giảm 250.000 trên 2 dòng 100.000 ra −25.000/dòng,
///     tổng đơn −50.000 và VAT ÂM.
///  2. <b>Σ gross == 0</b> (đơn toàn hàng tặng / dòng giảm 100%) mà D &gt; 0 → chia cho 0.
///     Quy tắc: alloc_i = 0 với mọi i VÀ D bị ép về 0 (coupon không ăn vào đơn 0đ).
///  3. <b>Tie-break tất định</b> theo THỨ TỰ DÒNG (<c>Sequence</c>, rồi index): 3 dòng 100.000 với
///     D = 1đ có phần lẻ bằng nhau — nếu thứ tự "+1đ" không cố định thì giỏ / đơn / hoá đơn
///     phân bổ khác nhau trên cùng dữ liệu và snapshot lệch.
///
/// Dòng QUÀ TẶNG (<c>IsGift</c>) bị loại khỏi cơ sở phân bổ: NĐ 181/2025 Đ.6.2 cho giá tính thuế = 0,
/// không có gì để giảm thêm.
/// </summary>
public static class DiscountAllocator
{
    /// <summary>Phân bổ trên danh sách tiền hàng đơn giản (thứ tự phần tử = thứ tự dòng).</summary>
    public static decimal[] Allocate(IReadOnlyList<decimal> grossPerLine, decimal discount)
    {
        var count = grossPerLine?.Count ?? 0;
        var lines = new DiscountLine[count];
        for (var i = 0; i < count; i++) lines[i] = new DiscountLine(i, grossPerLine![i], false);
        return Allocate(lines, discount);
    }

    /// <summary>
    /// Phân bổ <paramref name="discount"/> theo tỉ lệ <c>Gross</c> của các dòng KHÔNG phải quà.
    /// </summary>
    /// <returns>Mảng cùng độ dài và cùng thứ tự với <paramref name="lines"/>, Σ = min(D, Σ gross), mọi phần tử ≥ 0.</returns>
    public static decimal[] Allocate(IReadOnlyList<DiscountLine> lines, decimal discount)
    {
        var count = lines?.Count ?? 0;
        var result = new decimal[count];
        if (count == 0) return result;

        var totalGross = 0m;
        for (var i = 0; i < count; i++) totalGross += Basis(lines![i]);

        // Chốt chặn 2: không có cơ sở để phân bổ → tất cả bằng 0 (và D coi như 0).
        if (totalGross <= 0m) return result;

        // Chốt chặn 1: không bao giờ giảm quá tổng tiền hàng.
        var d = discount <= 0m ? 0m : Math.Min(discount, totalGross);
        if (d == 0m) return result;

        var allocated = 0m;
        var remainders = new (int Index, int Sequence, decimal Fraction)[count];
        for (var i = 0; i < count; i++)
        {
            var exact = d * Basis(lines![i]) / totalGross;
            var floor = decimal.Floor(exact);
            result[i] = floor;
            allocated += floor;
            remainders[i] = (i, lines[i].Sequence, exact - floor);
        }

        // Phần dư luôn < số dòng (mỗi dòng mất < 1đ khi floor) nên mỗi dòng nhận tối đa +1đ.
        var leftover = (int)(d - allocated);
        if (leftover <= 0) return result;

        // Chốt chặn 3: phần lẻ giảm dần, bằng nhau thì Sequence nhỏ hơn thắng, rồi tới index.
        Array.Sort(remainders, (a, b) =>
        {
            var byFraction = b.Fraction.CompareTo(a.Fraction);
            if (byFraction != 0) return byFraction;
            var bySequence = a.Sequence.CompareTo(b.Sequence);
            return bySequence != 0 ? bySequence : a.Index.CompareTo(b.Index);
        });

        for (var k = 0; k < leftover && k < count; k++) result[remainders[k].Index] += 1m;
        return result;
    }

    /// <summary>
    /// D01 §5 — hoàn tiền khi TRẢ HÀNG TỪNG PHẦN, có quy tắc số dư.
    /// Lần trả CUỐI CÙNG lấy toàn bộ phần còn lại để Σ hoàn == payable tuyệt đối;
    /// thiếu quy tắc này thì dòng payable 1.268.113 qty 3 trả lẻ 3 lần chỉ hoàn 1.268.112 (thiếu 1đ).
    /// </summary>
    /// <param name="linePayable">Tiền phải trả của dòng SAU khi trừ giảm giá dòng + phân bổ giảm giá đơn.</param>
    /// <param name="lineQuantity">Số lượng gốc của dòng.</param>
    /// <param name="returningQuantity">Số lượng trả lần này.</param>
    /// <param name="alreadyReturnedQuantity">Số lượng đã trả ở các lần trước.</param>
    /// <param name="alreadyRefunded">Tổng tiền đã hoàn ở các lần trước.</param>
    public static decimal RefundForReturn(
        decimal linePayable,
        int lineQuantity,
        int returningQuantity,
        int alreadyReturnedQuantity = 0,
        decimal alreadyRefunded = 0m)
    {
        if (lineQuantity <= 0 || returningQuantity <= 0 || linePayable <= 0m) return 0m;

        var cumulative = alreadyReturnedQuantity + returningQuantity;
        if (cumulative >= lineQuantity)
        {
            var rest = linePayable - alreadyRefunded;
            return rest < 0m ? 0m : rest;
        }

        return Math.Round(linePayable * returningQuantity / lineQuantity, 0, MidpointRounding.AwayFromZero);
    }

    private static decimal Basis(DiscountLine line)
        => line.IsGift || line.Gross <= 0m ? 0m : line.Gross;
}

/// <summary>
/// Một dòng tham gia phân bổ giảm giá.
/// </summary>
/// <param name="Sequence">Thứ tự dòng trong đơn (<c>OrderItem.Sequence</c>, thiếu thì dùng index) — quyết định tie-break.</param>
/// <param name="Gross">Tiền hàng ĐÃ GỒM VAT của dòng, sau giảm giá riêng của dòng (UnitPrice × Qty − LineDiscount).</param>
/// <param name="IsGift">Hàng khuyến mại không thu tiền — loại khỏi cơ sở phân bổ (NĐ 181/2025 Đ.6.2).</param>
public readonly record struct DiscountLine(int Sequence, decimal Gross, bool IsGift = false);
