using BuildingBlocks.SharedKernel;

namespace Repair.Domain;

/// <summary>
/// Một dòng báo giá sửa chữa. Mọi con số tiền là VND nguyên ĐÃ GỒM VAT; các cột kết quả
/// (Gross/AllocatedDiscount/LineTotal/NetAmount/VatAmount) do server tính bằng
/// <c>RepairQuoteCalculator</c> rồi snapshot lại — client không bao giờ tự tính.
/// </summary>
public class RepairQuoteLine : Entity<Guid>
{
    public Guid QuoteId { get; private set; }
    public int Sequence { get; private set; }
    public RepairQuoteLineKind Kind { get; private set; }
    public string Description { get; private set; } = string.Empty;

    /// <summary>Linh kiện lấy từ kho (tham chiếu, KHÔNG giữ hàng — báo giá chỉ là đề xuất).</summary>
    public Guid? InventoryItemId { get; private set; }
    public Guid? ProductId { get; private set; }

    /// <summary>Dòng được điền sẵn từ danh mục dịch vụ sửa chữa.</summary>
    public Guid? ServiceTypeId { get; private set; }

    public decimal Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }
    public decimal LineDiscount { get; private set; }

    // Snapshot kết quả tính
    public decimal GrossAmount { get; private set; }
    public decimal AllocatedDiscount { get; private set; }
    public decimal LineTotal { get; private set; }
    public decimal VatRate { get; private set; }
    public decimal NetAmount { get; private set; }
    public decimal VatAmount { get; private set; }

    public RepairQuote? Quote { get; private set; }

    protected RepairQuoteLine() { }

    internal RepairQuoteLine(Guid quoteId, int sequence, RepairQuoteLineDraft draft, RepairQuoteLineAmounts amounts)
    {
        Id = Guid.NewGuid();
        QuoteId = quoteId;
        Sequence = sequence;
        Kind = draft.Kind;
        Description = draft.Description.Trim();
        InventoryItemId = draft.InventoryItemId;
        ProductId = draft.ProductId;
        ServiceTypeId = draft.ServiceTypeId;
        Quantity = draft.Quantity;
        UnitPrice = draft.UnitPrice;
        LineDiscount = draft.LineDiscount;
        GrossAmount = amounts.GrossAmount;
        AllocatedDiscount = amounts.AllocatedDiscount;
        LineTotal = amounts.LineTotal;
        VatRate = amounts.VatRate;
        NetAmount = amounts.NetAmount;
        VatAmount = amounts.VatAmount;
        CreatedAt = DateTime.UtcNow;
    }
}

/// <summary>Đầu vào một dòng (đã được server bổ sung giá danh mục nếu thiếu).</summary>
public sealed record RepairQuoteLineDraft(
    RepairQuoteLineKind Kind,
    string Description,
    decimal Quantity,
    decimal UnitPrice,
    decimal LineDiscount = 0m,
    Guid? InventoryItemId = null,
    Guid? ProductId = null,
    Guid? ServiceTypeId = null);

/// <summary>Kết quả tính cho một dòng.</summary>
public sealed record RepairQuoteLineAmounts(
    decimal GrossAmount,
    decimal AllocatedDiscount,
    decimal LineTotal,
    decimal VatRate,
    decimal NetAmount,
    decimal VatAmount);
