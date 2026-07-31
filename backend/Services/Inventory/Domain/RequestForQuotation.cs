using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

/// <summary>
/// Yêu cầu báo giá (Request For Quotation — RFQ) gửi 1..n nhà cung cấp.
/// Vòng đời: Draft → Sent → ClosedForBidding → Awarded | Cancelled.
/// Sản phẩm cần chào giá lưu dạng JSON để không phồng bảng con.
/// </summary>
public class RequestForQuotation : Entity<Guid>
{
    public string Number { get; private set; } = string.Empty;
    public Guid? RequisitionId { get; private set; }
    public Guid CreatedByUserId { get; private set; }
    public DateTime RequestDate { get; private set; } = DateTime.UtcNow;
    public DateTime? DueDate { get; private set; }
    public RfqStatus Status { get; private set; } = RfqStatus.Draft;
    public string? Notes { get; private set; }
    public string ItemsJson { get; private set; } = "[]";

    public Guid? AwardedQuotationId { get; private set; }
    public Guid? AwardedPOId { get; private set; }
    public DateTime? AwardedAt { get; private set; }

    protected RequestForQuotation() { }

    public RequestForQuotation(Guid createdByUserId, string itemsJson, DateTime? dueDate = null, Guid? requisitionId = null, string? notes = null)
    {
        if (string.IsNullOrWhiteSpace(itemsJson) || itemsJson == "[]")
            throw new ArgumentException("RFQ phải có danh sách sản phẩm cần chào giá.", nameof(itemsJson));

        Id = Guid.NewGuid();
        Number = $"RFQ-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}";
        CreatedByUserId = createdByUserId;
        ItemsJson = itemsJson;
        DueDate = dueDate;
        RequisitionId = requisitionId;
        Notes = notes;
    }

    public void MarkSent()
    {
        if (Status != RfqStatus.Draft)
            throw new InvalidOperationException("Chỉ RFQ nháp mới có thể gửi.");
        Status = RfqStatus.Sent;
    }

    public void CloseForBidding()
    {
        if (Status != RfqStatus.Sent)
            throw new InvalidOperationException("Chỉ RFQ đang mở mới có thể đóng.");
        Status = RfqStatus.ClosedForBidding;
    }

    public void Award(Guid quotationId, Guid poId)
    {
        if (Status != RfqStatus.Sent && Status != RfqStatus.ClosedForBidding)
            throw new InvalidOperationException("RFQ phải ở trạng thái Sent hoặc ClosedForBidding để chọn NCC thắng.");
        Status = RfqStatus.Awarded;
        AwardedQuotationId = quotationId;
        AwardedPOId = poId;
        AwardedAt = DateTime.UtcNow;
    }

    public void Cancel()
    {
        if (Status == RfqStatus.Awarded)
            throw new InvalidOperationException("RFQ đã chọn NCC thắng, không thể huỷ.");
        Status = RfqStatus.Cancelled;
    }
}

public enum RfqStatus
{
    Draft = 0,
    Sent = 1,
    ClosedForBidding = 2,
    Awarded = 3,
    Cancelled = 4
}
