using BuildingBlocks.SharedKernel;

namespace Accounting.Domain;

/// <summary>
/// Represents the application of a payment to an invoice.
/// Links payments to specific invoices, ensuring payment amounts don't exceed outstanding balances.
/// </summary>
public class PaymentApplication : Entity<Guid>
{
    public Guid PaymentId { get; private set; }
    public Guid InvoiceId { get; private set; }
    public decimal Amount { get; private set; }
    public DateTime AppliedAt { get; private set; }
    public string? Notes { get; private set; }

    protected PaymentApplication() { }

    /// <summary>
    /// Creates a new payment application linking a payment to an invoice.
    /// </summary>
    public static PaymentApplication Create(
        Guid paymentId,
        Guid invoiceId,
        decimal amount,
        string? notes = null)
    {
        if (paymentId == Guid.Empty)
            throw new ArgumentException("Payment ID cannot be empty", nameof(paymentId));

        if (invoiceId == Guid.Empty)
            throw new ArgumentException("Invoice ID cannot be empty", nameof(invoiceId));

        if (amount <= 0)
            throw new ArgumentException("Application amount must be positive", nameof(amount));

        return new PaymentApplication
        {
            Id = Guid.NewGuid(),
            PaymentId = paymentId,
            InvoiceId = invoiceId,
            Amount = amount,
            AppliedAt = DateTime.UtcNow,
            Notes = notes
        };
    }

    /// <summary>
    /// Validates that the total applications for an invoice don't exceed the invoice's outstanding amount.
    /// </summary>
    public static void ValidateTotalApplications(
        decimal invoiceOutstanding,
        decimal existingApplications,
        decimal newApplicationAmount)
    {
        var totalAfterApplication = existingApplications + newApplicationAmount;

        if (totalAfterApplication > invoiceOutstanding)
        {
            throw new InvalidOperationException(
                $"Total payment applications ({totalAfterApplication:C}) cannot exceed invoice outstanding amount ({invoiceOutstanding:C})");
        }
    }

    /// <summary>
    /// Updates the application amount. Should only be used in exceptional cases.
    /// </summary>
    public void UpdateAmount(decimal newAmount)
    {
        if (newAmount <= 0)
            throw new ArgumentException("Amount must be positive", nameof(newAmount));

        Amount = newAmount;
    }
}
