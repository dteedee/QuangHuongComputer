using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Infrastructure;
using Sales.Domain;
using Accounting.Infrastructure;
using Accounting.Domain;
using InventoryModule.Infrastructure;
using Catalog.Infrastructure;

namespace Reporting.Endpoints;

public static class FinancialReportEndpoints
{
    public static void MapFinancialReportEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/cash-flow", async (
            AccountingDbContext accDb, SalesDbContext salesDb,
            string? startDate = null, string? endDate = null) =>
        {
            var start = !string.IsNullOrEmpty(startDate) ? DateTime.TryParse(startDate, out var _sd) ? _sd : DateTime.UtcNow.AddMonths(-3) : DateTime.UtcNow.AddMonths(-6);
            var end = !string.IsNullOrEmpty(endDate) ? DateTime.TryParse(endDate, out var _ed) ? _ed : DateTime.UtcNow.AddDays(1) : DateTime.UtcNow.AddDays(1);

            var arPaid = await accDb.Invoices
                .Where(i => i.Type == InvoiceType.Receivable && i.IssueDate >= start && i.IssueDate < end)
                .SumAsync(i => (decimal?)i.PaidAmount) ?? 0;
            var apPaid = await accDb.Invoices
                .Where(i => i.Type == InvoiceType.Payable && i.IssueDate >= start && i.IssueDate < end)
                .SumAsync(i => (decimal?)i.PaidAmount) ?? 0;
            var expensesPaid = await accDb.Expenses
                .Where(e => e.Status == ExpenseStatus.Paid && e.ExpenseDate >= start && e.ExpenseDate < end)
                .SumAsync(e => (decimal?)e.TotalAmount) ?? 0;

            var monthlyInflows = await accDb.Invoices
                .Where(i => i.Type == InvoiceType.Receivable && i.IssueDate >= start && i.IssueDate < end)
                .GroupBy(i => new { i.IssueDate.Year, i.IssueDate.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Amount = g.Sum(i => i.PaidAmount) })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToListAsync();
            var monthlyOutflows = await accDb.Invoices
                .Where(i => i.Type == InvoiceType.Payable && i.IssueDate >= start && i.IssueDate < end)
                .GroupBy(i => new { i.IssueDate.Year, i.IssueDate.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Amount = g.Sum(i => i.PaidAmount) })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToListAsync();

            return Results.Ok(new
            {
                Period = new { Start = start, End = end },
                TotalInflows = arPaid, TotalOutflows = apPaid + expensesPaid,
                NetCashFlow = arPaid - apPaid - expensesPaid,
                Breakdown = new { ARCollected = arPaid, APPaid = apPaid, ExpensesPaid = expensesPaid },
                MonthlyInflows = monthlyInflows.Select(m => new { Month = $"{m.Month:00}/{m.Year}", m.Amount }),
                MonthlyOutflows = monthlyOutflows.Select(m => new { Month = $"{m.Month:00}/{m.Year}", m.Amount })
            });
        });

        group.MapGet("/revenue-expense", async (
            SalesDbContext salesDb, AccountingDbContext accDb,
            string? startDate = null, string? endDate = null) =>
        {
            var start = !string.IsNullOrEmpty(startDate) ? DateTime.TryParse(startDate, out var _sd) ? _sd : DateTime.UtcNow.AddMonths(-3) : DateTime.UtcNow.AddMonths(-12);
            var end = !string.IsNullOrEmpty(endDate) ? DateTime.TryParse(endDate, out var _ed) ? _ed : DateTime.UtcNow.AddDays(1) : DateTime.UtcNow.AddDays(1);

            var monthlyRevenue = await salesDb.Orders
                .Where(o => o.OrderDate >= start && o.OrderDate < end && o.Status != OrderStatus.Cancelled)
                .GroupBy(o => new { o.OrderDate.Year, o.OrderDate.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Revenue = g.Sum(o => o.TotalAmount), OrderCount = g.Count() })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToListAsync();
            var monthlyExpenses = await accDb.Expenses
                .Where(e => e.Status == ExpenseStatus.Paid && e.ExpenseDate >= start && e.ExpenseDate < end)
                .GroupBy(e => new { e.ExpenseDate.Year, e.ExpenseDate.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Expense = g.Sum(e => e.TotalAmount), Count = g.Count() })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToListAsync();
            var expenseByCategory = await accDb.Expenses
                .Where(e => e.Status == ExpenseStatus.Paid && e.ExpenseDate >= start && e.ExpenseDate < end)
                .Include(e => e.Category)
                .GroupBy(e => new { e.CategoryId, CategoryName = e.Category!.Name })
                .Select(g => new { g.Key.CategoryName, Total = g.Sum(e => e.TotalAmount), Count = g.Count() })
                .OrderByDescending(x => x.Total)
                .ToListAsync();

            var totalRevenue = monthlyRevenue.Sum(m => m.Revenue);
            var totalExpenses = monthlyExpenses.Sum(m => m.Expense);

            return Results.Ok(new
            {
                Period = new { Start = start, End = end },
                Summary = new
                {
                    TotalRevenue = totalRevenue, TotalExpenses = totalExpenses,
                    GrossProfit = totalRevenue - totalExpenses,
                    ProfitMargin = totalRevenue > 0 ? (totalRevenue - totalExpenses) / totalRevenue * 100 : 0
                },
                MonthlyData = monthlyRevenue.Select(r => new
                {
                    Month = $"{r.Month:00}/{r.Year}", r.Revenue,
                    Expense = monthlyExpenses.FirstOrDefault(e => e.Year == r.Year && e.Month == r.Month)?.Expense ?? 0,
                    Profit = r.Revenue - (monthlyExpenses.FirstOrDefault(e => e.Year == r.Year && e.Month == r.Month)?.Expense ?? 0)
                }),
                ExpenseByCategory = expenseByCategory
            });
        });

        group.MapGet("/balance-overview", async (
            AccountingDbContext accDb, InventoryDbContext invDb, CatalogDbContext catalogDb) =>
        {
            var arOutstanding = await accDb.Invoices
                .Where(i => i.Type == InvoiceType.Receivable && i.Status != InvoiceStatus.Paid && i.Status != InvoiceStatus.Cancelled)
                .SumAsync(i => (decimal?)i.OutstandingAmount) ?? 0;
            var inventoryValue = await invDb.InventoryItems
                .SumAsync(i => (decimal?)i.QuantityOnHand * i.AverageCost) ?? 0;
            var apOutstanding = await accDb.Invoices
                .Where(i => i.Type == InvoiceType.Payable && i.Status != InvoiceStatus.Paid && i.Status != InvoiceStatus.Cancelled)
                .SumAsync(i => (decimal?)i.OutstandingAmount) ?? 0;
            var pendingExpenses = await accDb.Expenses
                .Where(e => e.Status == ExpenseStatus.Approved)
                .SumAsync(e => (decimal?)e.TotalAmount) ?? 0;

            var arAging = await accDb.Invoices
                .Where(i => i.Type == InvoiceType.Receivable && i.Status != InvoiceStatus.Paid && i.Status != InvoiceStatus.Cancelled)
                .GroupBy(i => i.AgingBucket)
                .Select(g => new { Bucket = g.Key.ToString(), Amount = g.Sum(i => i.OutstandingAmount), Count = g.Count() })
                .ToListAsync();
            var apAging = await accDb.Invoices
                .Where(i => i.Type == InvoiceType.Payable && i.Status != InvoiceStatus.Paid && i.Status != InvoiceStatus.Cancelled)
                .GroupBy(i => i.AgingBucket)
                .Select(g => new { Bucket = g.Key.ToString(), Amount = g.Sum(i => i.OutstandingAmount), Count = g.Count() })
                .ToListAsync();

            return Results.Ok(new
            {
                Assets = new { AccountsReceivable = arOutstanding, InventoryValue = inventoryValue, TotalAssets = arOutstanding + inventoryValue },
                Liabilities = new { AccountsPayable = apOutstanding, PendingExpenses = pendingExpenses, TotalLiabilities = apOutstanding + pendingExpenses },
                NetPosition = (arOutstanding + inventoryValue) - (apOutstanding + pendingExpenses),
                ARAgingBreakdown = arAging, APAgingBreakdown = apAging
            });
        });
    }
}
