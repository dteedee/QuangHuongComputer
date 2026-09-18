namespace Accounting.Domain;

/// <summary>
/// Một dòng hoá đơn. D01 (§3.1, §5): mọi con số đều được LƯU, không tính lại khi đọc.
///
/// Vì sao không dùng thuộc tính tính toán (<c>VatAmount =&gt; LineTotal * VatRate / 100</c> như bản cũ):
/// giá bán ở Việt Nam là giá ĐÃ GỒM VAT, nên VAT phải được TÁCH ra khỏi số tiền phải trả
/// (<c>net = Round(gross / (1 + rate))</c>, <c>vat = gross - net</c>). Chỉ có cách đó thì
/// Σ(net + vat) mới khớp tuyệt đối tổng đơn hàng. Công thức nhân ngược lại không bao giờ khớp,
/// và một hoá đơn lệch 1 đồng so với đơn hàng là hoá đơn sai.
///
/// Khoản giảm giá hiện RÕ trên từng dòng (<see cref="GrossBeforeDiscount"/> / <see cref="LineDiscount"/>),
/// không gộp thành một dòng âm ở chân hoá đơn — dòng âm không quy được về thuế suất nào và vỡ
/// ngay khi đơn hàng có nhiều thuế suất khác nhau.
/// </summary>
public class InvoiceLine
{
    public Guid Id { get; private set; }

    /// <summary>Tên hàng hoá/dịch vụ in trên hoá đơn.</summary>
    public string Description { get; private set; } = string.Empty;

    /// <summary>Mã hàng (SKU) — để đối chiếu với đơn hàng và kho.</summary>
    public string? Sku { get; private set; }

    /// <summary>Đơn vị tính (Cái, Bộ, Chiếc...). Bắt buộc trên hoá đơn GTGT.</summary>
    public string? UnitName { get; private set; }

    public decimal Quantity { get; private set; }

    /// <summary>
    /// Đơn giá HIỂN THỊ = <see cref="NetAmount"/> / <see cref="Quantity"/> (chưa gồm VAT).
    /// Chỉ để in; con số lên tờ khai thuế là <see cref="NetAmount"/>.
    /// </summary>
    public decimal UnitPrice { get; private set; }

    /// <summary>Thuế suất theo PHẦN TRĂM (8 = 8%) — khớp check constraint CK_InvoiceLine_VatRate_Percent.</summary>
    public decimal VatRate { get; private set; }

    /// <summary>Thành tiền đã gồm VAT TRƯỚC giảm giá.</summary>
    public decimal GrossBeforeDiscount { get; private set; }

    /// <summary>Giảm giá của dòng + phần giảm giá cấp đơn phân bổ về dòng này.</summary>
    public decimal LineDiscount { get; private set; }

    /// <summary>Số tiền phải trả của dòng, đã gồm VAT (payable = gross - discount).</summary>
    public decimal GrossAmount { get; private set; }

    /// <summary>Tiền hàng chưa gồm VAT (số lên tờ khai).</summary>
    public decimal NetAmount { get; private set; }

    /// <summary>Tiền thuế GTGT của dòng = <see cref="GrossAmount"/> - <see cref="NetAmount"/>.</summary>
    public decimal VatAmount { get; private set; }

    /// <summary>Hàng khuyến mại/quà tặng — in ở mức 0đ kèm ghi chú.</summary>
    public bool IsPromotion { get; private set; }

    public string? Note { get; private set; }

    /// <summary>CŨ — giữ tên quen thuộc cho code đọc báo cáo. Bằng <see cref="NetAmount"/>.</summary>
    public decimal LineTotal => NetAmount;

    protected InvoiceLine() { }

    /// <summary>
    /// Dựng một dòng từ các con số ĐÃ tách VAT (xem <c>BuildingBlocks.TaxEngine.VietnameseTaxEngine.ExtractVatLine</c>).
    /// Mọi caller phải đi qua đây để không có đường nào tạo ra dòng lệch tổng.
    /// </summary>
    public static InvoiceLine FromExtracted(
        string description,
        decimal quantity,
        decimal vatRatePercent,
        decimal grossBeforeDiscount,
        decimal lineDiscount,
        decimal grossAmount,
        decimal netAmount,
        decimal vatAmount,
        string? sku = null,
        string? unitName = null,
        bool isPromotion = false,
        string? note = null)
    {
        if (quantity <= 0) throw new ArgumentException("Số lượng phải lớn hơn 0.", nameof(quantity));

        return new InvoiceLine
        {
            Id = Guid.NewGuid(),
            Description = description,
            Sku = sku,
            UnitName = unitName,
            Quantity = quantity,
            UnitPrice = quantity == 0 ? 0 : Math.Round(netAmount / quantity, 2, MidpointRounding.AwayFromZero),
            VatRate = vatRatePercent,
            GrossBeforeDiscount = grossBeforeDiscount,
            LineDiscount = lineDiscount,
            GrossAmount = grossAmount,
            NetAmount = netAmount,
            VatAmount = vatAmount,
            IsPromotion = isPromotion,
            Note = note
        };
    }
}
