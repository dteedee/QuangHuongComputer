using BuildingBlocks.TaxEngine;

namespace Sales.Application.Pricing;

/// <summary>
/// W2-3 / D01 — SHIM TƯƠNG THÍCH. Toàn bộ công thức của bản tạm W0-4 đã bị XOÁ khỏi đây;
/// mỗi lời gọi chỉ chuyển tiếp sang kernel dùng chung của W1-15
/// (<c>BuildingBlocks.TaxEngine.DiscountAllocator</c>) và <see cref="OrderTotalsCalculator"/>.
///
/// Vì sao còn tồn tại: <c>backend/Tests/UnitTests/Domain/Sales/VatInclusivePricingTests.cs</c>
/// (thuộc quyền sở hữu của W4-1, KHÔNG nằm trong glob của W2-3) còn gọi hai hàm này. Xoá file
/// ngay bây giờ làm hỏng biên dịch của một dự án mà track này không được sửa.
/// Yêu cầu tích hợp đã ghi ở <c>reports/integration-requests-w2.md</c>: trỏ test sang
/// <c>BuildingBlocks.TaxEngine.DiscountAllocator</c> + <see cref="OrderTotalsCalculator"/>,
/// sau đó XOÁ file này.
///
/// Hạn chế cố hữu của API cũ: chỉ nhận MỘT thuế suất cho cả đơn. Đơn nhiều thuế suất
/// (Luật GTGT Đ.9.4) phải gọi thẳng <see cref="OrderTotalsCalculator.Compute"/>.
/// </summary>
[Obsolete("D01/W2-3: dùng BuildingBlocks.TaxEngine.DiscountAllocator + OrderTotalsCalculator. " +
          "Shim chỉ còn để Tests/UnitTests biên dịch; xoá khi W4-1 trỏ test sang kernel dùng chung.")]
public static class DiscountAllocator
{
    /// <summary>Chuyển tiếp nguyên vẹn sang allocator dùng chung (largest remainder, 3 chốt chặn D01 §3.2).</summary>
    public static decimal[] Allocate(IReadOnlyList<decimal> grossPerLine, decimal discount)
    {
        var count = grossPerLine?.Count ?? 0;
        var lines = new DiscountLine[count];
        for (var i = 0; i < count; i++) lines[i] = new DiscountLine(i, grossPerLine![i]);
        return BuildingBlocks.TaxEngine.DiscountAllocator.Allocate(lines, discount);
    }

    /// <summary>Chuyển tiếp sang <see cref="OrderTotalsCalculator"/> với một thuế suất chung cho mọi dòng.</summary>
    public static VatInclusiveTotals ComputeTotals(
        IReadOnlyList<decimal> grossPerLine,
        decimal discount,
        decimal shippingNet,
        decimal vatRate)
    {
        var lines = grossPerLine ?? Array.Empty<decimal>();
        var input = new TotalsLineInput[lines.Count];
        for (var i = 0; i < lines.Count; i++)
        {
            // Dòng chỉ biết "thành tiền" chứ không biết đơn giá × số lượng → coi như 1 đơn vị.
            input[i] = new TotalsLineInput(i, lines[i] > 0m ? lines[i] : 0m, 1, 0m, vatRate, false);
        }

        var totals = OrderTotalsCalculator.Compute(input, discount, shippingNet, 0m, vatRate);

        return new VatInclusiveTotals(
            Subtotal: totals.Subtotal,
            EffectiveDiscount: totals.EffectiveDiscount,
            ShippingNet: totals.ShippingNet,
            TaxAmount: totals.TaxAmount,
            Total: totals.Total,
            Allocations: totals.Lines.Select(l => l.AllocatedOrderDiscount).ToArray());
    }
}

/// <summary>Kết quả tính tiền VAT-inclusive cho 1 giỏ/đơn (API cũ của W0-4).</summary>
public record VatInclusiveTotals(
    decimal Subtotal,
    decimal EffectiveDiscount,
    decimal ShippingNet,
    decimal TaxAmount,
    decimal Total,
    decimal[] Allocations);
