using BuildingBlocks.SharedKernel;

namespace Repair.Domain;

/// <summary>
/// Báo giá sửa chữa, chi tiết theo dòng (<see cref="Lines"/>). Các cột tổng
/// (<see cref="PartsCost"/>/<see cref="LaborCost"/>/<see cref="ServiceFee"/>, Subtotal, VAT...) là
/// snapshot của <see cref="RepairQuoteCalculator"/> — chỉ đổi qua <see cref="ReplaceLines"/>, không
/// bao giờ được ghi tay. PartsCost/LaborCost/ServiceFee giữ lại (đã sau giảm giá, theo loại dòng) để
/// mọi màn hình và báo cáo cũ đọc 3 cột này vẫn cộng ra đúng <see cref="TotalCost"/>.
/// </summary>
public class RepairQuote : Entity<Guid>
{
    public const int DefaultValidityDays = 7;

    public Guid WorkOrderId { get; private set; }
    public string QuoteNumber { get; private set; } = string.Empty;

    // Tổng theo loại dòng, ĐÃ trừ giảm giá (VND nguyên, gồm VAT)
    public decimal PartsCost { get; private set; }
    public decimal LaborCost { get; private set; }
    public decimal ServiceFee { get; private set; }
    public decimal TotalCost => PartsCost + LaborCost + ServiceFee;

    // Snapshot tính tiền
    public decimal SubtotalAmount { get; private set; }
    public decimal LineDiscountTotal { get; private set; }
    public decimal DiscountAmount { get; private set; }
    public decimal NetAmount { get; private set; }
    public decimal VatAmount { get; private set; }
    public decimal VatRate { get; private set; }

    // Labor Details (thông tin, không tham gia tính tiền)
    public decimal EstimatedHours { get; private set; }
    public decimal HourlyRate { get; private set; }

    public string? Description { get; private set; }
    public string? Notes { get; private set; }

    public QuoteStatus Status { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public DateTime? RejectedAt { get; private set; }
    public string? RejectionReason { get; private set; }
    public DateTime ValidUntil { get; private set; }

    public WorkOrder? WorkOrder { get; private set; }
    public List<RepairQuoteLine> Lines { get; private set; } = new();

    protected RepairQuote() { }

    public RepairQuote(
        Guid workOrderId,
        decimal estimatedHours,
        decimal hourlyRate,
        string? description = null,
        string? notes = null,
        int validityDays = DefaultValidityDays)
    {
        if (estimatedHours < 0)
            throw new ArgumentException("Estimated hours cannot be negative");
        if (hourlyRate < 0)
            throw new ArgumentException("Hourly rate cannot be negative");

        Id = Guid.NewGuid();
        WorkOrderId = workOrderId;
        QuoteNumber = GenerateQuoteNumber();
        EstimatedHours = estimatedHours;
        HourlyRate = hourlyRate;
        Description = description;
        Notes = notes;
        Status = QuoteStatus.Pending;
        ValidUntil = DateTime.UtcNow.AddDays(validityDays > 0 ? validityDays : DefaultValidityDays);
        CreatedAt = DateTime.UtcNow;
    }

    private static string GenerateQuoteNumber()
        => $"QT-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";

    /// <summary>
    /// Thay toàn bộ dòng + giảm giá cả phiếu và chụp lại kết quả tính. Trả về các dòng MỚI để
    /// caller stage tường minh (<c>db.RepairQuoteLines.AddRange</c>) — cùng lý do với ghi chú trên
    /// <see cref="WorkOrder.AddActivityLog"/>: khoá Guid sinh sẵn khiến EF tưởng là dòng cũ.
    /// </summary>
    public IReadOnlyList<RepairQuoteLine> ReplaceLines(
        IReadOnlyList<RepairQuoteLineDraft> drafts, decimal quoteDiscount, decimal vatRate)
    {
        if (Status != QuoteStatus.Pending)
            throw new InvalidOperationException("Cannot update lines of a non-pending quote");

        var pricing = RepairQuoteCalculator.Calculate(drafts, quoteDiscount, vatRate);
        var newLines = drafts.Select((d, i) => new RepairQuoteLine(Id, i + 1, d, pricing.LineAmounts[i])).ToList();

        Lines.Clear();
        Lines.AddRange(newLines);

        PartsCost = pricing.PartsTotal;
        LaborCost = pricing.LaborTotal;
        ServiceFee = pricing.ServiceTotal;
        SubtotalAmount = pricing.SubtotalAmount;
        LineDiscountTotal = pricing.LineDiscountTotal;
        DiscountAmount = pricing.QuoteDiscount;
        NetAmount = pricing.NetAmount;
        VatAmount = pricing.VatAmount;
        VatRate = pricing.VatRate;
        UpdatedAt = DateTime.UtcNow;
        return newLines;
    }

    public void UpdateDetails(decimal estimatedHours, decimal hourlyRate, string? description, string? notes)
    {
        if (Status != QuoteStatus.Pending)
            throw new InvalidOperationException("Cannot update a non-pending quote");
        if (estimatedHours < 0 || hourlyRate < 0)
            throw new ArgumentException("Hours and rate cannot be negative");

        EstimatedHours = estimatedHours;
        HourlyRate = hourlyRate;
        Description = description;
        Notes = notes;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Approve()
    {
        if (DateTime.UtcNow > ValidUntil)
            throw new InvalidOperationException("Quote has expired");

        if (Status != QuoteStatus.Pending)
            throw new InvalidOperationException($"Cannot approve quote in {Status} status");

        Status = QuoteStatus.Approved;
        ApprovedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Reject(string reason)
    {
        if (Status != QuoteStatus.Pending)
            throw new InvalidOperationException($"Cannot reject quote in {Status} status");

        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Rejection reason is required", nameof(reason));

        Status = QuoteStatus.Rejected;
        RejectedAt = DateTime.UtcNow;
        RejectionReason = reason;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkAsExpired()
    {
        if (DateTime.UtcNow > ValidUntil && Status == QuoteStatus.Pending)
        {
            Status = QuoteStatus.Expired;
            UpdatedAt = DateTime.UtcNow;
        }
    }

    public bool IsExpired() => DateTime.UtcNow > ValidUntil;
}
