using BuildingBlocks.Endpoints;
using BuildingBlocks.TaxEngine;

namespace Repair.Domain;

/// <summary>
/// Tính tiền báo giá sửa chữa — hàm thuần, KHÔNG đọc DB, là nơi DUY NHẤT sinh ra con số tiền của
/// báo giá (frontend chỉ hiển thị kết quả, kể cả khi đang soạn: xem endpoint <c>quote/preview</c>).
///
/// Quy tắc (D01, giống đơn bán hàng):
/// <list type="number">
/// <item>Đơn giá, giảm giá dòng, giảm giá cả phiếu là VND NGUYÊN, ĐÃ GỒM VAT.</item>
/// <item>Thành tiền dòng = Round(đơn giá × SL, AwayFromZero) — SL công có thể lẻ (1,5 giờ).</item>
/// <item>Giảm giá cả phiếu chia về từng dòng theo tỉ lệ (tiền dòng − giảm giá dòng) bằng
///   <see cref="DiscountAllocator"/>: floor + phần dư lớn nhất, Σ phân bổ = đúng số giảm.</item>
/// <item>VAT tách THEO DÒNG bằng <see cref="VietnameseTaxEngine.ExtractVatLine"/>
///   (→ <see cref="VietnameseTaxEngine.ExtractVat(decimal, decimal)"/>): net = Round(gross/(1+r)),
///   vat = phần dư ⇒ Σ(net + vat) khớp tổng tuyệt đối.</item>
/// </list>
/// Sai dữ liệu thì ném <see cref="RequestValidationException"/> (400, lỗi theo ô) chứ không tự kẹp.
/// </summary>
public static class RepairQuoteCalculator
{
    public const int MaxLines = 100;
    public const int MaxDescriptionLength = 500;
    public const decimal MaxQuantity = 10_000m;

    public static RepairQuotePricing Calculate(
        IReadOnlyList<RepairQuoteLineDraft> lines, decimal quoteDiscount, decimal vatRate)
    {
        Validate(lines, quoteDiscount);

        var gross = lines.Select(l => Math.Round(l.UnitPrice * l.Quantity, 0, MidpointRounding.AwayFromZero)).ToArray();
        for (var i = 0; i < lines.Count; i++)
        {
            if (lines[i].LineDiscount > gross[i])
                throw Invalid($"lines[{i}].lineDiscount", "Giảm giá dòng không được lớn hơn thành tiền của dòng.");
        }

        var basis = lines.Select((l, i) => gross[i] - l.LineDiscount).ToArray();
        if (quoteDiscount > basis.Sum())
            throw Invalid("discountAmount", "Giảm giá cả phiếu không được lớn hơn tổng tiền sau giảm giá dòng.");

        var allocated = DiscountAllocator.Allocate(basis, quoteDiscount);
        var results = new List<RepairQuoteLineAmounts>(lines.Count);
        for (var i = 0; i < lines.Count; i++)
        {
            var b = VietnameseTaxEngine.ExtractVatLine(lines[i].UnitPrice, lines[i].Quantity, lines[i].LineDiscount, allocated[i], vatRate);
            results.Add(new RepairQuoteLineAmounts(b.GrossBeforeDiscount, allocated[i], b.Payable, b.VatRate, b.NetAmount, b.VatAmount));
        }

        decimal SumKind(params RepairQuoteLineKind[] kinds) =>
            results.Where((_, i) => kinds.Contains(lines[i].Kind)).Sum(r => r.LineTotal);

        return new RepairQuotePricing(
            results,
            SubtotalAmount: gross.Sum(),
            LineDiscountTotal: lines.Sum(l => l.LineDiscount),
            QuoteDiscount: quoteDiscount,
            NetAmount: results.Sum(r => r.NetAmount),
            VatAmount: results.Sum(r => r.VatAmount),
            TotalAmount: results.Sum(r => r.LineTotal),
            PartsTotal: SumKind(RepairQuoteLineKind.Part),
            LaborTotal: SumKind(RepairQuoteLineKind.Labor),
            ServiceTotal: SumKind(RepairQuoteLineKind.Service, RepairQuoteLineKind.Other),
            VatRate: vatRate <= 0m ? 0m : vatRate);
    }

    private static void Validate(IReadOnlyList<RepairQuoteLineDraft> lines, decimal quoteDiscount)
    {
        if (lines is null || lines.Count == 0)
            throw Invalid("lines", "Báo giá phải có ít nhất một dòng.");
        if (lines.Count > MaxLines)
            throw Invalid("lines", $"Báo giá tối đa {MaxLines} dòng.");
        if (!IsWholeDong(quoteDiscount) || quoteDiscount < 0)
            throw Invalid("discountAmount", "Giảm giá cả phiếu phải là số đồng nguyên, không âm.");

        for (var i = 0; i < lines.Count; i++)
        {
            var l = lines[i];
            if (string.IsNullOrWhiteSpace(l.Description))
                throw Invalid($"lines[{i}].description", "Vui lòng nhập nội dung dòng.");
            if (l.Description.Trim().Length > MaxDescriptionLength)
                throw Invalid($"lines[{i}].description", $"Nội dung dòng tối đa {MaxDescriptionLength} ký tự.");
            if (!Enum.IsDefined(l.Kind))
                throw Invalid($"lines[{i}].kind", "Loại dòng không hợp lệ.");
            if (l.Quantity <= 0 || l.Quantity > MaxQuantity || decimal.Round(l.Quantity, 2) != l.Quantity)
                throw Invalid($"lines[{i}].quantity", "Số lượng phải lớn hơn 0, tối đa 2 chữ số thập phân.");
            if (l.UnitPrice < 0 || !IsWholeDong(l.UnitPrice))
                throw Invalid($"lines[{i}].unitPrice", "Đơn giá phải là số đồng nguyên, không âm.");
            if (l.LineDiscount < 0 || !IsWholeDong(l.LineDiscount))
                throw Invalid($"lines[{i}].lineDiscount", "Giảm giá dòng phải là số đồng nguyên, không âm.");
        }
    }

    private static bool IsWholeDong(decimal value) => decimal.Truncate(value) == value;

    private static RequestValidationException Invalid(string field, string message)
        => new(field, message);
}

/// <summary>Kết quả tính cả phiếu. <c>LineAmounts[i]</c> ứng với dòng đầu vào thứ i.</summary>
public sealed record RepairQuotePricing(
    IReadOnlyList<RepairQuoteLineAmounts> LineAmounts,
    decimal SubtotalAmount,
    decimal LineDiscountTotal,
    decimal QuoteDiscount,
    decimal NetAmount,
    decimal VatAmount,
    decimal TotalAmount,
    decimal PartsTotal,
    decimal LaborTotal,
    decimal ServiceTotal,
    decimal VatRate)
{
    public decimal DiscountTotal => LineDiscountTotal + QuoteDiscount;
}
