using BuildingBlocks.SharedKernel;

namespace Accounting.Domain;

/// <summary>
/// Represents a payment recorded against an invoice.
/// </summary>
public class InvoicePayment : Entity<Guid>
{
    public Guid InvoiceId { get; private set; }
    public Guid PaymentIntentId { get; private set; }
    public decimal Amount { get; private set; }
    public DateTime PaymentDate { get; private set; }
    public string? ReferenceNumber { get; private set; }
    public string? Notes { get; private set; }

    protected InvoicePayment() { }

    public static InvoicePayment Create(
        Guid invoiceId,
        Guid paymentIntentId,
        decimal amount,
        DateTime paymentDate,
        string? referenceNumber = null,
        string? notes = null)
    {
        if (invoiceId == Guid.Empty)
            throw new ArgumentException("Invoice ID cannot be empty", nameof(invoiceId));
        if (paymentIntentId == Guid.Empty)
            throw new ArgumentException("Payment Intent ID cannot be empty", nameof(paymentIntentId));
        if (amount <= 0)
            throw new ArgumentException("Payment amount must be positive", nameof(amount));

        return new InvoicePayment
        {
            Id = Guid.NewGuid(),
            InvoiceId = invoiceId,
            PaymentIntentId = paymentIntentId,
            Amount = amount,
            PaymentDate = paymentDate,
            ReferenceNumber = referenceNumber,
            Notes = notes
        };
    }

    public void UpdateAmount(decimal newAmount)
    {
        if (newAmount <= 0)
            throw new ArgumentException("Amount must be positive", nameof(newAmount));
        Amount = newAmount;
    }
}
