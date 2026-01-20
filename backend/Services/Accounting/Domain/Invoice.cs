using BuildingBlocks.SharedKernel;

namespace Accounting.Domain;

/// <summary>
/// Represents an invoice for accounts receivable (from customers/organizations) 
/// or accounts payable (to suppliers)
/// </summary>
public class Invoice : AggregateRoot<Guid>
{
    public string InvoiceNumber { get; private set; } = string.Empty;
    public InvoiceType Type { get; private set; }
    public InvoiceStatus Status { get; private set; }
    
    // For AR: Customer/Organization reference
    public Guid? CustomerId { get; private set; }
    public Guid? OrganizationAccountId { get; private set; }
    
    // For AP: Supplier reference
    public Guid? SupplierId { get; private set; }
    
    public DateTime IssueDate { get; private set; }
    public DateTime DueDate { get; private set; }
    
    public decimal SubTotal { get; private set; }
    public decimal VatRate { get; private set; }
    public decimal VatAmount { get; private set; }
    public decimal TotalAmount { get; private set; }
    public decimal PaidAmount { get; private set; }
    public decimal RemainingAmount => TotalAmount - PaidAmount;

    // AR/AP specific properties
    public decimal OutstandingAmount => TotalAmount - PaidAmount;
    public AgingBucket AgingBucket { get; private set; } = AgingBucket.None;
    
    public Currency Currency { get; private set; }
    public string? Notes { get; private set; }
    
    private readonly List<InvoiceLine> _lines = new();
    public IReadOnlyCollection<InvoiceLine> Lines => _lines.AsReadOnly();
    
    private readonly List<Payment> _payments = new();
    public IReadOnlyCollection<Payment> Payments => _payments.AsReadOnly();

    private readonly List<PaymentApplication> _paymentApplications = new();
    public IReadOnlyCollection<PaymentApplication> PaymentApplications => _paymentApplications.AsReadOnly();

    protected Invoice() { }

    public static Invoice CreateReceivable(
        Guid? customerId,
        Guid? organizationAccountId,
        DateTime dueDate,
        decimal vatRate,
        Currency currency,
        string? notes = null)
    {
        return new Invoice
        {
            Id = Guid.NewGuid(),
            InvoiceNumber = GenerateInvoiceNumber("AR"),
            Type = InvoiceType.Receivable,
            Status = InvoiceStatus.Draft,
            CustomerId = customerId,
            OrganizationAccountId = organizationAccountId,
            IssueDate = DateTime.UtcNow,
            DueDate = dueDate,
            VatRate = vatRate,
            Currency = currency,
            Notes = notes
        };
    }

    public static Invoice CreatePayable(
        Guid supplierId,
        DateTime dueDate,
        decimal vatRate,
        Currency currency,
        string? notes = null)
    {
        return new Invoice
        {
            Id = Guid.NewGuid(),
            InvoiceNumber = GenerateInvoiceNumber("AP"),
            Type = InvoiceType.Payable,
            Status = InvoiceStatus.Draft,
            SupplierId = supplierId,
            IssueDate = DateTime.UtcNow,
            DueDate = dueDate,
            VatRate = vatRate,
            Currency = currency,
            Notes = notes
        };
    }

    public void AddLine(string description, decimal quantity, decimal unitPrice, decimal vatRate = 0)
    {
        if (Status != InvoiceStatus.Draft)
            throw new InvalidOperationException("Cannot modify a non-draft invoice");

        var line = new InvoiceLine(description, quantity, unitPrice, vatRate);
        _lines.Add(line);
        RecalculateTotals();
    }

    public void Issue()
    {
        if (Status != InvoiceStatus.Draft)
            throw new InvalidOperationException("Only draft invoices can be issued");

        if (!_lines.Any())
            throw new InvalidOperationException("Invoice must have at least one line item");

        Status = InvoiceStatus.Issued;
        IssueDate = DateTime.UtcNow;

        // Initialize aging status
        CalculateAgingStatus();

        RaiseDomainEvent(new InvoiceIssuedEvent(Id, InvoiceNumber, TotalAmount, DueDate));
    }

    /// <summary>
    /// Applies a payment to this invoice via PaymentApplication.
    /// Validates that the total applications don't exceed outstanding amount.
    /// </summary>
    public void ApplyPayment(Guid paymentId, decimal amount, string? notes = null)
    {
        if (Status == InvoiceStatus.Draft)
            throw new InvalidOperationException("Cannot apply payment to draft invoice");

        if (Status == InvoiceStatus.Cancelled)
            throw new InvalidOperationException("Cannot apply payment to cancelled invoice");

        if (amount <= 0)
            throw new ArgumentException("Payment amount must be positive", nameof(amount));

        // Calculate existing applications for this invoice
        var existingApplications = _paymentApplications.Sum(pa => pa.Amount);

        // Validate that total applications don't exceed outstanding
        PaymentApplication.ValidateTotalApplications(OutstandingAmount, existingApplications, amount);

        // Create and add the payment application
        var application = PaymentApplication.Create(paymentId, Id, amount, notes);
        _paymentApplications.Add(application);

        // Update paid amount
        PaidAmount += amount;

        // Update status based on payment
        if (OutstandingAmount == 0)
        {
            Status = InvoiceStatus.Paid;
            RaiseDomainEvent(new InvoicePaidEvent(Id, InvoiceNumber));
        }
        else if (PaidAmount > 0)
        {
            Status = InvoiceStatus.PartiallyPaid;
        }

        // Recalculate aging status
        CalculateAgingStatus();
    }

    /// <summary>
    /// Calculates and updates the aging bucket based on due date vs current date.
    /// Should be called periodically or when status changes.
    /// </summary>
    public void CalculateAgingStatus()
    {
        if (Status == InvoiceStatus.Paid || Status == InvoiceStatus.Cancelled)
        {
            AgingBucket = AgingBucket.None;
            return;
        }

        var daysOverdue = (DateTime.UtcNow - DueDate).Days;

        AgingBucket = daysOverdue switch
        {
            <= 0 => AgingBucket.Current,
            <= 30 => AgingBucket.Days1To30,
            <= 60 => AgingBucket.Days31To60,
            <= 90 => AgingBucket.Days61To90,
            _ => AgingBucket.Over90Days
        };

        // Mark as overdue if past due date and not paid
        if (daysOverdue > 0 && Status == InvoiceStatus.Issued)
        {
            Status = InvoiceStatus.Overdue;
            RaiseDomainEvent(new InvoiceOverdueEvent(Id, InvoiceNumber, DueDate, OutstandingAmount));
        }
    }

    public void RecordPayment(decimal amount, string paymentReference, PaymentMethod method)
    {
        if (Status == InvoiceStatus.Draft)
            throw new InvalidOperationException("Cannot record payment for draft invoice");

        if (amount <= 0)
            throw new ArgumentException("Payment amount must be positive");

        if (amount > RemainingAmount)
            throw new InvalidOperationException("Payment exceeds remaining amount");

        var payment = new Payment(Id, amount, paymentReference, method);
        _payments.Add(payment);
        PaidAmount += amount;

        if (RemainingAmount == 0)
        {
            Status = InvoiceStatus.Paid;
            RaiseDomainEvent(new InvoicePaidEvent(Id, InvoiceNumber));
        }
        else
        {
            Status = InvoiceStatus.PartiallyPaid;
        }
    }

    public void MarkOverdue()
    {
        if (Status == InvoiceStatus.Issued && DateTime.UtcNow > DueDate)
        {
            Status = InvoiceStatus.Overdue;
            RaiseDomainEvent(new InvoiceOverdueEvent(Id, InvoiceNumber, DueDate, RemainingAmount));
        }
    }

    public void Cancel(string reason)
    {
        if (Status == InvoiceStatus.Paid)
            throw new InvalidOperationException("Cannot cancel a paid invoice");

        Status = InvoiceStatus.Cancelled;
        Notes = $"{Notes}\nCancelled: {reason}";
    }

    public AgingBucket GetAgingBucket()
    {
        if (Status == InvoiceStatus.Paid || Status == InvoiceStatus.Cancelled)
            return AgingBucket.None;

        var daysOverdue = (DateTime.UtcNow - DueDate).Days;
        
        return daysOverdue switch
        {
            <= 0 => AgingBucket.Current,
            <= 30 => AgingBucket.Days1To30,
            <= 60 => AgingBucket.Days31To60,
            <= 90 => AgingBucket.Days61To90,
            _ => AgingBucket.Over90Days
        };
    }

    private void RecalculateTotals()
    {
        SubTotal = _lines.Sum(l => l.LineTotal);
        VatAmount = _lines.Sum(l => l.VatAmount);
        TotalAmount = SubTotal + VatAmount;
    }

    private static string GenerateInvoiceNumber(string prefix)
    {
        return $"{prefix}-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpper()}";
    }
}

public class InvoiceLine
{
    public Guid Id { get; private set; }
    public string Description { get; private set; }
    public decimal Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }
    public decimal VatRate { get; private set; }
    public decimal LineTotal => Quantity * UnitPrice;
    public decimal VatAmount => LineTotal * VatRate / 100;

    public InvoiceLine(string description, decimal quantity, decimal unitPrice, decimal vatRate)
    {
        Id = Guid.NewGuid();
        Description = description;
        Quantity = quantity;
        UnitPrice = unitPrice;
        VatRate = vatRate;
    }

    protected InvoiceLine() { }
}

public class Payment
{
    public Guid Id { get; private set; }
    public Guid InvoiceId { get; private set; }
    public decimal Amount { get; private set; }
    public DateTime PaymentDate { get; private set; }
    public string PaymentReference { get; private set; }
    public PaymentMethod Method { get; private set; }

    public Payment(Guid invoiceId, decimal amount, string paymentReference, PaymentMethod method)
    {
        Id = Guid.NewGuid();
        InvoiceId = invoiceId;
        Amount = amount;
        PaymentDate = DateTime.UtcNow;
        PaymentReference = paymentReference;
        Method = method;
    }

    protected Payment() { }
}

// Domain Events
public record InvoiceIssuedEvent(Guid InvoiceId, string InvoiceNumber, decimal TotalAmount, DateTime DueDate) : DomainEvent;
public record InvoicePaidEvent(Guid InvoiceId, string InvoiceNumber) : DomainEvent;
public record InvoiceOverdueEvent(Guid InvoiceId, string InvoiceNumber, DateTime DueDate, decimal RemainingAmount) : DomainEvent;
