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

        group.MapPost("/accounts", async (OrganizationAccount account, AccountingDbContext db) =>
        {
            account.Id = Guid.NewGuid();
            account.CreatedAt = DateTime.UtcNow;
            db.Accounts.Add(account);
            await db.SaveChangesAsync();
            return Results.Created($"/api/accounting/accounts/{account.Id}", account);
        });

        // Invoices
        group.MapGet("/invoices", async (AccountingDbContext db, int page = 1, int pageSize = 20) =>
        {
            var total = await db.Invoices.CountAsync();
            var invoices = await db.Invoices
                .OrderByDescending(i => i.IssuedDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Results.Ok(new { Total = total, Invoices = invoices });
        });

        group.MapGet("/invoices/{id:guid}", async (Guid id, AccountingDbContext db) =>
        {
            var invoice = await db.Invoices.FindAsync(id);
            return invoice != null ? Results.Ok(invoice) : Results.NotFound();
        });

        group.MapPost("/invoices", async (Invoice invoice, AccountingDbContext db) =>
        {
            invoice.Id = Guid.NewGuid();
            invoice.IssuedDate = DateTime.UtcNow;
            invoice.DueDate = DateTime.UtcNow.AddDays(30);
            db.Invoices.Add(invoice);
            await db.SaveChangesAsync();
            return Results.Created($"/api/accounting/invoices/{invoice.Id}", invoice);
        });

        group.MapPost("/invoices/{id:guid}/payments", async (Guid id, InvoicePayment payment, AccountingDbContext db) =>
        {
            var invoice = await db.Invoices.FindAsync(id);
            if (invoice == null) return Results.NotFound();

            payment.Id = Guid.NewGuid();
            payment.PaymentDate = DateTime.UtcNow;
            invoice.Payments.Add(payment);
            invoice.PaidAmount += payment.Amount;
            
            if (invoice.PaidAmount >= invoice.TotalAmount)
                invoice.Status = InvoiceStatus.Paid;
            else if (invoice.PaidAmount > 0)
                invoice.Status = InvoiceStatus.PartiallyPaid;

            await db.SaveChangesAsync();
            return Results.Ok(invoice);
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
                    .Where(i => i.IssuedDate >= today && i.Status != InvoiceStatus.Cancelled)
                    .SumAsync(i => i.TotalAmount),
                TotalInvoices = await db.Invoices.CountAsync(),
                ActiveAccounts = await db.Accounts.CountAsync()
            };
            return Results.Ok(stats);
        });
    }
}
