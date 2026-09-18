using BuildingBlocks.TaxEngine;

namespace Sales.Application.Pricing;

/// <summary>
/// W0-4 / D01 — Phân bổ giảm giá theo dòng (largest remainder) + tách VAT theo dòng.
///
/// TẠM THỜI ở Sales.Application.Pricing (wave 0, KHÔNG migration). W2-3 thay bằng bản
/// dùng chung của W1-15 (date-aware tax rate). Đây là NGUỒN DUY NHẤT tính tiền
/// VAT-inclusive cho Cart, Order và PricingEngine — không nhân bản công thức ở nơi khác.
///
/// Quy ước D01 (giá đã BAO GỒM VAT):
///   Total   = Σ gross_i − D + shippingNet          (KHÔNG cộng thêm thuế)
///   Tax     = Σ ExtractVat(gross_i − alloc_i) + ExtractVat(shippingNet)   (tách THEO DÒNG)
/// Tách theo dòng chứ không tách cả đơn vì kết quả lệch: 290.000 + ship 30.000
/// → theo dòng 21.481 + 2.222 = 23.703, tách cả đơn (320.000) = 23.704.
///
/// Công thức tách VAT KHÔNG viết lại ở đây: gọi <see cref="VietnameseTaxEngine.ExtractVat"/>
/// (D01: "reuse VietnameseTaxEngine.ExtractVat instead of a new VatMath").
/// </summary>
public static class DiscountAllocator
{
    /// <summary>
    /// Phân bổ <paramref name="discount"/> lên các dòng theo tỉ lệ <paramref name="grossPerLine"/>,
    /// làm tròn xuống rồi chia phần dư 1đ cho các dòng có phần thập phân lớn nhất (largest remainder).
    ///
    /// BA CHỐT CHẶN BẮT BUỘC (D01 — mỗi cái đã được chứng minh là cần bằng script):
    ///  1. Clamp D = min(D, Σgross): nếu không, giảm 250.000 trên 2 dòng 100.000 ra −25.000/dòng → VAT âm.
    ///  2. Σgross == 0 (đơn toàn hàng tặng): mọi phân bổ = 0 VÀ D = 0 → tránh chia cho 0.
    ///  3. Tie-break theo THỨ TỰ DÒNG (index), không dùng sort không ổn định — nếu không,
    ///     cart / order / hoá đơn có thể phân bổ khác nhau trên cùng dữ liệu.
    /// </summary>
    /// <returns>Mảng cùng độ dài <paramref name="grossPerLine"/>, Σ = min(discount, Σgross), mọi phần tử ≥ 0.</returns>
    public static decimal[] Allocate(IReadOnlyList<decimal> grossPerLine, decimal discount)
    {
        var count = grossPerLine?.Count ?? 0;
        var result = new decimal[count];
        if (count == 0) return result;

        var totalGross = 0m;
        for (var i = 0; i < count; i++)
        {
            // Dòng âm không hợp lệ về mặt tiền tệ — coi như 0 để không sinh phân bổ âm.
            if (grossPerLine![i] > 0) totalGross += grossPerLine[i];
        }

        // Chốt chặn 2: không có gốc để phân bổ → tất cả = 0.
        if (totalGross <= 0) return result;

        // Chốt chặn 1: không bao giờ giảm quá tổng tiền hàng.
        var d = discount < 0 ? 0m : Math.Min(discount, totalGross);
        if (d == 0) return result;

        // Bước 1: phần nguyên (làm tròn xuống theo đồng).
        var allocated = 0m;
        var remainders = new (int Index, decimal Fraction)[count];
        for (var i = 0; i < count; i++)
        {
            var gross = grossPerLine![i] > 0 ? grossPerLine[i] : 0m;
            var exact = d * gross / totalGross;
            var floor = decimal.Floor(exact);
            result[i] = floor;
            allocated += floor;
            remainders[i] = (i, exact - floor);
        }

        // Bước 2: chia phần dư (luôn < số dòng đồng) cho phần thập phân lớn nhất.
        // Chốt chặn 3: OrderBy của LINQ là stable sort → dòng có index nhỏ hơn thắng khi bằng điểm.
        var leftover = (int)(d - allocated);
        if (leftover > 0)
        {
            var ranked = remainders
                .OrderByDescending(r => r.Fraction)
                .ThenBy(r => r.Index)
                .ToArray();

            for (var k = 0; k < leftover; k++)
            {
                result[ranked[k % count].Index] += 1m;
            }
        }

        return result;
    }

    /// <summary>
    /// Tính tổng tiền + thuế cho một đơn/giỏ VAT-inclusive.
    /// Trả về (Total, TaxAmount, Allocations, EffectiveDiscount) — caller ghi vào Order/Cart.
    /// </summary>
    /// <param name="grossPerLine">Tiền hàng đã bao gồm VAT của từng dòng (UnitPrice × Quantity).</param>
    /// <param name="discount">Tổng giảm tiền hàng yêu cầu (sẽ bị clamp về Σgross).</param>
    /// <param name="shippingNet">Phí ship đã trừ giảm ship, ≥ 0. Tách VAT thành 1 dòng riêng.</param>
    /// <param name="vatRate">Thuế suất VAT (vd 0.08). ≤ 0 → không tách thuế.</param>
    public static VatInclusiveTotals ComputeTotals(
        IReadOnlyList<decimal> grossPerLine,
        decimal discount,
        decimal shippingNet,
        decimal vatRate)
    {
        var lines = grossPerLine ?? Array.Empty<decimal>();
        var allocations = Allocate(lines, discount);

        var subtotal = 0m;
        for (var i = 0; i < lines.Count; i++)
        {
            if (lines[i] > 0) subtotal += lines[i];
        }

        var effectiveDiscount = 0m;
        for (var i = 0; i < allocations.Length; i++) effectiveDiscount += allocations[i];

        var ship = shippingNet < 0 ? 0m : shippingNet;

        // Thuế TÁCH RA khỏi giá, KHÔNG cộng thêm: total không phụ thuộc vào tax.
        var tax = 0m;
        if (vatRate > 0)
        {
            for (var i = 0; i < lines.Count; i++)
            {
                var payable = (lines[i] > 0 ? lines[i] : 0m) - allocations[i];
                if (payable <= 0) continue;
                tax += VietnameseTaxEngine.ExtractVat(payable, vatRate).VatAmount;
            }

            if (ship > 0)
            {
                tax += VietnameseTaxEngine.ExtractVat(ship, vatRate).VatAmount;
            }
        }

        return new VatInclusiveTotals(
            Subtotal: subtotal,
            EffectiveDiscount: effectiveDiscount,
            ShippingNet: ship,
            TaxAmount: tax,
            Total: subtotal - effectiveDiscount + ship,
            Allocations: allocations);
    }
}

/// <summary>Kết quả tính tiền VAT-inclusive cho 1 giỏ/đơn.</summary>
public record VatInclusiveTotals(
    decimal Subtotal,
    decimal EffectiveDiscount,
    decimal ShippingNet,
    decimal TaxAmount,
    decimal Total,
    decimal[] Allocations);
