using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Accounting.Infrastructure;
using Accounting.Domain;
using Microsoft.AspNetCore.Authorization;

namespace Accounting;

public static class AccountingEndpoints
{
    public static void MapAccountingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/accounting").RequireAuthorization(policy => policy.RequireRole("Admin", "Manager", "Accountant"));

        // Organization Accounts (AR)
        group.MapGet("/accounts", async (AccountingDbContext db) =>
        {
            return await db.Accounts.ToListAsync();
        });

        group.MapGet("/accounts/{id:guid}", async (Guid id, AccountingDbContext db) =>
        {
            var account = await db.Accounts.FindAsync(id);
            return account != null ? Results.Ok(account) : Results.NotFound();
        });

        group.MapPost("/accounts", async (CreateAccountDto dto, AccountingDbContext db) =>
        {
            var account = new OrganizationAccount(dto.Name, dto.CreditLimit);
            db.Accounts.Add(account);
            await db.SaveChangesAsync();
            return Results.Created($"/api/accounting/accounts/{account.Id}", account);
        });

        // Invoices
        group.MapGet("/invoices", async (AccountingDbContext db, int page = 1, int pageSize = 20) =>
        {
            var total = await db.Invoices.CountAsync();
            var invoices = await db.Invoices
                .OrderByDescending(i => i.IssueDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Results.Ok(new { Total = total, Invoices = invoices });
        });

        group.MapGet("/invoices/{id:guid}", async (Guid id, AccountingDbContext db) =>
        {
            var invoice = await db.Invoices
                .Include("_lines") // Eager load private field if configured, or use Lines property access if EF mapped
                .Include("_payments")
                .FirstOrDefaultAsync(i => i.Id == id);
                
            // Note: EF Core Maps backing fields automatically if convention is followed.
            // If explicit Include is needed for Lines/Payments, they should be navigation properties.
            // Assuming Lines is mapped as owned types or relations.
            
            return invoice != null ? Results.Ok(invoice) : Results.NotFound();
        });

        group.MapPost("/invoices", async (CreateInvoiceDto dto, AccountingDbContext db) =>
        {
            var invoice = Invoice.CreateReceivable(dto.CustomerId, null, DateTime.UtcNow.AddDays(30), 10, Currency.USD, dto.Notes);
            foreach(var item in dto.Items)
            {
                invoice.AddLine(item.Description, item.Quantity, item.UnitPrice, 10);
            }
            
            invoice.Issue();
            
            db.Invoices.Add(invoice);
            await db.SaveChangesAsync();
            return Results.Created($"/api/accounting/invoices/{invoice.Id}", invoice);
        });

        group.MapPost("/invoices/{id:guid}/payments", async (Guid id, decimal amount, string reference, AccountingDbContext db) =>
        {
            var invoice = await db.Invoices.FindAsync(id);
            if (invoice == null) return Results.NotFound();

            try 
            {
                invoice.RecordPayment(amount, reference, PaymentMethod.BankTransfer);
                await db.SaveChangesAsync();
                return Results.Ok(invoice);
            }
            catch (Exception ex)
            {
                return Results.BadRequest(ex.Message);
            }
        });
        
        // HTML Template for Print/PDF
        group.MapGet("/invoices/{id:guid}/html", async (Guid id, AccountingDbContext db) => {
             var invoice = await db.Invoices.FindAsync(id); // Should include Lines
             if (invoice == null) return Results.NotFound();
             
             // Simple HTML Template
             var html = $@"
                <html>
                <head>
                    <style>
                        body {{ font-family: 'Helvetica', sans-serif; max-width: 800px; margin: auto; padding: 20px; }}
                        .header {{ display: flex; justify-content: space-between; margin-bottom: 50px; }}
                        .title {{ font-size: 40px; font-weight: bold; color: #333; }}
                        .meta {{ text-align: right; color: #666; }}
                        table {{ width: 100%; border-collapse: collapse; margin-bottom: 30px; }}
                        th {{ text-align: left; border-bottom: 2px solid #ddd; padding: 10px; }}
                        td {{ border-bottom: 1px solid #eee; padding: 10px; }}
                        .total {{ text-align: right; font-size: 20px; font-weight: bold; }}
                        .status {{ display: inline-block; padding: 5px 10px; border-radius: 5px; background: #eee; font-weight: bold; }}
                        .paid {{ background: #dff0d8; color: #3c763d; }}
                    </style>
                </head>
                <body>
                    <div class='header'>
                        <div>
                            <div class='title'>INVOICE</div>
                            <div>Quang Huong Computer</div>
                            <div>123 Tech Street, Hanoi</div>
                        </div>
                        <div class='meta'>
                            <div>#{invoice.InvoiceNumber}</div>
                            <div>Date: {invoice.IssueDate:yyyy-MM-dd}</div>
                            <div>Due: {invoice.DueDate:yyyy-MM-dd}</div>
                        </div>
                    </div>

                    <div style='margin-bottom: 20px;'>
                        <span class='status {(invoice.Status == InvoiceStatus.Paid ? "paid" : "")}'>{invoice.Status}</span>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th>Qty</th>
                                <th>Price</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Lines would go here, need to load lines -->
                             <tr> <!-- Placeholder as Lines retrieval needs Include -->
                                <td>General Order Items</td>
                                <td>1</td>
                                <td>{invoice.SubTotal:C}</td>
                                <td>{invoice.SubTotal:C}</td>
                            </tr>
                        </tbody>
                    </table>

                     <div class='total'>
                        <div>Subtotal: {invoice.SubTotal:C}</div>
                        <div>VAT: {invoice.VatAmount:C}</div>
                        <div style='font-size: 24px; margin-top: 10px;'>Total: {invoice.TotalAmount:C}</div>
                    </div>
                </body>
                </html>
             ";
             
             return Results.Content(html, "text/html");
        });

        // Summary Stats
        group.MapGet("/stats", async (AccountingDbContext db) =>
        {
            var today = DateTime.UtcNow.Date;
            var stats = new
            {
                TotalReceivables = await db.Invoices
                    .Where(i => i.Status != InvoiceStatus.Paid && i.Status != InvoiceStatus.Cancelled)
                    .SumAsync(i => i.TotalAmount - i.PaidAmount),
                RevenueToday = await db.Invoices
                    .Where(i => i.IssueDate >= today && i.Status != InvoiceStatus.Cancelled)
                    .SumAsync(i => i.TotalAmount),
                TotalInvoices = await db.Invoices.CountAsync(),
                ActiveAccounts = await db.Accounts.CountAsync()
            };
            return Results.Ok(stats);
        });
    }
}

public record CreateInvoiceDto(Guid? CustomerId, List<CreateInvoiceItemDto> Items, string Notes);
public record CreateInvoiceItemDto(string Description, int Quantity, decimal UnitPrice);
public record CreateAccountDto(string Name, decimal CreditLimit);
