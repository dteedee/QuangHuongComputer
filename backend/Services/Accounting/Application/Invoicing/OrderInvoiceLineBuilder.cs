using Accounting.Domain;
using BuildingBlocks.Messaging.IntegrationEvents;
using BuildingBlocks.TaxEngine;
using VietnameseTaxEngine = BuildingBlocks.TaxEngine.VietnameseTaxEngine;

namespace Accounting.Application.Invoicing;

/// <summary>
/// Hàm THUẦN dựng các dòng hoá đơn từ các dòng đơn hàng (D01).
///
/// Bất biến quan trọng: <c>Σ GrossAmount == Σ PayableGross của đơn + phí ship</c>, KHÔNG SAI MỘT ĐỒNG.
/// Đạt được bằng cách coi số tiền phải trả của dòng là số GỐC và TÁCH VAT ra khỏi nó
/// (<c>net = Round(gross/(1+rate))</c>, <c>vat = gross − net</c>), thay vì nhân thuế lên giá chưa thuế.
///
/// Thuế suất được resolve theo NGÀY LẬP HOÁ ĐƠN, không phải ngày đặt hàng: một đơn đặt tháng 12/2026
/// nhưng giao tháng 01/2027 phải lên hoá đơn ở mức 10% (D01 §2).
/// </summary>
public static class OrderInvoiceLineBuilder
{
    /// <summary>Đơn vị tính mặc định khi đơn hàng không gửi kèm.</summary>
    public const string DefaultUnitName = "Cái";

    public static IReadOnlyList<InvoiceLine> Build(
        IReadOnlyList<InvoiceLineDto> items,
        ShippingLineDto? shipping,
        DateOnly invoiceBusinessDate,
        VatReductionWindow vatWindow)
    {
        var lines = new List<InvoiceLine>(items.Count + 1);

        foreach (var item in items)
        {
            var statutoryRate = NormalizeRate(item.VatStatutoryRate);
            var rate = VatRateResolver.Resolve(statutoryRate, item.VatReductionEligible, invoiceBusinessDate, vatWindow);

            var payable = Math.Max(0m, item.PayableGross);
            var discount = Math.Max(0m, item.DiscountAmount);
            var extracted = VietnameseTaxEngine.ExtractVat(payable, rate);

            var note = item.IsGift ? "Hàng khuyến mại, không thu tiền" : null;
            if (item.Serials is { Count: > 0 })
            {
                var serials = "S/N: " + string.Join(", ", item.Serials);
                note = note is null ? serials : $"{note}. {serials}";
            }

            lines.Add(InvoiceLine.FromExtracted(
                description: item.Name,
                quantity: item.Qty <= 0 ? 1 : item.Qty,
                vatRatePercent: ToPercent(rate),
                grossBeforeDiscount: payable + discount,
                lineDiscount: discount,
                grossAmount: payable,
                netAmount: extracted.PriceBeforeVat,
                vatAmount: extracted.VatAmount,
                sku: item.Sku,
                unitName: string.IsNullOrWhiteSpace(item.UnitName) ? DefaultUnitName : item.UnitName,
                isPromotion: item.IsGift,
                note: note));
        }

        if (shipping is not null && shipping.PayableGross > 0)
        {
            // Phí vận chuyển là MỘT DÒNG RIÊNG và cũng chịu thuế — không được cộng ẩn vào tổng.
            // Không thuộc diện giảm 2 điểm nên luôn resolve với reductionEligible = false.
            var shipRate = VatRateResolver.Resolve(
                NormalizeRate(shipping.VatStatutoryRate), false, invoiceBusinessDate, vatWindow);
            var extracted = VietnameseTaxEngine.ExtractVat(shipping.PayableGross, shipRate);

            lines.Add(InvoiceLine.FromExtracted(
                description: "Phí vận chuyển",
                quantity: 1,
                vatRatePercent: ToPercent(shipRate),
                grossBeforeDiscount: shipping.PayableGross,
                lineDiscount: 0m,
                grossAmount: shipping.PayableGross,
                netAmount: extracted.PriceBeforeVat,
                vatAmount: extracted.VatAmount,
                unitName: "Lần"));
        }

        return lines;
    }

    /// <summary>
    /// Nhận cả 0.08 lẫn 8 để không phụ thuộc vào việc module gửi sự kiện dùng quy ước nào —
    /// một thuế suất bị hiểu sai đơn vị là sai tiền thuế 100 lần.
    /// </summary>
    private static decimal NormalizeRate(decimal rate)
    {
        if (rate < 0m) return rate;       // âm = không chịu thuế, giữ nguyên quy ước của tax engine
        return rate > 1m ? rate / 100m : rate;
    }

    private static decimal ToPercent(decimal rate) => rate <= 0m ? 0m : Math.Round(rate * 100m, 2);
}
