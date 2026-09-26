using BuildingBlocks.SharedKernel;
using BuildingBlocks.TaxEngine;

namespace Sales.Application.Pricing;

/// <summary>
/// W2-3 / D01 §3 — NGUỒN DUY NHẤT tính tiền cho giỏ, đơn và báo giá (giá ĐÃ GỒM VAT).
///
/// Thay bản tạm của W0-4 (<c>Sales.Application.Pricing.DiscountAllocator</c>): toàn bộ công thức
/// nằm ở kernel dùng chung của W1-15 — <c>BuildingBlocks.TaxEngine.DiscountAllocator.Allocate</c>
/// và <see cref="VietnameseTaxEngine.ExtractVatLine"/>. Lớp này CHỈ sắp xếp dữ liệu và gom nhóm,
/// không viết lại một phép nhân/chia/làm tròn nào.
///
/// Khác biệt cốt lõi so với bản W0-4: thuế suất theo TỪNG DÒNG (D01 §2 + Luật GTGT Đ.9.4).
/// Một đơn có thể vừa có hàng 8% vừa có hàng 10% — tính một thuế suất chung cho cả đơn là sai luật.
///
/// Bất biến (được test ở W4-1):
///   Total       = Subtotal − EffectiveDiscount + ShippingNet      (KHÔNG cộng thuế)
///   Total       = Σ Payable_i + ShippingNet
///   TaxAmount   = Σ VatAmount_i + ShippingVatAmount
///   Σ (Net + Vat) trong VatBreakdown = Total
/// </summary>
public static class OrderTotalsCalculator
{
    /// <summary>
    /// Tính tổng tiền + tách VAT theo dòng.
    /// </summary>
    /// <param name="lines">Các dòng hàng (kể cả hàng tặng — chúng bị loại khỏi cơ sở phân bổ).</param>
    /// <param name="orderDiscount">Giảm giá CẤP ĐƠN (coupon, điểm thưởng, giảm tay). Sẽ bị clamp.</param>
    /// <param name="shippingFee">Phí vận chuyển thu của khách (đã gồm VAT).</param>
    /// <param name="shippingDiscount">Giảm phí vận chuyển (freeship). Không đụng vào dòng hàng.</param>
    /// <param name="shippingVatRate">Thuế suất HIỆU LỰC của phí ship (đã resolve theo ngày). ≤ 0 → không tách.</param>
    public static OrderTotals Compute(
        IReadOnlyList<TotalsLineInput> lines,
        decimal orderDiscount,
        decimal shippingFee,
        decimal shippingDiscount,
        decimal shippingVatRate)
    {
        var input = lines ?? Array.Empty<TotalsLineInput>();

        // 1. Cơ sở phân bổ = tiền hàng sau giảm giá RIÊNG của dòng; hàng tặng không gánh giảm giá.
        var basis = new DiscountLine[input.Count];
        for (var i = 0; i < input.Count; i++)
        {
            var line = input[i];
            var gross = RoundDong(line.UnitPriceIncludingVat * line.Quantity);
            var lineDiscount = Clamp(line.LineDiscount, gross);
            // Dòng combo (đã giảm giá combo) KHÔNG gánh thêm giảm giá cấp đơn — chống giảm chồng.
            basis[i] = new DiscountLine(line.Sequence, gross - lineDiscount, line.IsGift || line.ExcludeFromOrderDiscount);
        }

        // 2. Phân bổ giảm giá cấp đơn — 3 chốt chặn của D01 §3.2 nằm trong allocator dùng chung.
        // (tên đầy đủ: cùng namespace còn lớp shim cũ trùng tên — xem DiscountAllocator.cs)
        var allocations = BuildingBlocks.TaxEngine.DiscountAllocator.Allocate(basis, orderDiscount);

        // 3. Tách VAT THEO DÒNG với thuế suất riêng của dòng.
        var results = new List<TotalsLineResult>(input.Count);
        decimal subtotal = 0m, effectiveDiscount = 0m, tax = 0m, payableTotal = 0m;

        for (var i = 0; i < input.Count; i++)
        {
            var line = input[i];
            var gross = RoundDong(line.UnitPriceIncludingVat * line.Quantity);
            var lineDiscount = Clamp(line.LineDiscount, gross);
            var allocated = allocations[i];

            var breakdown = VietnameseTaxEngine.ExtractVatLine(
                unitPriceIncludingVat: line.UnitPriceIncludingVat,
                quantity: line.Quantity,
                lineDiscount: lineDiscount,
                allocatedOrderDiscount: allocated,
                vatRate: line.VatRate);

            results.Add(new TotalsLineResult(
                Sequence: line.Sequence,
                GrossBeforeDiscount: breakdown.GrossBeforeDiscount,
                LineDiscount: lineDiscount,
                AllocatedOrderDiscount: allocated,
                Payable: breakdown.Payable,
                NetAmount: breakdown.NetAmount,
                VatRate: breakdown.VatRate,
                VatAmount: breakdown.VatAmount));

            subtotal += gross;
            effectiveDiscount += lineDiscount + allocated;
            payableTotal += breakdown.Payable;
            tax += breakdown.VatAmount;
        }

        // 4. Phí ship là một dòng thuế riêng (D01 §3.3): giảm ship không phân bổ về dòng hàng.
        var shippingNet = shippingFee - shippingDiscount;
        if (shippingNet < 0m) shippingNet = 0m;
        shippingNet = RoundDong(shippingNet);

        var shippingVat = 0m;
        decimal shippingNetAmount = shippingNet;
        if (shippingNet > 0m && shippingVatRate > 0m)
        {
            var ship = VietnameseTaxEngine.ExtractVat(shippingNet, shippingVatRate);
            shippingVat = ship.VatAmount;
            shippingNetAmount = ship.PriceBeforeVat;
            tax += shippingVat;
        }

        return new OrderTotals(
            Subtotal: subtotal,
            EffectiveDiscount: effectiveDiscount,
            ShippingNet: shippingNet,
            ShippingVatRate: shippingNet > 0m && shippingVatRate > 0m ? shippingVatRate : 0m,
            ShippingVatAmount: shippingVat,
            TaxAmount: tax,
            Total: payableTotal + shippingNet,
            Lines: results,
            VatBreakdown: BuildBreakdown(results, shippingNetAmount, shippingVat, shippingVatRate, shippingNet));
    }

    /// <summary>
    /// D01 §6 — `vatBreakdown[{rate, net, vat}]` cho API giỏ hàng/đơn hàng. Gộp dòng hàng + dòng ship
    /// theo thuế suất; dòng 0đ (hàng tặng) không tạo nhóm rỗng.
    /// </summary>
    private static IReadOnlyList<VatBucket> BuildBreakdown(
        IReadOnlyList<TotalsLineResult> lines,
        decimal shippingNetAmount,
        decimal shippingVat,
        decimal shippingVatRate,
        decimal shippingNet)
    {
        var buckets = new Dictionary<decimal, (decimal Net, decimal Vat)>();

        foreach (var line in lines)
        {
            if (line.Payable <= 0m) continue;
            buckets.TryGetValue(line.VatRate, out var acc);
            buckets[line.VatRate] = (acc.Net + line.NetAmount, acc.Vat + line.VatAmount);
        }

        if (shippingNet > 0m)
        {
            var rate = shippingVatRate > 0m ? shippingVatRate : 0m;
            buckets.TryGetValue(rate, out var acc);
            buckets[rate] = (acc.Net + shippingNetAmount, acc.Vat + shippingVat);
        }

        return buckets
            .OrderBy(b => b.Key)
            .Select(b => new VatBucket(b.Key, b.Value.Net, b.Value.Vat))
            .ToList();
    }

    /// <summary>D01 §3.1 — mọi khoản tiền làm tròn ĐỒNG, AwayFromZero (mặc định .NET là ToEven → lệch ở .5).</summary>
    private static decimal RoundDong(decimal value) => Math.Round(value, 0, MidpointRounding.AwayFromZero);

    private static decimal Clamp(decimal value, decimal max)
    {
        if (value <= 0m) return 0m;
        var rounded = RoundDong(value);
        return rounded > max ? max : rounded;
    }
}

/// <summary>Một dòng đầu vào để tính tiền. <paramref name="VatRate"/> phải ĐÃ resolve theo ngày (D01 §2).</summary>
/// <param name="Sequence">Thứ tự dòng trong đơn — quyết định tie-break khi chia 1đ lẻ.</param>
/// <param name="UnitPriceIncludingVat">Đơn giá bán đã gồm VAT.</param>
/// <param name="LineDiscount">Giảm giá riêng của dòng (khuyến mãi theo sản phẩm).</param>
/// <param name="VatRate">Thuế suất hiệu lực của dòng (<c>VatRateResolver.Resolve</c>). ≤ 0 → không tách thuế.</param>
/// <param name="IsGift">Hàng khuyến mại không thu tiền — loại khỏi cơ sở phân bổ giảm giá.</param>
/// <param name="ExcludeFromOrderDiscount">Dòng combo đã áp giá combo — không nhận giảm giá cấp đơn.</param>
public readonly record struct TotalsLineInput(
    int Sequence,
    decimal UnitPriceIncludingVat,
    int Quantity,
    decimal LineDiscount,
    decimal VatRate,
    bool IsGift,
    bool ExcludeFromOrderDiscount = false);

/// <summary>Kết quả của một dòng — đúng bộ số mà <c>OrderItems</c> phải snapshot (D01 §4).</summary>
public sealed record TotalsLineResult(
    int Sequence,
    decimal GrossBeforeDiscount,
    decimal LineDiscount,
    decimal AllocatedOrderDiscount,
    decimal Payable,
    decimal NetAmount,
    decimal VatRate,
    decimal VatAmount);

/// <summary>Một nhóm thuế suất trong `vatBreakdown` (D01 §6).</summary>
public sealed record VatBucket(decimal Rate, decimal Net, decimal Vat);

/// <summary>Tổng tiền của một giỏ/đơn theo mô hình giá đã gồm VAT.</summary>
public sealed record OrderTotals(
    decimal Subtotal,
    decimal EffectiveDiscount,
    decimal ShippingNet,
    decimal ShippingVatRate,
    decimal ShippingVatAmount,
    decimal TaxAmount,
    decimal Total,
    IReadOnlyList<TotalsLineResult> Lines,
    IReadOnlyList<VatBucket> VatBreakdown);
