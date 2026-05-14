namespace Accounting.Infrastructure.EInvoice;

public interface IEInvoiceProvider
{
    Task<EInvoiceIssueResult> IssueInvoice(EInvoiceRequest request);
    Task<EInvoiceCancelResult> CancelInvoice(string invoiceId, string reason);
    Task<EInvoiceIssueResult> ReplaceInvoice(string oldInvoiceId, EInvoiceRequest newRequest);
    Task<EInvoiceStatusResult> GetStatus(string invoiceId);
    Task<byte[]> DownloadPdf(string invoiceId);
}
