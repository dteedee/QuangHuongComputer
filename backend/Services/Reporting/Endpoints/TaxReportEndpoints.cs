using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Accounting.Infrastructure;
using Accounting.Domain;
using Sales.Infrastructure;
using Sales.Domain;
using InventoryModule.Infrastructure;
using HR.Application.Tax;
using BuildingBlocks.TaxEngine;

namespace Reporting.Endpoints;

public static class TaxReportEndpoints
{
    public static void MapTaxReportEndpoints(this RouteGroupBuilder group)
    {
        // B01-DNN: Balance Sheet (Báo cáo tình hình tài chính)
        group.MapGet("/balance-sheet", async (
            AccountingDbContext accDb,
            InventoryDbContext invDb,
            int year,
            int? quarter) =>
        {
            var (start, end) = GetPeriodRange(year, quarter, null);

            var arOutstanding = await accDb.Invoices
                .Where(i => i.Type == InvoiceType.Receivable
                    && i.Status != InvoiceStatus.Paid
                    && i.Status != InvoiceStatus.Cancelled
                    && i.IssueDate < end)
                .SumAsync(i => (decimal?)i.OutstandingAmount) ?? 0;

            var cash = await accDb.Invoices
                .Where(i => i.Type == InvoiceType.Receivable
                    && i.Status == InvoiceStatus.Paid
                    && i.IssueDate >= start && i.IssueDate < end)
                .SumAsync(i => (decimal?)i.PaidAmount) ?? 0;

            var inventoryValue = await invDb.InventoryItems
                .SumAsync(i => (decimal?)i.QuantityOnHand * i.AverageCost) ?? 0;

            var apOutstanding = await accDb.Invoices
                .Where(i => i.Type == InvoiceType.Payable
                    && i.Status != InvoiceStatus.Paid
                    && i.Status != InvoiceStatus.Cancelled
                    && i.IssueDate < end)
                .SumAsync(i => (decimal?)i.OutstandingAmount) ?? 0;

            var pendingExpenses = await accDb.Expenses
                .Where(e => e.Status == ExpenseStatus.Approved && e.ExpenseDate < end)
                .SumAsync(e => (decimal?)e.TotalAmount) ?? 0;

            var shortTermAssets = cash + arOutstanding + inventoryValue;
            var totalAssets = shortTermAssets;
            var totalLiabilities = apOutstanding + pendingExpenses;
            var equity = totalAssets - totalLiabilities;

            return Results.Ok(new
            {
                Period = new { Year = year, Quarter = quarter },
                Assets = new
                {
                    ShortTerm = new
                    {
                        Cash = cash,
                        AccountsReceivable = arOutstanding,
                        Inventory = inventoryValue,
                        Total = shortTermAssets
                    },
                    LongTerm = new { Total = 0m },
                    Total = totalAssets
                },
                Liabilities = new
                {
                    AccountsPayable = apOutstanding,
                    PendingExpenses = pendingExpenses,
                    Total = totalLiabilities
                },
                Equity = new
                {
                    RetainedEarnings = equity,
                    Total = equity
                },
                TotalLiabilitiesAndEquity = totalLiabilities + equity
            });
        });

        // B02-DNN: Income Statement (Báo cáo kết quả HĐKD)
        group.MapGet("/income-statement", async (
            SalesDbContext salesDb,
            AccountingDbContext accDb,
            int year,
            int? quarter,
            int? month) =>
        {
            var (start, end) = GetPeriodRange(year, quarter, month);

            var revenueData = await salesDb.Orders
                .Where(o => o.Status != OrderStatus.Cancelled
                    && o.OrderDate >= start && o.OrderDate < end)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    Revenue = g.Sum(o => o.TotalAmount),
                    TaxAmount = g.Sum(o => o.TaxAmount),
                    Discount = g.Sum(o => o.DiscountAmount),
                    SubTotal = g.Sum(o => o.SubtotalAmount)
                })
                .FirstOrDefaultAsync();

            var totalRevenue = revenueData?.Revenue ?? 0;
            var cogs = Math.Round(totalRevenue * 0.70m, 0);
            var grossProfit = totalRevenue - cogs;

            var operatingExpenses = await accDb.Expenses
                .Where(e => (e.Status == ExpenseStatus.Paid || e.Status == ExpenseStatus.Approved)
                    && e.ExpenseDate >= start && e.ExpenseDate < end)
                .SumAsync(e => (decimal?)e.TotalAmount) ?? 0;

            var profitBeforeTax = grossProfit - operatingExpenses;
            var incomeTax = profitBeforeTax > 0 ? Math.Round(profitBeforeTax * 0.20m, 0) : 0;
            var netProfit = profitBeforeTax - incomeTax;

            return Results.Ok(new
            {
                Period = new { Year = year, Quarter = quarter, Month = month, Start = start, End = end },
                Revenue = new
                {
                    GoodsAndServices = totalRevenue,
                    VatAmount = revenueData?.TaxAmount ?? 0,
                    Discounts = revenueData?.Discount ?? 0,
                    NetRevenue = totalRevenue
                },
                COGS = cogs,
                GrossProfit = grossProfit,
                OperatingExpenses = operatingExpenses,
                ProfitBeforeTax = profitBeforeTax,
                IncomeTax = incomeTax,
                NetProfit = netProfit,
                ProfitMargin = totalRevenue > 0 ? Math.Round(netProfit / totalRevenue * 100, 2) : 0
            });
        });

        // B09-DNN: Financial Notes (Thuyết minh BCTC)
        group.MapGet("/financial-notes", async (
            AccountingDbContext accDb,
            InventoryDbContext invDb,
            int year) =>
        {
            var (start, end) = GetPeriodRange(year, null, null);

            var arTotal = await accDb.Invoices
                .Where(i => i.Type == InvoiceType.Receivable && i.IssueDate >= start && i.IssueDate < end)
                .SumAsync(i => (decimal?)i.TotalAmount) ?? 0;

            var arOutstanding = await accDb.Invoices
                .Where(i => i.Type == InvoiceType.Receivable
                    && i.Status != InvoiceStatus.Paid
                    && i.Status != InvoiceStatus.Cancelled
                    && i.IssueDate < end)
                .SumAsync(i => (decimal?)i.OutstandingAmount) ?? 0;

            var invValue = await invDb.InventoryItems
                .SumAsync(i => (decimal?)i.QuantityOnHand * i.AverageCost) ?? 0;
            var invCount = await invDb.InventoryItems.CountAsync();

            var expenseByCategory = await accDb.Expenses
                .Where(e => e.Status == ExpenseStatus.Paid && e.ExpenseDate >= start && e.ExpenseDate < end)
                .Include(e => e.Category)
                .GroupBy(e => new { e.CategoryId, CategoryName = e.Category!.Name })
                .Select(g => new { g.Key.CategoryName, Total = g.Sum(e => e.TotalAmount), Count = g.Count() })
                .OrderByDescending(x => x.Total)
                .ToListAsync();

            return Results.Ok(new
            {
                ReportType = "B09-DNN",
                Company = new
                {
                    Name = "CÔNG TY TNHH QUANG HƯƠNG COMPUTER",
                    TaxCode = "0xxxxxxxxx",
                    Address = "TP. Hồ Chí Minh, Việt Nam",
                    FiscalYear = year,
                    Currency = "VND",
                    AccountingStandard = "Thông tư 133/2016/TT-BTC"
                },
                AccountingPolicies = new
                {
                    RevenueRecognition = "Ghi nhận khi hàng hóa được giao và rủi ro chuyển giao",
                    InventoryValuation = "Bình quân gia quyền (Weighted Average)",
                    FixedAssetDepreciation = "Đường thẳng (Straight-line)",
                    ForeignCurrency = "Ghi nhận theo tỷ giá tại ngày giao dịch"
                },
                Notes = new
                {
                    AccountsReceivable = new
                    {
                        TotalInvoiced = arTotal,
                        Outstanding = arOutstanding,
                        CollectionRate = arTotal > 0 ? Math.Round((arTotal - arOutstanding) / arTotal * 100, 1) : 0
                    },
                    Inventory = new
                    {
                        TotalValue = invValue,
                        ItemCount = invCount,
                        ValuationMethod = "Bình quân gia quyền"
                    },
                    OperatingExpenses = expenseByCategory
                }
            });
        });

        // Mẫu 01/GTGT: VAT Declaration
        group.MapGet("/vat-declaration", async (
            SalesDbContext salesDb,
            AccountingDbContext accDb,
            int month,
            int year) =>
        {
            var start = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
            var end = start.AddMonths(1);

            var outputVat = await salesDb.Orders
                .Where(o => o.Status != OrderStatus.Cancelled
                    && o.OrderDate >= start && o.OrderDate < end)
                .SumAsync(o => (decimal?)o.TaxAmount) ?? 0;

            var outputTaxable = await salesDb.Orders
                .Where(o => o.Status != OrderStatus.Cancelled
                    && o.OrderDate >= start && o.OrderDate < end)
                .SumAsync(o => (decimal?)o.SubtotalAmount) ?? 0;

            var paidExpensesTotal = await accDb.Expenses
                .Where(e => e.Status == ExpenseStatus.Paid && e.ExpenseDate >= start && e.ExpenseDate < end)
                .SumAsync(e => (decimal?)e.TotalAmount) ?? 0;

            // Input VAT estimate: 10% of paid expenses (heuristic)
            var inputTaxable = paidExpensesTotal;
            var inputVat = Math.Round(paidExpensesTotal * 0.10m, 0);

            var vatPayable = outputVat - inputVat;
            var carryForward = vatPayable < 0 ? Math.Abs(vatPayable) : 0;
            var actualPayable = vatPayable > 0 ? vatPayable : 0;

            return Results.Ok(new
            {
                ReportType = "01/GTGT",
                Period = new { Month = month, Year = year },
                OutputVAT = new
                {
                    TaxableAmount = outputTaxable,
                    VatAmount = outputVat,
                    // Indicator numbers per Mẫu 01/GTGT
                    Indicator26 = outputTaxable,
                    Indicator28 = outputVat
                },
                InputVAT = new
                {
                    TaxableAmount = inputTaxable,
                    VatAmount = inputVat,
                    Indicator23 = inputTaxable,
                    Indicator25 = inputVat
                },
                VatPayable = actualPayable,
                CarryForward = carryForward,
                Indicator40 = actualPayable,
                DefaultVatRate = "10%"
            });
        });

        // Mẫu 05/KK-TNCN: PIT Settlement
        //
        // W2-25 / D06 §4 — TỜ KHAI PHÁP LÝ, nên KHÔNG còn một dòng số thuế nào ở file này.
        // Trước đây endpoint tự giữ `const personalDeduction = 11_000_000m`, một biểu 7 bậc riêng
        // và BỎ HẲN giảm trừ người phụ thuộc -> quyết toán 2026 ra số sai trên tờ khai gửi cơ quan
        // thuế. Giờ gọi thẳng PitFinalizationService của HR, tức cùng IStatutoryParameterProvider
        // và cùng PitCalculator với phiếu lương hằng tháng: hai con số không thể lệch nhau nữa.
        // Tham số resolve tại 31/12 của năm quyết toán.
        group.MapGet("/pit-settlement", async (
            PitFinalizationService pitService,
            int year) =>
        {
            var items = await pitService.GetSummaryAsync(year);
            var parameters = await pitService.GetYearParametersAsync(year);

            var employees = items
                .OrderBy(e => e.EmployeeName)
                .Select(e => new
                {
                    e.EmployeeId,
                    FullName = e.EmployeeName,
                    TaxCode = e.TaxCode ?? "N/A",
                    MonthsWorked = e.MonthsCounted,
                    TotalTaxableIncome = e.AnnualGrossIncome,
                    InsuranceDeduction = e.AnnualInsurance,
                    PersonalDeduction = e.AnnualPersonalDeduction,
                    DependentDeduction = e.AnnualDependentDeduction,
                    e.DependentMonthCount,
                    AssessableIncome = e.AnnualTaxableIncome,
                    PitTax = e.RecalculatedAnnualPit,
                    PitWithheld = e.MonthlyPitWithheldTotal,
                    e.PitOverpayment,
                    e.PitShortfall
                })
                .ToList();

            return Results.Ok(new
            {
                ReportType = "05/KK-TNCN",
                Year = year,
                ParametersAsOf = parameters.AsOf,
                Summary = new
                {
                    TotalEmployees = employees.Count,
                    TotalTaxableIncome = employees.Sum(e => e.TotalTaxableIncome),
                    TotalInsurance = employees.Sum(e => e.InsuranceDeduction),
                    TotalPitTax = employees.Sum(e => e.PitTax),
                    TotalPitWithheld = employees.Sum(e => e.PitWithheld),
                    PersonalDeductionPerMonth = parameters.PitPersonalDeduction,
                    PersonalDeductionPerYear = parameters.PitPersonalDeduction * 12m,
                    DependentDeductionPerMonth = parameters.PitDependentDeduction
                },
                Employees = employees,
                // Biểu thuế lấy từ chính bộ tham số đã dùng, mốc THÁNG × 12 = mốc NĂM.
                PitBrackets = parameters.PitBrackets.Select(b => new
                {
                    UpToMonthly = b.UpTo,
                    UpToAnnual = b.UpTo * 12m,
                    Rate = b.Rate,
                    RateLabel = $"{b.Rate:P0}"
                }),
                LegalBasis = parameters.LegalBasisOf(StatutoryParameterCodes.PitBrackets)
            });
        });
    }

    private static (DateTime start, DateTime end) GetPeriodRange(int year, int? quarter, int? month)
    {
        if (month.HasValue)
        {
            var s = new DateTime(year, month.Value, 1, 0, 0, 0, DateTimeKind.Utc);
            return (s, s.AddMonths(1));
        }
        if (quarter.HasValue)
        {
            var startMonth = (quarter.Value - 1) * 3 + 1;
            var s = new DateTime(year, startMonth, 1, 0, 0, 0, DateTimeKind.Utc);
            return (s, s.AddMonths(3));
        }
        var yearStart = new DateTime(year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        return (yearStart, yearStart.AddYears(1));
    }

}
