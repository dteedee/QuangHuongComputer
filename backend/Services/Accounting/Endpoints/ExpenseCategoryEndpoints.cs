using Accounting.Domain;
using Accounting.DTOs;
using Accounting.Infrastructure;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Validation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Accounting.Endpoints;

/// <summary>Danh mục chi phí. Bộ mặc định được nạp bởi <c>Infrastructure/Seed/ExpenseCategorySeeder</c>.</summary>
public static class ExpenseCategoryEndpoints
{
    public static void MapExpenseCategoryEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/expense-categories", async (AccountingDbContext db, bool? includeInactive, CancellationToken ct) =>
        {
            var query = db.ExpenseCategories.AsNoTracking().AsQueryable();
            if (includeInactive != true) query = query.Where(c => c.IsActive);

            return Results.Ok(await query
                .OrderBy(c => c.Name)
                .Select(c => new ExpenseCategoryDto(c.Id, c.Name, c.Code, c.Description, c.IsActive))
                .ToListAsync(ct));
        }).WithName("GetExpenseCategories");

        group.MapPost("/expense-categories", async (
            CreateExpenseCategoryRequest request, AccountingDbContext db, CancellationToken ct) =>
        {
            var code = request.Code.Trim().ToUpperInvariant();
            if (await db.ExpenseCategories.AnyAsync(c => c.Code == code, ct))
                throw new RequestValidationException("code", "Mã danh mục đã tồn tại.");

            var category = ExpenseCategory.Create(request.Name, code, request.Description);
            db.ExpenseCategories.Add(category);
            await db.SaveChangesAsync(ct);

            return Results.Created($"/api/accounting/expense-categories/{category.Id}",
                new ExpenseCategoryDto(category.Id, category.Name, category.Code, category.Description, category.IsActive));
        }).WithName("CreateExpenseCategory").WithValidation<CreateExpenseCategoryRequest>();

        group.MapPut("/expense-categories/{id:guid}", async (
            Guid id, UpdateExpenseCategoryRequest request, AccountingDbContext db, CancellationToken ct) =>
        {
            var category = await db.ExpenseCategories.FindAsync(new object[] { id }, ct)
                ?? throw NotFoundException.For("danh mục chi phí", id);

            category.Update(request.Name, request.Description);
            await db.SaveChangesAsync(ct);

            return Results.Ok(new ExpenseCategoryDto(
                category.Id, category.Name, category.Code, category.Description, category.IsActive));
        }).WithName("UpdateExpenseCategory").WithValidation<UpdateExpenseCategoryRequest>();
    }
}
