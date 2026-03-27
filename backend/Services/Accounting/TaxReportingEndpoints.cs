using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Mvc;

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

        // 2. Tờ khai thuế GTGT (VAT Declaration Form 01/GTGT)
        group.MapGet("/vat-declaration", (int quarter, int year) =>
        {
            return Results.Ok(new 
            {
                quarter, year,
                formTemplate = "01/GTGT",
                indicator26 = 500000000, // Hàng hóa dịch vụ bán ra chịu thuế
                indicator28 = 40000000, // Thuế GTGT đầu ra
                indicator23 = 300000000, // Hàng hóa dịch vụ mua vào
                indicator25 = 24000000, // Thuế GTGT đầu vào được khấu trừ
                indicator40 = 16000000  // Thuế GTGT phải nộp
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
}
