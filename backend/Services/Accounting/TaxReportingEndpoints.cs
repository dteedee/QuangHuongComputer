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
        var group = app.MapGroup("/api/accounting/tax-reports").RequireAuthorization("RequireAccountantRole");

        // 1. VAT Ledger (Bảng kê thuế GTGT mua vào / bán ra)
        group.MapGet("/vat-ledger", (int month, int year, string type = "out") =>
        {
            // type: "in" (Mua vào) or "out" (Bán ra)
            var mockRecords = new[]
            {
                new { InvoiceNo = "0000123", Date = new DateTime(year, month, 5), Buyer = "Công ty ABC", Gross = 10000000, TaxRate = 8, TaxAmount = 800000 },
                new { InvoiceNo = "0000124", Date = new DateTime(year, month, 12), Buyer = "Nguyễn Văn A", Gross = 15000000, TaxRate = 8, TaxAmount = 1200000 },
            };

            return Results.Ok(new
            {
                month, year, type,
                totalGross = 25000000,
                totalTax = 2000000,
                records = mockRecords
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

        // 3. Báo cáo thuế TNDN (CIT Report form)
        group.MapGet("/cit-report", (int year) =>
        {
            return Results.Ok(new
            {
                year,
                totalRevenue = 5000000000,
                deductibleExpenses = 4000000000,
                taxableIncome = 1000000000,
                citRate = 20,
                citPayable = 200000000
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
