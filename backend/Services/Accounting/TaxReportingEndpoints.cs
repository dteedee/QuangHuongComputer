using Accounting.Application.TaxReporting;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
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
        var group = app.MapGroup("/api/accounting/tax-reports").RequireModulePermissions(PermissionModules.Accounting);

        // 1. VAT Ledger (Bảng kê thuế GTGT mua vào / bán ra) — truy vấn thật từ AccountingDbContext
        group.MapGet("/vat-ledger", async (AccountingDbContext db, int month, int year, string type = "out") =>
        {
            // type: "in" (Mua vào, hoá đơn Payable) or "out" (Bán ra, hoá đơn Receivable)
            var invoiceType = type == "in" ? InvoiceType.Payable : InvoiceType.Receivable;
            var start = new DateTime(year, month, 1);
            var end = start.AddMonths(1);

            // W4-5 / H3: chỉ hoá đơn ĐÃ phát hành và CHƯA huỷ mới lên bảng kê.
            var invoices = await db.Invoices
                .Declarable(invoiceType, start, end)
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

            // W4-5 / H3: giấy báo có là hoá đơn điều chỉnh — phải nằm trên bảng kê bán ra
            // với dấu ÂM, nếu không tổng bảng kê không bao giờ khớp tờ khai.
            if (invoiceType == InvoiceType.Receivable)
            {
                var adjustments = await db.CreditNotes
                    .DeclarableAdjustments(start, end)
                    .OrderBy(c => c.IssueDate)
                    .ToListAsync();

                records.AddRange(adjustments.Select(c => new
                {
                    InvoiceNo = c.CreditNoteNumber,
                    Date = c.IssueDate,
                    Buyer = c.CustomerId?.ToString() ?? "N/A",
                    Gross = TaxDeclarationCalculator.Sign(c.Type) * c.NetAmount,
                    TaxRate = c.VatRate,
                    TaxAmount = TaxDeclarationCalculator.Sign(c.Type) * c.VatAmount
                }));
                records = records.OrderBy(r => r.Date).ToList();
            }

            return Results.Ok(new
            {
                month, year, type,
                totalGross = records.Sum(r => r.Gross),
                totalTax = records.Sum(r => r.TaxAmount),
                records
            });
        });

        // 2. Tờ khai thuế GTGT (VAT Declaration Form 01/GTGT) — real data from DB
        group.MapGet("/vat-declaration", async (AccountingDbContext db, IBusinessClock clock, string? period, string? type) =>
        {
            // period format: "2026-Q1" or "2026-05"
            // type: "monthly" or "quarterly"
            // W2-25 / D06 §3: kỳ mặc định là THÁNG HIỆN TẠI THEO GIỜ VN. DateTime.UtcNow lệch 7h
            // nên trong 7 tiếng đầu ngày 01 hằng tháng, tờ khai mặc định rơi về tháng TRƯỚC.
            var today = clock.TodayVn;
            var (start, end) = ParsePeriod(
                period ?? $"{today.Year}-{today.Month:D2}",
                type ?? "monthly");

            // W4-5 / H3: bỏ hoá đơn nháp/đã huỷ và ĐẢO phần đã lập giấy báo có (xem
            // TaxDeclarationCalculator — đây là số lên tờ khai, không được phép khai vống).
            var declaration = await TaxDeclarationCalculator.BuildVatDeclarationAsync(db, start, end);
            var vatPayable = declaration.VatPayable;

            return Results.Ok(new
            {
                Period = period,
                Type = type ?? "monthly",
                StartDate = start,
                EndDate = end,
                OutputVat = new
                {
                    InvoiceCount = declaration.OutputInvoiceCount,
                    Revenue = declaration.NetRevenue,
                    VatAmount = declaration.NetOutputVat,
                    GrossRevenue = declaration.OutputRevenue,
                    GrossVatAmount = declaration.OutputVat
                },
                Adjustments = new
                {
                    Count = declaration.AdjustmentCount,
                    Revenue = declaration.AdjustmentRevenue,
                    VatAmount = declaration.AdjustmentVat
                },
                InputVat = new { InvoiceCount = declaration.InputInvoiceCount, VatAmount = declaration.InputVat },
                VatPayable = vatPayable,
                VatRefundable = vatPayable < 0 ? Math.Abs(vatPayable) : 0
            });
        });

        // 3. Báo cáo thuế TNDN (CIT Report form) — doanh thu từ hoá đơn bán ra, chi phí từ Expense đã duyệt
        group.MapGet("/cit-report", async (AccountingDbContext db, int year) =>
        {
            var start = new DateTime(year, 1, 1);
            var end = start.AddYears(1);

            // W4-5 / H3: doanh thu TNDN cũng phải bỏ hoá đơn nháp/huỷ và trừ giấy báo có.
            var totalRevenue = await TaxDeclarationCalculator.BuildCitRevenueAsync(db, start, end);

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
