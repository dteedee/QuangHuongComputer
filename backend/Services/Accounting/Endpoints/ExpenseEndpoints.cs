using System.Security.Claims;
using Accounting.Application.CashBook;
using Accounting.Domain;
using Accounting.DTOs;
using Accounting.Infrastructure;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Paging;
using BuildingBlocks.Security;
using BuildingBlocks.Validation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Accounting.Endpoints;

/// <summary>Khoản chi. Danh mục chi phí nằm ở <see cref="ExpenseCategoryEndpoints"/>.</summary>
public static class ExpenseEndpoints
{
    public static void MapExpenseEndpoints(this RouteGroupBuilder group)
    {
        // ===== Chi phí =====
        group.MapGet("/expenses", async (
            [AsParameters] PagedRequest paging,
            AccountingDbContext db,
            ExpenseStatus? status,
            Guid? categoryId,
            DateTime? startDate,
            DateTime? endDate,
            CancellationToken ct) =>
        {
            var query = db.Expenses.Include(e => e.Category).AsQueryable();
            if (status.HasValue) query = query.Where(e => e.Status == status.Value);
            if (categoryId.HasValue) query = query.Where(e => e.CategoryId == categoryId.Value);
            if (startDate.HasValue) query = query.Where(e => e.ExpenseDate >= startDate.Value);
            if (endDate.HasValue) query = query.Where(e => e.ExpenseDate <= endDate.Value);
            if (paging.NormalizedSearch is { } search)
                query = query.Where(e => e.ExpenseNumber.Contains(search) || e.Description.Contains(search));

            var sortable = new Dictionary<string, System.Linq.Expressions.Expression<Func<Expense, object?>>>
            {
                ["expenseNumber"] = e => e.ExpenseNumber,
                ["expenseDate"] = e => e.ExpenseDate,
                ["totalAmount"] = e => e.TotalAmount
            };

            return Results.Ok(await query
                .ApplySort(paging, sortable, e => e.ExpenseDate)
                .Select(e => new ExpenseListDto(
                    e.Id, e.ExpenseNumber, e.CategoryId, e.Category!.Name, e.Description,
                    e.Amount, e.VatAmount, e.TotalAmount, e.Currency, e.ExpenseDate,
                    e.Status, e.SupplierId, e.EmployeeId, e.CreatedAt))
                .ToPagedResultAsync(paging, ct));
        }).WithName("GetExpenses");

        group.MapGet("/expenses/summary", async (
            AccountingDbContext db, DateTime? startDate, DateTime? endDate, CancellationToken ct) =>
        {
            var query = db.Expenses.AsNoTracking().AsQueryable();
            if (startDate.HasValue) query = query.Where(e => e.ExpenseDate >= startDate.Value);
            if (endDate.HasValue) query = query.Where(e => e.ExpenseDate <= endDate.Value);

            var totals = await query
                .GroupBy(e => e.Status)
                .Select(g => new { Status = g.Key, Amount = g.Sum(e => e.TotalAmount), Count = g.Count() })
                .ToListAsync(ct);

            decimal AmountOf(ExpenseStatus s) => totals.FirstOrDefault(t => t.Status == s)?.Amount ?? 0m;
            int CountOf(ExpenseStatus s) => totals.FirstOrDefault(t => t.Status == s)?.Count ?? 0;

            var byCategory = await query
                .GroupBy(e => new { e.CategoryId, e.Category!.Name, e.Category.Code })
                .Select(g => new CategoryExpenseSummary(
                    g.Key.CategoryId, g.Key.Name, g.Key.Code, g.Sum(e => e.TotalAmount), g.Count()))
                .OrderByDescending(c => c.TotalAmount)
                .ToListAsync(ct);

            return Results.Ok(new ExpenseSummaryDto(
                TotalExpenses: totals.Sum(t => t.Amount),
                PendingAmount: AmountOf(ExpenseStatus.Pending),
                ApprovedAmount: AmountOf(ExpenseStatus.Approved),
                PaidAmount: AmountOf(ExpenseStatus.Paid),
                PendingCount: CountOf(ExpenseStatus.Pending),
                ApprovedCount: CountOf(ExpenseStatus.Approved),
                PaidCount: CountOf(ExpenseStatus.Paid),
                ByCategory: byCategory));
        }).WithName("GetExpenseSummary");

        group.MapGet("/expenses/{id:guid}", async (Guid id, AccountingDbContext db, CancellationToken ct) =>
        {
            var e = await db.Expenses.AsNoTracking().Include(x => x.Category)
                .FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw NotFoundException.For("khoản chi", id);

            return Results.Ok(new ExpenseDetailDto(
                e.Id, e.ExpenseNumber, e.CategoryId, e.Category!.Name, e.Description,
                e.Amount, e.VatAmount, e.TotalAmount, e.Currency, e.ExpenseDate, e.Status,
                e.PaymentMethod, e.SupplierId, e.EmployeeId, e.CreatedBy, e.ApprovedBy,
                e.ApprovedAt, e.PaidAt, e.RejectionReason, e.Notes, e.ReceiptUrl, e.CreatedAt));
        }).WithName("GetExpenseDetail");

        group.MapPost("/expenses", async (
            CreateExpenseRequest request, AccountingDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var userId = user.RequireUserId();
            if (!await db.ExpenseCategories.AnyAsync(c => c.Id == request.CategoryId, ct))
                throw new RequestValidationException("categoryId", "Danh mục chi phí không tồn tại.");

            var expense = Expense.Create(
                request.CategoryId, request.Description, request.Amount, request.VatRate,
                Currency.VND, request.ExpenseDate, userId,
                request.SupplierId, request.EmployeeId, request.Notes, request.ReceiptUrl);

            db.Expenses.Add(expense);
            await db.SaveChangesAsync(ct);

            return Results.Created($"/api/accounting/expenses/{expense.Id}",
                new { expense.Id, expense.ExpenseNumber, expense.TotalAmount });
        }).WithName("CreateExpense").WithValidation<CreateExpenseRequest>();

        group.MapPut("/expenses/{id:guid}", async (
            Guid id, UpdateExpenseRequest request, AccountingDbContext db, CancellationToken ct) =>
        {
            var expense = await db.Expenses.FindAsync(new object[] { id }, ct)
                ?? throw NotFoundException.For("khoản chi", id);

            expense.Update(
                request.CategoryId, request.Description, request.Amount, request.VatRate,
                request.ExpenseDate, request.SupplierId, request.EmployeeId, request.Notes, request.ReceiptUrl);

            await db.SaveChangesAsync(ct);
            return Results.Ok(new { Message = "Đã cập nhật khoản chi." });
        }).WithName("UpdateExpense").WithValidation<UpdateExpenseRequest>();

        group.MapPost("/expenses/{id:guid}/approve", async (
            Guid id, AccountingDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var expense = await db.Expenses.FindAsync(new object[] { id }, ct)
                ?? throw NotFoundException.For("khoản chi", id);

            expense.Approve(user.RequireUserId());
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { Message = "Đã duyệt khoản chi.", Status = expense.Status.ToString() });
        }).WithName("ApproveExpense").RequireAuthorization(Permissions.Accounting.ManageExpense);

        group.MapPost("/expenses/{id:guid}/reject", async (
            Guid id, RejectExpenseRequest request, AccountingDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var expense = await db.Expenses.FindAsync(new object[] { id }, ct)
                ?? throw NotFoundException.For("khoản chi", id);

            expense.Reject(user.RequireUserId(), request.Reason);
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { Message = "Đã từ chối khoản chi.", Status = expense.Status.ToString() });
        }).WithName("RejectExpense")
          .WithValidation<RejectExpenseRequest>()
          .RequireAuthorization(Permissions.Accounting.ManageExpense);

        group.MapPost("/expenses/{id:guid}/pay", async (
            Guid id,
            PayExpenseRequest request,
            AccountingDbContext db,
            CashBookService cashBook,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var expense = await db.Expenses.FindAsync(new object[] { id }, ct)
                ?? throw NotFoundException.For("khoản chi", id);

            var method = Enum.TryParse<PaymentMethod>(request.PaymentMethod, true, out var pm) ? pm : PaymentMethod.Cash;
            expense.MarkAsPaid(method);

            // Chi tiền mặt PHẢI vào sổ quỹ; chi chuyển khoản thì không (sổ quỹ chỉ là tiền mặt).
            if (method == PaymentMethod.Cash)
            {
                await cashBook.RecordAsync(
                    CashVoucherKind.Payment,
                    string.IsNullOrWhiteSpace(request.FundCode) ? "CASH-MAIN" : request.FundCode,
                    expense.TotalAmount,
                    $"Chi {expense.ExpenseNumber}: {expense.Description}",
                    CashVoucherSource.Expense,
                    expenseId: expense.Id,
                    sourceKey: $"expense:{expense.Id}",
                    createdByUserId: user.RequireUserId(),
                    ct: ct);
            }

            await db.SaveChangesAsync(ct);
            return Results.Ok(new { Message = "Đã ghi nhận chi tiền.", Status = expense.Status.ToString() });
        }).WithName("PayExpense")
          .WithValidation<PayExpenseRequest>()
          .RequireAuthorization(Permissions.Accounting.ManageExpense);
    }
}
