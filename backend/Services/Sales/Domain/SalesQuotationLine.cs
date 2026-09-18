using BuildingBlocks.SharedKernel;
using BuildingBlocks.TaxEngine;

namespace Sales.Domain;

/// <summary>
/// Một dòng báo giá B2B (W2-19). Cột khớp bảng <c>SalesQuotationLines</c> đã có sẵn từ migration
/// của W2-3. Đơn giá LUÔN đã gồm VAT (D01); <see cref="VatAmount"/>/<see cref="NetAmount"/> tách
/// ra bằng <see cref="VietnameseTaxEngine.ExtractVatLine"/> — cùng kernel Order dùng, để một sản
/// phẩm cho ra cùng một số thuế dù nằm trên báo giá hay trên đơn.
/// </summary>
public class SalesQuotationLine : Entity<Guid>
{
    public Guid QuotationId { get; private set; }
    public int Sequence { get; private set; }

    public Guid ProductId { get; private set; }
    public Guid? VariantId { get; private set; }
    public string ProductName { get; private set; } = string.Empty;
    public string? ProductSku { get; private set; }
    public string? UnitName { get; private set; }

    public int Quantity { get; private set; }

    /// <summary>Đơn giá ĐÃ GỒM VAT — mặc định lấy từ Catalog, nhân viên có thể sửa (Requirements).</summary>
    public decimal UnitPrice { get; private set; }

    /// <summary>Giảm giá của riêng dòng này, dưới giá niêm yết — gate ở hạn mức duyệt (phase step 3).</summary>
    public decimal LineDiscount { get; private set; }

    public decimal VatStatutoryRate { get; private set; }
    public bool VatReductionEligible { get; private set; } = true;
    public decimal VatRate { get; private set; }

    /// <summary>Thành tiền ĐÃ GỒM VAT, sau giảm giá dòng.</summary>
    public decimal LineTotal { get; private set; }

    /// <summary>Tiền thuế tách ra khỏi <see cref="LineTotal"/> — hiển thị riêng trên phiếu in (D01).</summary>
    public decimal VatAmount { get; private set; }

    /// <summary>Tiền hàng chưa thuế — <c>NetAmount + VatAmount == LineTotal</c>.</summary>
    public decimal NetAmount { get; private set; }

    public string? Notes { get; private set; }

    protected SalesQuotationLine() { }

    public SalesQuotationLine(
        Guid quotationId,
        int sequence,
        Guid productId,
        Guid? variantId,
        string productName,
        string? productSku,
        string? unitName,
        int quantity,
        decimal unitPrice,
        decimal lineDiscount,
        decimal vatStatutoryRate,
        bool vatReductionEligible,
        decimal vatRate,
        string? notes = null)
    {
        if (string.IsNullOrWhiteSpace(productName))
            throw new ArgumentException("Thiếu tên sản phẩm", nameof(productName));
        if (quantity <= 0)
            throw new ArgumentException("Số lượng phải lớn hơn 0", nameof(quantity));
        if (unitPrice < 0)
            throw new ArgumentException("Đơn giá không được âm", nameof(unitPrice));
        if (lineDiscount < 0)
            throw new ArgumentException("Giảm giá không được âm", nameof(lineDiscount));

        Id = Guid.NewGuid();
        QuotationId = quotationId;
        Sequence = sequence;
        ProductId = productId;
        VariantId = variantId;
        ProductName = productName;
        ProductSku = productSku;
        UnitName = string.IsNullOrWhiteSpace(unitName) ? "Chiếc" : unitName;
        Quantity = quantity;
        UnitPrice = unitPrice;
        LineDiscount = lineDiscount;
        VatStatutoryRate = vatStatutoryRate;
        VatReductionEligible = vatReductionEligible;
        VatRate = vatRate;
        Notes = notes;

        Recalculate();
    }

    private void Recalculate()
    {
        var breakdown = VietnameseTaxEngine.ExtractVatLine(
            unitPriceIncludingVat: UnitPrice,
            quantity: Quantity,
            lineDiscount: LineDiscount,
            allocatedOrderDiscount: 0m,
            vatRate: VatRate);

        LineTotal = breakdown.Payable;
        NetAmount = breakdown.NetAmount;
        VatAmount = breakdown.VatAmount;
    }
}
