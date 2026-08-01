using BuildingBlocks.SharedKernel;

namespace Warranty.Domain;

/// <summary>
/// Phase 07: máy cho mượn khi khách bảo hành lâu (đặc biệt khi gửi hãng).
/// SerialNumberId chỉ lưu Guid (FK Inventory qua Guid — module Warranty không import Inventory.Domain).
/// </summary>
public class LoanerDevice : Entity<Guid>
{
    public Guid SerialNumberId { get; private set; }
    public string SerialNumber { get; private set; } = string.Empty;
    public Guid CustomerId { get; private set; }
    public Guid WarrantyClaimId { get; private set; }
    public DateTime LoanedDate { get; private set; }
    public DateTime ExpectedReturnDate { get; private set; }
    public DateTime? ActualReturnDate { get; private set; }
    public string ConditionAtLoan { get; private set; } = string.Empty;
    public string? ConditionAtReturn { get; private set; }
    public LoanerStatus Status { get; private set; }
    public string? Notes { get; private set; }

    protected LoanerDevice() { }

    public LoanerDevice(
        Guid serialNumberId,
        string serialNumber,
        Guid customerId,
        Guid warrantyClaimId,
        DateTime expectedReturnDate,
        string conditionAtLoan,
        string? notes = null)
    {
        if (string.IsNullOrWhiteSpace(serialNumber))
            throw new ArgumentException("Serial máy mượn không được rỗng.", nameof(serialNumber));
        if (expectedReturnDate <= DateTime.UtcNow)
            throw new ArgumentException("Hạn trả phải trong tương lai.", nameof(expectedReturnDate));

        Id = Guid.NewGuid();
        SerialNumberId = serialNumberId;
        SerialNumber = serialNumber;
        CustomerId = customerId;
        WarrantyClaimId = warrantyClaimId;
        LoanedDate = DateTime.UtcNow;
        ExpectedReturnDate = expectedReturnDate;
        ConditionAtLoan = conditionAtLoan;
        Status = LoanerStatus.Loaned;
        Notes = notes;
    }

    public void MarkReturned(string conditionAtReturn, string? notes = null)
    {
        if (Status != LoanerStatus.Loaned)
            throw new InvalidOperationException("Chỉ trả máy đang cho mượn.");
        Status = LoanerStatus.Returned;
        ActualReturnDate = DateTime.UtcNow;
        ConditionAtReturn = conditionAtReturn;
        if (!string.IsNullOrWhiteSpace(notes)) Notes = notes;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkLost(string? notes = null)
    {
        if (Status != LoanerStatus.Loaned)
            throw new InvalidOperationException("Chỉ đánh dấu mất với máy đang cho mượn.");
        Status = LoanerStatus.Lost;
        if (!string.IsNullOrWhiteSpace(notes)) Notes = notes;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkDamaged(string conditionAtReturn, string notes)
    {
        if (Status != LoanerStatus.Loaned)
            throw new InvalidOperationException("Chỉ đánh dấu hỏng với máy đang cho mượn.");
        Status = LoanerStatus.Damaged;
        ActualReturnDate = DateTime.UtcNow;
        ConditionAtReturn = conditionAtReturn;
        Notes = notes;
        UpdatedAt = DateTime.UtcNow;
    }

    public bool IsOverdue(DateTime? now = null)
    {
        if (Status != LoanerStatus.Loaned) return false;
        var reference = now ?? DateTime.UtcNow;
        return reference > ExpectedReturnDate;
    }
}

public enum LoanerStatus
{
    Loaned = 1,
    Returned = 2,
    Lost = 3,
    Damaged = 4
}
