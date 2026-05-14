namespace Accounting.Infrastructure.EInvoice;

public class MockEInvoiceProvider : IEInvoiceProvider
{
    public Task<EInvoiceIssueResult> IssueInvoice(EInvoiceRequest request)
    {
        var id = $"MOCK-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..8].ToUpper()}";
        return Task.FromResult(new EInvoiceIssueResult
        {
            Success = true,
            InvoiceId = id,
            InvoiceNumber = $"QH{DateTime.UtcNow:yyMM}{Random.Shared.Next(10000):D5}",
            LookupCode = Guid.NewGuid().ToString("N")[..10].ToUpper(),
            PdfUrl = $"/api/accounting/einvoice/pdf/{id}",
            IssuedDate = DateTime.UtcNow
        });
    }

    public Task<EInvoiceCancelResult> CancelInvoice(string invoiceId, string reason) =>
        Task.FromResult(new EInvoiceCancelResult { Success = true });

    public Task<EInvoiceIssueResult> ReplaceInvoice(string oldInvoiceId, EInvoiceRequest newRequest) =>
        IssueInvoice(newRequest);

    public Task<EInvoiceStatusResult> GetStatus(string invoiceId) =>
        Task.FromResult(new EInvoiceStatusResult
        {
            InvoiceId = invoiceId,
            Status = "SignedByCQT",
            SignedDate = DateTime.UtcNow,
            LookupUrl = $"https://hoadondientu.gdt.gov.vn/lookup?code={invoiceId}"
        });

    public Task<byte[]> DownloadPdf(string invoiceId) =>
        Task.FromResult(System.Text.Encoding.UTF8.GetBytes($"Mock PDF for invoice {invoiceId}"));
}
