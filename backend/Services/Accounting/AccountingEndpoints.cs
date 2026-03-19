using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Accounting.Infrastructure;
using Accounting.Domain;
using Accounting.DTOs;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

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

        // Summary Stats - Optimized with parallel queries
        group.MapGet("/stats", async (AccountingDbContext db) =>
        {
            var today = DateTime.UtcNow.Date;

            // Run all queries in parallel for better performance
            var receivablesTask = db.Invoices
                .Where(i => i.Status != InvoiceStatus.Paid && i.Status != InvoiceStatus.Cancelled)
                .SumAsync(i => i.TotalAmount - i.PaidAmount);
            var revenueTodayTask = db.Invoices
                .Where(i => i.IssueDate >= today && i.Status != InvoiceStatus.Cancelled)
                .SumAsync(i => i.TotalAmount);
            var totalInvoicesTask = db.Invoices.CountAsync();
            var activeAccountsTask = db.Accounts.CountAsync();

            await Task.WhenAll(receivablesTask, revenueTodayTask, totalInvoicesTask, activeAccountsTask);

            var stats = new
            {
                TotalReceivables = await receivablesTask,
                RevenueToday = await revenueTodayTask,
                TotalInvoices = await totalInvoicesTask,
                ActiveAccounts = await activeAccountsTask
            };
            return Results.Ok(stats);
        });

        // ===== AR (Accounts Receivable) Endpoints =====
        group.MapGet("/ar", async (AccountingDbContext db, int page = 1, int pageSize = 20, AgingBucket? aging = null) =>
        {
            var query = db.Invoices
                .Where(i => i.Type == InvoiceType.Receivable);

            if (aging.HasValue)
            {
                query = query.Where(i => i.AgingBucket == aging.Value);
            }

            var total = await query.CountAsync();
            var invoices = await query
                .OrderByDescending(i => i.IssueDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(i => new ARInvoiceListDto(
                    i.Id,
                    i.InvoiceNumber,
                    i.CustomerId,
                    i.OrganizationAccountId,
                    i.IssueDate,
                    i.DueDate,
                    i.TotalAmount,
                    i.PaidAmount,
                    i.OutstandingAmount,
                    i.Status,
                    i.AgingBucket,
                    i.Currency))
                .ToListAsync();

            return Results.Ok(new { Total = total, Page = page, PageSize = pageSize, Invoices = invoices });
        }).WithName("GetARInvoices");

        group.MapGet("/ar/{id:guid}", async (Guid id, AccountingDbContext db) =>
        {
            var invoice = await db.Invoices
                .Where(i => i.Id == id && i.Type == InvoiceType.Receivable)
                .FirstOrDefaultAsync();

            if (invoice == null)
                return Results.NotFound();

            var dto = new ARInvoiceDetailDto(
                invoice.Id,
                invoice.InvoiceNumber,
                invoice.CustomerId,
                invoice.OrganizationAccountId,
                invoice.IssueDate,
                invoice.DueDate,
                invoice.SubTotal,
                invoice.VatRate,
                invoice.VatAmount,
                invoice.TotalAmount,
                invoice.PaidAmount,
                invoice.OutstandingAmount,
                invoice.Status,
                invoice.AgingBucket,
                invoice.Currency,
                invoice.Notes,
                invoice.Lines.Select(l => new InvoiceLineDto(
                    l.Id, l.Description, l.Quantity, l.UnitPrice, l.VatRate, l.LineTotal, l.VatAmount)).ToList(),
                invoice.PaymentApplications.Select(pa => new PaymentApplicationDto(
                    pa.Id, pa.PaymentIntentId, pa.InvoiceId, pa.Amount, pa.AppliedAt, pa.Notes)).ToList());

            return Results.Ok(dto);
        }).WithName("GetARInvoiceDetail");

        group.MapPost("/ar/{id:guid}/apply-payment", async (Guid id, ApplyPaymentRequest request, AccountingDbContext db) =>
        {
            var invoice = await db.Invoices.FindAsync(id);
            if (invoice == null)
                return Results.NotFound();

            if (invoice.Type != InvoiceType.Receivable)
                return Results.BadRequest("Only receivable invoices can have payments applied");

            try
            {
                invoice.ApplyPayment(request.PaymentIntentId, request.Amount, request.Notes);
                await db.SaveChangesAsync();
                return Results.Ok(new { Message = "Payment applied successfully", OutstandingAmount = invoice.OutstandingAmount });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
        }).WithName("ApplyARPayment");

        group.MapGet("/ar/aging-summary", async (AccountingDbContext db) =>
        {
            // Optimized: Calculate directly in database instead of loading all records
            var baseQuery = db.Invoices
                .Where(i => i.Type == InvoiceType.Receivable &&
                           i.Status != InvoiceStatus.Paid &&
                           i.Status != InvoiceStatus.Cancelled);

            var summary = new ARAgingSummaryDto(
                Current: await baseQuery.Where(i => i.AgingBucket == AgingBucket.Current).SumAsync(i => i.OutstandingAmount),
                Days1To30: await baseQuery.Where(i => i.AgingBucket == AgingBucket.Days1To30).SumAsync(i => i.OutstandingAmount),
                Days31To60: await baseQuery.Where(i => i.AgingBucket == AgingBucket.Days31To60).SumAsync(i => i.OutstandingAmount),
                Days61To90: await baseQuery.Where(i => i.AgingBucket == AgingBucket.Days61To90).SumAsync(i => i.OutstandingAmount),
                Over90Days: await baseQuery.Where(i => i.AgingBucket == AgingBucket.Over90Days).SumAsync(i => i.OutstandingAmount),
                TotalOutstanding: await baseQuery.SumAsync(i => i.OutstandingAmount));

            return Results.Ok(summary);
        }).WithName("GetARAgingSummary");

        // ===== AP (Accounts Payable) Endpoints =====
        group.MapGet("/ap", async (AccountingDbContext db, int page = 1, int pageSize = 20, AgingBucket? aging = null) =>
        {
            var query = db.Invoices
                .Where(i => i.Type == InvoiceType.Payable);

            if (aging.HasValue)
            {
                query = query.Where(i => i.AgingBucket == aging.Value);
            }

            var total = await query.CountAsync();
            var invoices = await query
                .OrderByDescending(i => i.IssueDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(i => new APInvoiceListDto(
                    i.Id,
                    i.InvoiceNumber,
                    i.SupplierId!.Value,
                    i.IssueDate,
                    i.DueDate,
                    i.TotalAmount,
                    i.PaidAmount,
                    i.OutstandingAmount,
                    i.Status,
                    i.AgingBucket,
                    i.Currency,
                    null, // PurchaseOrderId - would need to be added to domain
                    null)) // GoodsReceiptId - would need to be added to domain
                .ToListAsync();

            return Results.Ok(new { Total = total, Page = page, PageSize = pageSize, Invoices = invoices });
        }).WithName("GetAPInvoices");

        group.MapGet("/ap/{id:guid}", async (Guid id, AccountingDbContext db) =>
        {
            var invoice = await db.Invoices
                .Where(i => i.Id == id && i.Type == InvoiceType.Payable)
                .FirstOrDefaultAsync();

            if (invoice == null)
                return Results.NotFound();

            var dto = new APInvoiceDetailDto(
                invoice.Id,
                invoice.InvoiceNumber,
                invoice.SupplierId!.Value,
                invoice.IssueDate,
                invoice.DueDate,
                invoice.SubTotal,
                invoice.VatRate,
                invoice.VatAmount,
                invoice.TotalAmount,
                invoice.PaidAmount,
                invoice.OutstandingAmount,
                invoice.Status,
                invoice.AgingBucket,
                invoice.Currency,
                invoice.Notes,
                null, // PurchaseOrderId
                null, // GoodsReceiptId
                invoice.Lines.Select(l => new InvoiceLineDto(
                    l.Id, l.Description, l.Quantity, l.UnitPrice, l.VatRate, l.LineTotal, l.VatAmount)).ToList(),
                invoice.PaymentApplications.Select(pa => new PaymentApplicationDto(
                    pa.Id, pa.PaymentIntentId, pa.InvoiceId, pa.Amount, pa.AppliedAt, pa.Notes)).ToList());

            return Results.Ok(dto);
        }).WithName("GetAPInvoiceDetail");

        group.MapPost("/ap", async (CreateAPInvoiceRequest request, AccountingDbContext db) =>
        {
            var invoice = Invoice.CreatePayable(
                request.SupplierId,
                request.DueDate,
                request.VatRate,
                request.Currency,
                request.Notes);

            foreach (var line in request.Lines)
            {
                invoice.AddLine(line.Description, line.Quantity, line.UnitPrice, line.VatRate);
            }

            invoice.Issue();

            db.Invoices.Add(invoice);
            await db.SaveChangesAsync();

            return Results.Created($"/api/accounting/ap/{invoice.Id}", new { Id = invoice.Id, InvoiceNumber = invoice.InvoiceNumber });
        }).WithName("CreateAPInvoice");

        group.MapGet("/ap/aging-summary", async (AccountingDbContext db) =>
        {
            // Optimized: Calculate directly in database instead of loading all records
            var baseQuery = db.Invoices
                .Where(i => i.Type == InvoiceType.Payable &&
                           i.Status != InvoiceStatus.Paid &&
                           i.Status != InvoiceStatus.Cancelled);

            var summary = new APAgingSummaryDto(
                Current: await baseQuery.Where(i => i.AgingBucket == AgingBucket.Current).SumAsync(i => i.OutstandingAmount),
                Days1To30: await baseQuery.Where(i => i.AgingBucket == AgingBucket.Days1To30).SumAsync(i => i.OutstandingAmount),
                Days31To60: await baseQuery.Where(i => i.AgingBucket == AgingBucket.Days31To60).SumAsync(i => i.OutstandingAmount),
                Days61To90: await baseQuery.Where(i => i.AgingBucket == AgingBucket.Days61To90).SumAsync(i => i.OutstandingAmount),
                Over90Days: await baseQuery.Where(i => i.AgingBucket == AgingBucket.Over90Days).SumAsync(i => i.OutstandingAmount),
                TotalPayable: await baseQuery.SumAsync(i => i.OutstandingAmount));

            return Results.Ok(summary);
        }).WithName("GetAPAgingSummary");

        group.MapPost("/ap/{id:guid}/apply-payment", async (Guid id, ApplyAPPaymentRequest request, AccountingDbContext db) =>
        {
            var invoice = await db.Invoices.FindAsync(id);
            if (invoice == null)
                return Results.NotFound();

            if (invoice.Type != InvoiceType.Payable)
                return Results.BadRequest(new { Error = "Only payable invoices can have AP payments applied" });

            try
            {
                var method = Enum.TryParse<PaymentMethod>(request.PaymentMethod, out var pm) ? pm : PaymentMethod.BankTransfer;
                invoice.RecordPayment(request.Amount, request.Reference ?? $"AP-PAY-{DateTime.UtcNow:yyyyMMddHHmmss}", method);
                await db.SaveChangesAsync();

                return Results.Ok(new
                {
                    Message = "Payment applied successfully",
                    OutstandingAmount = invoice.OutstandingAmount,
                    Status = invoice.Status.ToString()
                });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
        }).WithName("ApplyAPPayment");

        // ===== Shift Management Endpoints =====
        group.MapPost("/shifts/open", async (OpenShiftRequest request, AccountingDbContext db) =>
        {
            // Validate that no other open shift exists for this cashier/warehouse/day
            var today = DateTime.UtcNow.Date;
            var existingOpenShift = await db.ShiftSessions
                .Where(s => s.CashierId == request.CashierId &&
                           s.WarehouseId == request.WarehouseId &&
                           s.OpenedAt >= today &&
                           s.Status == ShiftStatus.Open)
                .FirstOrDefaultAsync();

            if (existingOpenShift != null)
            {
                return Results.BadRequest(new
                {
                    Error = "An open shift already exists for this cashier/warehouse today",
                    ExistingShiftId = existingOpenShift.Id
                });
            }

            try
            {
                var shift = ShiftSession.Open(request.CashierId, request.WarehouseId, request.OpeningBalance);
                db.ShiftSessions.Add(shift);
                await db.SaveChangesAsync();

                return Results.Created($"/api/accounting/shifts/{shift.Id}", new
                {
                    Id = shift.Id,
                    CashierId = shift.CashierId,
                    WarehouseId = shift.WarehouseId,
                    OpenedAt = shift.OpenedAt,
                    OpeningBalance = shift.OpeningBalance,
                    Status = shift.Status
                });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
        }).WithName("OpenShift");

        group.MapPost("/shifts/{id:guid}/close", async (Guid id, CloseShiftRequest request, AccountingDbContext db) =>
        {
            var shift = await db.ShiftSessions.FindAsync(id);
            if (shift == null)
                return Results.NotFound();

            try
            {
                shift.Close(request.ActualCash);
                await db.SaveChangesAsync();

                return Results.Ok(new
                {
                    Id = shift.Id,
                    ClosedAt = shift.ClosedAt,
                    OpeningBalance = shift.OpeningBalance,
                    ClosingBalance = shift.ClosingBalance,
                    CashVariance = shift.CashVariance,
                    Duration = shift.Duration,
                    Status = shift.Status
                });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
        }).WithName("CloseShift");

        group.MapGet("/shifts", async (AccountingDbContext db, int page = 1, int pageSize = 20, ShiftStatus? status = null, Guid? cashierId = null) =>
        {
            var query = db.ShiftSessions.AsQueryable();

            if (status.HasValue)
            {
                query = query.Where(s => s.Status == status.Value);
            }

            if (cashierId.HasValue)
            {
                query = query.Where(s => s.CashierId == cashierId.Value);
            }

            var total = await query.CountAsync();
            var shifts = await query
                .OrderByDescending(s => s.OpenedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new ShiftSessionListDto(
                    s.Id,
                    s.CashierId,
                    s.WarehouseId,
                    s.OpenedAt,
                    s.ClosedAt,
                    s.OpeningBalance,
                    s.ClosingBalance,
                    s.Status,
                    s.CashVariance,
                    s.Duration))
                .ToListAsync();

            return Results.Ok(new { Total = total, Page = page, PageSize = pageSize, Shifts = shifts });
        }).WithName("GetShifts");

        group.MapGet("/shifts/{id:guid}", async (Guid id, AccountingDbContext db) =>
        {
            var shift = await db.ShiftSessions
                .Where(s => s.Id == id)
                .FirstOrDefaultAsync();

            if (shift == null)
                return Results.NotFound();

            var dto = new ShiftSessionDto(
                shift.Id,
                shift.CashierId,
                shift.WarehouseId,
                shift.OpenedAt,
                shift.ClosedAt,
                shift.OpeningBalance,
                shift.ClosingBalance,
                shift.Status,
                shift.CashVariance,
                shift.Duration,
                shift.Transactions.Select(t => new ShiftTransactionDto(
                    t.Id, t.Description, t.Amount, t.Type, t.Timestamp, t.Reference)).ToList());

            return Results.Ok(dto);
        }).WithName("GetShiftDetail");

        group.MapPost("/shifts/{id:guid}/transactions", async (Guid id, RecordShiftTransactionRequest request, AccountingDbContext db) =>
        {
            var shift = await db.ShiftSessions.FindAsync(id);
            if (shift == null)
                return Results.NotFound();

            try
            {
                shift.RecordTransaction(request.Description, request.Amount, request.Type, request.Reference);
                await db.SaveChangesAsync();

                return Results.Ok(new { Message = "Transaction recorded successfully" });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
        }).WithName("RecordShiftTransaction");

        // ===== Expense Category Endpoints =====
        group.MapGet("/expense-categories", async (AccountingDbContext db) =>
        {
            var categories = await db.ExpenseCategories
                .OrderBy(c => c.Name)
                .Select(c => new ExpenseCategoryDto(c.Id, c.Name, c.Code, c.Description, c.IsActive))
                .ToListAsync();
            return Results.Ok(categories);
        }).WithName("GetExpenseCategories");

        group.MapPost("/expense-categories", async (CreateExpenseCategoryRequest request, AccountingDbContext db) =>
        {
            var existing = await db.ExpenseCategories.AnyAsync(c => c.Code == request.Code.ToUpperInvariant());
            if (existing)
                return Results.BadRequest(new { Error = "Category code already exists" });

            var category = ExpenseCategory.Create(request.Name, request.Code, request.Description);
            db.ExpenseCategories.Add(category);
            await db.SaveChangesAsync();

            return Results.Created($"/api/accounting/expense-categories/{category.Id}",
                new ExpenseCategoryDto(category.Id, category.Name, category.Code, category.Description, category.IsActive));
        }).WithName("CreateExpenseCategory");

        group.MapPut("/expense-categories/{id:guid}", async (Guid id, UpdateExpenseCategoryRequest request, AccountingDbContext db) =>
        {
            var category = await db.ExpenseCategories.FindAsync(id);
            if (category == null)
                return Results.NotFound();

            category.Update(request.Name, request.Description);
            await db.SaveChangesAsync();

            return Results.Ok(new ExpenseCategoryDto(category.Id, category.Name, category.Code, category.Description, category.IsActive));
        }).WithName("UpdateExpenseCategory");

        // ===== Expense Endpoints =====
        group.MapGet("/expenses", async (AccountingDbContext db, int page = 1, int pageSize = 20,
            ExpenseStatus? status = null, Guid? categoryId = null, DateTime? startDate = null, DateTime? endDate = null) =>
        {
            var query = db.Expenses.Include(e => e.Category).AsQueryable();

            if (status.HasValue)
                query = query.Where(e => e.Status == status.Value);

            if (categoryId.HasValue)
                query = query.Where(e => e.CategoryId == categoryId.Value);

            if (startDate.HasValue)
                query = query.Where(e => e.ExpenseDate >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(e => e.ExpenseDate <= endDate.Value);

            var total = await query.CountAsync();
            var expenses = await query
                .OrderByDescending(e => e.ExpenseDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new ExpenseListDto(
                    e.Id, e.ExpenseNumber, e.CategoryId, e.Category!.Name, e.Description,
                    e.Amount, e.VatAmount, e.TotalAmount, e.Currency, e.ExpenseDate,
                    e.Status, e.SupplierId, e.EmployeeId, e.CreatedAt))
                .ToListAsync();

            return Results.Ok(new { Total = total, Page = page, PageSize = pageSize, Expenses = expenses });
        }).WithName("GetExpenses");

        group.MapGet("/expenses/{id:guid}", async (Guid id, AccountingDbContext db) =>
        {
            var expense = await db.Expenses.Include(e => e.Category).FirstOrDefaultAsync(e => e.Id == id);
            if (expense == null)
                return Results.NotFound();

            var dto = new ExpenseDetailDto(
                expense.Id, expense.ExpenseNumber, expense.CategoryId, expense.Category!.Name,
                expense.Description, expense.Amount, expense.VatAmount, expense.TotalAmount,
                expense.Currency, expense.ExpenseDate, expense.Status, expense.PaymentMethod,
                expense.SupplierId, expense.EmployeeId, expense.CreatedBy, expense.ApprovedBy,
                expense.ApprovedAt, expense.PaidAt, expense.RejectionReason, expense.Notes,
                expense.ReceiptUrl, expense.CreatedAt);

            return Results.Ok(dto);
        }).WithName("GetExpenseDetail");

        group.MapPost("/expenses", async (CreateExpenseRequest request, AccountingDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var category = await db.ExpenseCategories.FindAsync(request.CategoryId);
            if (category == null)
                return Results.BadRequest(new { Error = "Invalid category" });

            var currency = Enum.TryParse<Currency>(request.Currency, out var cur) ? cur : Currency.VND;

            var expense = Expense.Create(
                request.CategoryId,
                request.Description,
                request.Amount,
                request.VatRate,
                currency,
                request.ExpenseDate,
                userId,
                request.SupplierId,
                request.EmployeeId,
                request.Notes,
                request.ReceiptUrl);

            db.Expenses.Add(expense);
            await db.SaveChangesAsync();

            return Results.Created($"/api/accounting/expenses/{expense.Id}",
                new { Id = expense.Id, ExpenseNumber = expense.ExpenseNumber });
        }).WithName("CreateExpense");

        group.MapPut("/expenses/{id:guid}", async (Guid id, UpdateExpenseRequest request, AccountingDbContext db) =>
        {
            var expense = await db.Expenses.FindAsync(id);
            if (expense == null)
                return Results.NotFound();

            try
            {
                expense.Update(
                    request.CategoryId, request.Description, request.Amount, request.VatRate,
                    request.ExpenseDate, request.SupplierId, request.EmployeeId,
                    request.Notes, request.ReceiptUrl);

                await db.SaveChangesAsync();
                return Results.Ok(new { Message = "Expense updated successfully" });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
        }).WithName("UpdateExpense");

        group.MapPost("/expenses/{id:guid}/approve", async (Guid id, AccountingDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var expense = await db.Expenses.FindAsync(id);
            if (expense == null)
                return Results.NotFound();

            try
            {
                expense.Approve(userId);
                await db.SaveChangesAsync();
                return Results.Ok(new { Message = "Expense approved", Status = expense.Status.ToString() });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
        }).WithName("ApproveExpense");

        group.MapPost("/expenses/{id:guid}/reject", async (Guid id, RejectExpenseRequest request, AccountingDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var expense = await db.Expenses.FindAsync(id);
            if (expense == null)
                return Results.NotFound();

            try
            {
                expense.Reject(userId, request.Reason);
                await db.SaveChangesAsync();
                return Results.Ok(new { Message = "Expense rejected", Status = expense.Status.ToString() });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
        }).WithName("RejectExpense");

        group.MapPost("/expenses/{id:guid}/pay", async (Guid id, PayExpenseRequest request, AccountingDbContext db) =>
        {
            var expense = await db.Expenses.FindAsync(id);
            if (expense == null)
                return Results.NotFound();

            try
            {
                var method = Enum.TryParse<PaymentMethod>(request.PaymentMethod, out var pm) ? pm : PaymentMethod.Cash;
                expense.MarkAsPaid(method);
                await db.SaveChangesAsync();
                return Results.Ok(new { Message = "Expense marked as paid", Status = expense.Status.ToString() });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
        }).WithName("PayExpense");

        group.MapGet("/expenses/summary", async (AccountingDbContext db, DateTime? startDate = null, DateTime? endDate = null) =>
        {
            var query = db.Expenses.AsQueryable();

            if (startDate.HasValue)
                query = query.Where(e => e.ExpenseDate >= startDate.Value);
            if (endDate.HasValue)
                query = query.Where(e => e.ExpenseDate <= endDate.Value);

            // Optimized: Calculate aggregations directly in database
            var totalExpenses = await query.SumAsync(e => e.TotalAmount);
            var pendingAmount = await query.Where(e => e.Status == ExpenseStatus.Pending).SumAsync(e => e.TotalAmount);
            var approvedAmount = await query.Where(e => e.Status == ExpenseStatus.Approved).SumAsync(e => e.TotalAmount);
            var paidAmount = await query.Where(e => e.Status == ExpenseStatus.Paid).SumAsync(e => e.TotalAmount);
            var pendingCount = await query.CountAsync(e => e.Status == ExpenseStatus.Pending);
            var approvedCount = await query.CountAsync(e => e.Status == ExpenseStatus.Approved);
            var paidCount = await query.CountAsync(e => e.Status == ExpenseStatus.Paid);

            // Group by category in database
            var byCategory = await query
                .GroupBy(e => new { e.CategoryId, e.Category!.Name, e.Category.Code })
                .Select(g => new CategoryExpenseSummary(
                    g.Key.CategoryId, g.Key.Name, g.Key.Code,
                    g.Sum(e => e.TotalAmount), g.Count()))
                .OrderByDescending(c => c.TotalAmount)
                .ToListAsync();

            var summary = new ExpenseSummaryDto(
                TotalExpenses: totalExpenses,
                PendingAmount: pendingAmount,
                ApprovedAmount: approvedAmount,
                PaidAmount: paidAmount,
                PendingCount: pendingCount,
                ApprovedCount: approvedCount,
                PaidCount: paidCount,
                ByCategory: byCategory);

            return Results.Ok(summary);
        }).WithName("GetExpenseSummary");
    }
}

public record CreateInvoiceDto(Guid? CustomerId, List<CreateInvoiceItemDto> Items, string Notes);
public record CreateInvoiceItemDto(string Description, int Quantity, decimal UnitPrice);
public record CreateAccountDto(string Name, decimal CreditLimit);
public record ApplyAPPaymentRequest(decimal Amount, string PaymentMethod, string? Reference);
