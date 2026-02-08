using BuildingBlocks.SharedKernel;

namespace Accounting.Domain;

/// <summary>
/// Represents the application of a payment to an invoice.
/// </summary>
public class PaymentApplication : Entity<Guid>
{
    public Guid PaymentIntentId { get; private set; }
    public Guid InvoiceId { get; private set; }
    public decimal Amount { get; private set; }
    public DateTime AppliedAt { get; private set; }
    public string? Notes { get; private set; }

    protected PaymentApplication() { }

    public static PaymentApplication Create(
        Guid paymentIntentId,
        Guid invoiceId,
        decimal amount,
        string? notes = null)
    {
        if (paymentIntentId == Guid.Empty)
            throw new ArgumentException("Payment Intent ID cannot be empty", nameof(paymentIntentId));
        if (invoiceId == Guid.Empty)
            throw new ArgumentException("Invoice ID cannot be empty", nameof(invoiceId));
        if (amount <= 0)
            throw new ArgumentException("Application amount must be positive", nameof(amount));

        return new PaymentApplication
        {
            Id = Guid.NewGuid(),
            PaymentIntentId = paymentIntentId,
            InvoiceId = invoiceId,
            Amount = amount,
            AppliedAt = DateTime.UtcNow,
            Notes = notes
        };
    }

    public static void ValidateTotalApplications(
        decimal invoiceOutstanding,
        decimal existingApplications,
        decimal newApplicationAmount)
    {
        var totalAfterApplication = existingApplications + newApplicationAmount;
        if (totalAfterApplication > invoiceOutstanding)
            throw new InvalidOperationException(
                $"Total payment applications ({totalAfterApplication:C}) cannot exceed invoice outstanding amount ({invoiceOutstanding:C})");
    }

    public void UpdateAmount(decimal newAmount)
    {
        if (newAmount <= 0)
            throw new ArgumentException("Amount must be positive", nameof(newAmount));
        Amount = newAmount;
    }
}
