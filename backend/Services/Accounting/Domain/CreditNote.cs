using BuildingBlocks.SharedKernel;

namespace Accounting.Domain;

public class CreditNote : Entity<Guid>
{
    public Guid OriginalInvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = "";
    public CreditNoteType Type { get; set; }
    public decimal Amount { get; set; }
    public string Reason { get; set; } = "";
    public string? EInvoiceId { get; set; }
    public CreditNoteStatus Status { get; set; } = CreditNoteStatus.Draft;
}

public enum CreditNoteType { Credit, Debit }
public enum CreditNoteStatus { Draft, Issued, Cancelled }
