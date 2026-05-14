using Accounting.Domain;
using Accounting.Infrastructure;
using Accounting.Infrastructure.EInvoice;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Accounting;

public static class EInvoiceEndpoints
{
    public static void MapEInvoiceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/accounting/einvoice").RequireAuthorization("RequireAccountantRole");

        // 1. Issue an E-Invoice (Phát hành HĐĐT)
        group.MapPost("/issue/{invoiceId:guid}", async (
            Guid invoiceId,
            [FromBody] IssueEInvoiceRequest request,
            AccountingDbContext db,
            IEInvoiceProvider provider) =>
        {
            if (string.IsNullOrWhiteSpace(request.BuyerName))
                return Results.BadRequest(new { message = "Buyer name is required." });

            var invoice = await db.Invoices
                .Include(i => i.Lines)
                .FirstOrDefaultAsync(i => i.Id == invoiceId);

            if (invoice == null)
                return Results.NotFound(new { message = "Invoice not found." });

            var einvoiceRequest = new EInvoiceRequest
            {
                BuyerName = request.BuyerName,
                BuyerTaxCode = request.BuyerTaxCode ?? "",
                BuyerAddress = request.BuyerAddress ?? "",
                BuyerEmail = request.BuyerEmail ?? "",
                PaymentMethod = request.PaymentMethod ?? "TM/CK",
                TotalBeforeVat = invoice.SubTotal,
                TotalVat = invoice.VatAmount,
                TotalAmount = invoice.TotalAmount,
                Items = invoice.Lines.Select(l => new EInvoiceItem
                {
                    Name = l.Description,
                    Quantity = l.Quantity,
                    UnitPrice = l.UnitPrice,
                    VatRate = l.VatRate / 100m, // stored as percent (e.g. 8), convert to decimal
                    VatAmount = l.VatAmount,
                    TotalAmount = l.LineTotal + l.VatAmount
                }).ToList()
            };

            var result = await provider.IssueInvoice(einvoiceRequest);
            if (!result.Success)
                return Results.Problem(result.ErrorMessage, statusCode: 502);

            invoice.UpdateEInvoice(result.InvoiceId, result.InvoiceNumber, result.LookupCode, "Issued");
            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                invoiceId = result.InvoiceId,
                invoiceNumber = result.InvoiceNumber,
                lookupCode = result.LookupCode,
                pdfUrl = result.PdfUrl,
                issuedDate = result.IssuedDate
            });
        });

        // 2. Query E-Invoice Status
        group.MapGet("/status/{invoiceId}", async (string invoiceId, IEInvoiceProvider provider) =>
        {
            var result = await provider.GetStatus(invoiceId);
            return Results.Ok(new
            {
                invoiceId = result.InvoiceId,
                status = result.Status,
                signedDate = result.SignedDate,
                lookupUrl = result.LookupUrl
            });
        });

        // 3. Cancel E-Invoice (Hủy hóa đơn)
        group.MapPost("/cancel/{invoiceId}", async (
            string invoiceId,
            [FromBody] CancelEInvoiceRequest request,
            IEInvoiceProvider provider) =>
        {
            if (string.IsNullOrWhiteSpace(request.Reason))
                return Results.BadRequest(new { message = "Cancel reason is required." });

            var result = await provider.CancelInvoice(invoiceId, request.Reason);
            if (!result.Success)
                return Results.Problem(result.ErrorMessage, statusCode: 502);

            return Results.Ok(new { invoiceId, status = "Cancelled", cancelledDate = DateTime.UtcNow });
        });

        // 4. Download E-Invoice PDF
        group.MapGet("/pdf/{invoiceId}", async (string invoiceId, IEInvoiceProvider provider) =>
        {
            var pdfBytes = await provider.DownloadPdf(invoiceId);
            return Results.File(pdfBytes, "application/pdf", $"invoice-{invoiceId}.pdf");
        });

        // 5. Replace E-Invoice (Thay thế hóa đơn)
        group.MapPost("/replace/{oldInvoiceId}", async (
            string oldInvoiceId,
            [FromBody] IssueEInvoiceRequest request,
            IEInvoiceProvider provider) =>
        {
            if (string.IsNullOrWhiteSpace(request.BuyerName))
                return Results.BadRequest(new { message = "Buyer name is required." });

            var newRequest = new EInvoiceRequest
            {
                BuyerName = request.BuyerName,
                BuyerTaxCode = request.BuyerTaxCode ?? "",
                BuyerAddress = request.BuyerAddress ?? "",
                BuyerEmail = request.BuyerEmail ?? "",
                PaymentMethod = request.PaymentMethod ?? "TM/CK"
            };

            var result = await provider.ReplaceInvoice(oldInvoiceId, newRequest);
            if (!result.Success)
                return Results.Problem(result.ErrorMessage, statusCode: 502);

            return Results.Ok(new
            {
                newInvoiceId = result.InvoiceId,
                invoiceNumber = result.InvoiceNumber,
                lookupCode = result.LookupCode,
                issuedDate = result.IssuedDate
            });
        });
    }
}

public record IssueEInvoiceRequest(
    string BuyerName,
    string? BuyerTaxCode,
    string? BuyerAddress,
    string? BuyerEmail,
    string? PaymentMethod);

public record CancelEInvoiceRequest(string Reason);
