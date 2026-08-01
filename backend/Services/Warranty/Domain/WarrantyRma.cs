using BuildingBlocks.SharedKernel;

namespace Warranty.Domain;

/// <summary>
/// Phase 07: Return Merchandise Authorization — gửi hàng về hãng/NCC.
/// SupplierId chỉ lưu Guid (không FK sang Inventory.Supplier — module Warranty độc lập).
/// ItemsJson: list serial + issue theo JSON để mở rộng linh hoạt (không cần bảng con).
/// </summary>
public class WarrantyRma : Entity<Guid>
{
    public Guid SupplierId { get; private set; }
    public string RmaNumber { get; private set; } = string.Empty;   // internal
    public string? ExternalRmaCode { get; private set; }             // do hãng cấp
    public DateTime SentDate { get; private set; }
    public DateTime? ExpectedReturnDate { get; private set; }
    public DateTime? ActualReturnDate { get; private set; }
    public RmaStatus Status { get; private set; }
    public string? Result { get; private set; }                      // Repaired|Replaced|Refunded|Rejected
    public string ItemsJson { get; private set; } = "[]";
    public string? Notes { get; private set; }

    protected WarrantyRma() { }

    public WarrantyRma(
        Guid supplierId,
        string rmaNumber,
        string itemsJson,
        DateTime? expectedReturnDate = null,
        string? externalRmaCode = null,
        string? notes = null)
    {
        if (string.IsNullOrWhiteSpace(rmaNumber))
            throw new ArgumentException("RmaNumber không được rỗng.", nameof(rmaNumber));

        Id = Guid.NewGuid();
        SupplierId = supplierId;
        RmaNumber = rmaNumber;
        ExternalRmaCode = externalRmaCode;
        ItemsJson = itemsJson ?? "[]";
        SentDate = DateTime.UtcNow;
        ExpectedReturnDate = expectedReturnDate;
        Notes = notes;
        Status = RmaStatus.Draft;
    }

    public void MarkSent(string? externalRmaCode = null)
    {
        if (Status != RmaStatus.Draft)
            throw new InvalidOperationException("Chỉ gửi RMA đang Draft.");
        Status = RmaStatus.Sent;
        SentDate = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(externalRmaCode))
            ExternalRmaCode = externalRmaCode;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkReceived(string result, string? notes = null)
    {
        if (Status != RmaStatus.Sent)
            throw new InvalidOperationException("Chỉ nhận về RMA đã gửi.");
        Status = RmaStatus.Received;
        ActualReturnDate = DateTime.UtcNow;
        Result = result;
        if (!string.IsNullOrWhiteSpace(notes)) Notes = notes;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Close()
    {
        if (Status != RmaStatus.Received)
            throw new InvalidOperationException("Chỉ đóng RMA đã nhận về.");
        Status = RmaStatus.Closed;
        UpdatedAt = DateTime.UtcNow;
    }

    public bool IsOverdue(DateTime? now = null)
    {
        if (ActualReturnDate != null) return false;
        if (!ExpectedReturnDate.HasValue) return false;
        var reference = now ?? DateTime.UtcNow;
        return reference > ExpectedReturnDate.Value;
    }
}

public enum RmaStatus
{
    Draft = 1,
    Sent = 2,
    Received = 3,
    Closed = 4
}
