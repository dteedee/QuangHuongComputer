using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Mvc;

namespace Accounting;

public static class EInvoiceEndpoints
{
    public static void MapEInvoiceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/accounting/einvoice").RequireAuthorization("RequireAccountantRole");

        // 1. Issue an E-Invoice (Phát hành HĐĐT)
        group.MapPost("/issue/{orderId:guid}", async (Guid orderId, [FromBody] IssueEInvoiceRequest request) =>
        {
            // Simulate integration with VNPT/MInvoice
            if (string.IsNullOrWhiteSpace(request.TaxCode) || string.IsNullOrWhiteSpace(request.BuyerName))
            {
                return Results.BadRequest(new { message = "Tax Code and Buyer Name are required." });
            }

            var mockInvoiceId = $"INV-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..8].ToUpper()}";
            var mockLookupCode = Guid.NewGuid().ToString("N")[..10].ToUpper();
            
            return Results.Ok(new 
            { 
                invoiceId = mockInvoiceId,
                lookupCode = mockLookupCode,
                status = "Issued",
                issuedDate = DateTime.UtcNow,
                provider = request.Provider // "VNPT", "Viettel", "EasyInvoice"
            });
        });

        // 2. Query E-Invoice Status
        group.MapGet("/status/{invoiceId}", (string invoiceId) =>
        {
            return Results.Ok(new 
            { 
                invoiceId,
                status = "Active",
                signedStatus = "SignedByTaxAuthority", // Đã cấp mã CQT
                lookupUrl = $"https://hoadondientu.gdt.gov.vn/lookup?code={invoiceId}"
            });
        });

        // 3. Cancel E-Invoice (Hủy hóa đơn)
        group.MapPost("/cancel/{invoiceId}", async (string invoiceId, [FromBody] CancelEInvoiceRequest request) =>
        {
            if (string.IsNullOrWhiteSpace(request.Reason))
            {
                return Results.BadRequest(new { message = "Cancel reason is required." });
            }
            return Results.Ok(new { invoiceId, status = "Cancelled", cancelledDate = DateTime.UtcNow });
        });
    }
}

public record IssueEInvoiceRequest(string Provider, string TaxCode, string BuyerName, string BuyerAddress, string BuyerEmail);
public record CancelEInvoiceRequest(string Reason);
