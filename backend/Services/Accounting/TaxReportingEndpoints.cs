using Accounting.Domain;
using Accounting.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Accounting;

public static class TaxReportingEndpoints
{
    public static void MapTaxReportingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/accounting/tax-reports").RequireAuthorization(policy => policy.RequireRole("Admin", "Manager", "Accountant"));

        // 1. VAT Ledger (Bảng kê thuế GTGT mua vào / bán ra) — truy vấn thật từ AccountingDbContext
        group.MapGet("/vat-ledger", async (AccountingDbContext db, int month, int year, string type = "out") =>
        {
            // type: "in" (Mua vào, hoá đơn Payable) or "out" (Bán ra, hoá đơn Receivable)
            var invoiceType = type == "in" ? InvoiceType.Payable : InvoiceType.Receivable;
            var start = new DateTime(year, month, 1);
            var end = start.AddMonths(1);

            var invoices = await db.Invoices
                .Where(i => i.Type == invoiceType && i.IssueDate >= start && i.IssueDate < end)
                .OrderBy(i => i.IssueDate)
                .ToListAsync();

            var records = invoices.Select(i => new
            {
                InvoiceNo = i.InvoiceNumber,
                Date = i.IssueDate,
                Buyer = i.CustomerId?.ToString() ?? i.SupplierId?.ToString() ?? i.OrganizationAccountId?.ToString() ?? "N/A",
                Gross = i.SubTotal,
                TaxRate = i.VatRate,
                TaxAmount = i.VatAmount
            }).ToList();

            return Results.Ok(new
            {
                month, year, type,
                totalGross = records.Sum(r => r.Gross),
                totalTax = records.Sum(r => r.TaxAmount),
                records
            });
        });

        // 2. Tờ khai thuế GTGT (VAT Declaration Form 01/GTGT) — real data from DB
        group.MapGet("/vat-declaration", async (AccountingDbContext db, string? period, string? type) =>
        {
            // period format: "2026-Q1" or "2026-05"
            // type: "monthly" or "quarterly"
            var (start, end) = ParsePeriod(
                period ?? $"{DateTime.UtcNow.Year}-{DateTime.UtcNow.Month:D2}",
                type ?? "monthly");

            // Output VAT (thuế đầu ra) - from sales invoices
            var outputInvoices = await db.Invoices
                .Where(i => i.Type == InvoiceType.Receivable && i.IssueDate >= start && i.IssueDate < end)
                .ToListAsync();

            var totalOutputVat = outputInvoices.Sum(i => i.VatAmount);
            var totalOutputRevenue = outputInvoices.Sum(i => i.TotalAmount - i.VatAmount);

            // Input VAT (thuế đầu vào) - from purchase invoices
            var inputInvoices = await db.Invoices
                .Where(i => i.Type == InvoiceType.Payable && i.IssueDate >= start && i.IssueDate < end)
                .ToListAsync();

            var totalInputVat = inputInvoices.Sum(i => i.VatAmount);

            var vatPayable = totalOutputVat - totalInputVat;

            return Results.Ok(new
            {
                Period = period,
                Type = type ?? "monthly",
                StartDate = start,
                EndDate = end,
                OutputVat = new { InvoiceCount = outputInvoices.Count, Revenue = totalOutputRevenue, VatAmount = totalOutputVat },
                InputVat = new { InvoiceCount = inputInvoices.Count, VatAmount = totalInputVat },
                VatPayable = vatPayable,
                VatRefundable = vatPayable < 0 ? Math.Abs(vatPayable) : 0
            });
        });

        // 3. Báo cáo thuế TNDN (CIT Report form) — doanh thu từ hoá đơn bán ra, chi phí từ Expense đã duyệt
        group.MapGet("/cit-report", async (AccountingDbContext db, int year) =>
        {
            var start = new DateTime(year, 1, 1);
            var end = start.AddYears(1);

            var totalRevenue = await db.Invoices
                .Where(i => i.Type == InvoiceType.Receivable && i.IssueDate >= start && i.IssueDate < end)
                .SumAsync(i => i.SubTotal);

            var deductibleExpenses = await db.Expenses
                .Where(e => e.Status == ExpenseStatus.Paid && e.ExpenseDate >= start && e.ExpenseDate < end)
                .SumAsync(e => e.Amount);

            var cit = Domain.VietnameseTaxEngine.CalculateCit(totalRevenue, deductibleExpenses);

            return Results.Ok(new
            {
                year,
                totalRevenue,
                deductibleExpenses,
                taxableIncome = cit.TaxableIncome,
                citRate = cit.TaxRate * 100,
                citPayable = cit.CitAmount
            });
        });
    }

    private static (DateTime start, DateTime end) ParsePeriod(string period, string type)
    {
        if (period.Contains('Q'))
        {
            var parts = period.Split('-');
            var year = int.Parse(parts[0]);
            var quarter = int.Parse(parts[1].Replace("Q", ""));
            var startMonth = (quarter - 1) * 3 + 1;
            return (new DateTime(year, startMonth, 1), new DateTime(year, startMonth, 1).AddMonths(3));
        }
        else
        {
            var parts = period.Split('-');
            var year = int.Parse(parts[0]);
            var month = int.Parse(parts[1]);
            if (type == "quarterly")
            {
                var quarter = (month - 1) / 3;
                var startMonth = quarter * 3 + 1;
                return (new DateTime(year, startMonth, 1), new DateTime(year, startMonth, 1).AddMonths(3));
            }
            return (new DateTime(year, month, 1), new DateTime(year, month, 1).AddMonths(1));
        }
    }
}
