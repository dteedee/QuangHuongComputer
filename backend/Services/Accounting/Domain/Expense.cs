using BuildingBlocks.SharedKernel;

namespace Accounting.Domain;

/// <summary>
/// Represents an expense record for tracking company expenditures
/// </summary>
public class Expense : AggregateRoot<Guid>
{
    public string ExpenseNumber { get; private set; } = string.Empty;
    public Guid CategoryId { get; private set; }
    public string Description { get; private set; } = string.Empty;
    public decimal Amount { get; private set; }
    public decimal VatAmount { get; private set; }
    public decimal TotalAmount { get; private set; }
    public Currency Currency { get; private set; }
    public DateTime ExpenseDate { get; private set; }
    public ExpenseStatus Status { get; private set; }
    public PaymentMethod? PaymentMethod { get; private set; }
    public Guid? SupplierId { get; private set; }
    public Guid? EmployeeId { get; private set; }
    public Guid CreatedBy { get; private set; }
    public Guid? ApprovedBy { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public DateTime? PaidAt { get; private set; }
    public string? RejectionReason { get; private set; }
    public string? Notes { get; private set; }
    public string? ReceiptUrl { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }

    // Navigation property
    public ExpenseCategory? Category { get; private set; }

    protected Expense() { }

    public static Expense Create(
        Guid categoryId,
        string description,
        decimal amount,
        decimal vatRate,
        Currency currency,
        DateTime expenseDate,
        Guid createdBy,
        Guid? supplierId = null,
        Guid? employeeId = null,
        string? notes = null,
        string? receiptUrl = null)
    {
        var vatAmount = amount * vatRate / 100;
        return new Expense
        {
            Id = Guid.NewGuid(),
            ExpenseNumber = GenerateExpenseNumber(),
            CategoryId = categoryId,
            Description = description,
            Amount = amount,
            VatAmount = vatAmount,
            TotalAmount = amount + vatAmount,
            Currency = currency,
            ExpenseDate = expenseDate,
            Status = ExpenseStatus.Pending,
            SupplierId = supplierId,
            EmployeeId = employeeId,
            CreatedBy = createdBy,
            Notes = notes,
            ReceiptUrl = receiptUrl,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Approve(Guid approvedBy)
    {
        if (Status != ExpenseStatus.Pending)
            throw new InvalidOperationException("Only pending expenses can be approved");

        Status = ExpenseStatus.Approved;
        ApprovedBy = approvedBy;
        ApprovedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;

        RaiseDomainEvent(new ExpenseApprovedEvent(Id, ExpenseNumber, TotalAmount));
    }

    public void Reject(Guid rejectedBy, string reason)
    {
        if (Status != ExpenseStatus.Pending)
            throw new InvalidOperationException("Only pending expenses can be rejected");

        Status = ExpenseStatus.Rejected;
        ApprovedBy = rejectedBy;
        ApprovedAt = DateTime.UtcNow;
        RejectionReason = reason;
        UpdatedAt = DateTime.UtcNow;

        RaiseDomainEvent(new ExpenseRejectedEvent(Id, ExpenseNumber, reason));
    }

    public void MarkAsPaid(PaymentMethod method)
    {
        if (Status != ExpenseStatus.Approved)
            throw new InvalidOperationException("Only approved expenses can be marked as paid");

        Status = ExpenseStatus.Paid;
        PaymentMethod = method;
        PaidAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;

        RaiseDomainEvent(new ExpensePaidEvent(Id, ExpenseNumber, TotalAmount, method));
    }

    public void Update(
        Guid categoryId,
        string description,
        decimal amount,
        decimal vatRate,
        DateTime expenseDate,
        Guid? supplierId,
        Guid? employeeId,
        string? notes,
        string? receiptUrl)
    {
        if (Status != ExpenseStatus.Pending)
            throw new InvalidOperationException("Only pending expenses can be updated");

        CategoryId = categoryId;
        Description = description;
        Amount = amount;
        VatAmount = amount * vatRate / 100;
        TotalAmount = Amount + VatAmount;
        ExpenseDate = expenseDate;
        SupplierId = supplierId;
        EmployeeId = employeeId;
        Notes = notes;
        ReceiptUrl = receiptUrl;
        UpdatedAt = DateTime.UtcNow;
    }

    private static string GenerateExpenseNumber()
    {
        return $"EXP-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
    }
}

/// <summary>
/// Expense category for classification
/// </summary>
public class ExpenseCategory : Entity<Guid>
{
    public string Name { get; private set; } = string.Empty;
    public string Code { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public bool IsActive { get; private set; }
    public DateTime CreatedAt { get; private set; }

    protected ExpenseCategory() { }

    public static ExpenseCategory Create(string name, string code, string? description = null)
    {
        return new ExpenseCategory
        {
            Id = Guid.NewGuid(),
            Name = name,
            Code = code.ToUpperInvariant(),
            Description = description,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Update(string name, string? description)
    {
        Name = name;
        Description = description;
    }

    public void Activate() => IsActive = true;
    public void Deactivate() => IsActive = false;
}

public enum ExpenseStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    Paid = 3
}

// Domain Events
public record ExpenseApprovedEvent(Guid ExpenseId, string ExpenseNumber, decimal TotalAmount) : DomainEvent;
public record ExpenseRejectedEvent(Guid ExpenseId, string ExpenseNumber, string Reason) : DomainEvent;
public record ExpensePaidEvent(Guid ExpenseId, string ExpenseNumber, decimal TotalAmount, PaymentMethod Method) : DomainEvent;
