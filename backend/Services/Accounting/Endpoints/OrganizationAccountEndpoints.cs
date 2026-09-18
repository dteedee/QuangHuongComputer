using Accounting.Domain;
using Accounting.Infrastructure;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Paging;
using BuildingBlocks.Validation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Accounting.Endpoints;

/// <summary>Tài khoản công nợ của khách hàng doanh nghiệp (hạn mức + sổ cái).</summary>
public static class OrganizationAccountEndpoints
{
    public static void MapOrganizationAccountEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/accounts", async (
            [AsParameters] PagedRequest paging, AccountingDbContext db, CancellationToken ct) =>
        {
            var query = db.Accounts.AsQueryable();
            if (paging.NormalizedSearch is { } search)
                query = query.Where(a => a.Name.Contains(search));

            var sortable = new Dictionary<string, System.Linq.Expressions.Expression<Func<OrganizationAccount, object?>>>
            {
                ["name"] = a => a.Name,
                ["balance"] = a => a.Balance,
                ["creditLimit"] = a => a.CreditLimit
            };

            return Results.Ok(await query
                .ApplySort(paging, sortable, a => a.Name)
                .Select(a => new { a.Id, a.Name, a.Balance, a.CreditLimit, a.IsActive })
                .ToPagedResultAsync(paging, ct));
        }).WithName("GetOrganizationAccounts");

        group.MapGet("/accounts/{id:guid}", async (Guid id, AccountingDbContext db, CancellationToken ct) =>
        {
            var account = await db.Accounts.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id, ct)
                ?? throw NotFoundException.For("tài khoản công nợ", id);
            return Results.Ok(account);
        }).WithName("GetOrganizationAccount");

        group.MapPost("/accounts", async (CreateAccountDto dto, AccountingDbContext db, CancellationToken ct) =>
        {
            var account = new OrganizationAccount(dto.Name, dto.CreditLimit);
            db.Accounts.Add(account);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/accounting/accounts/{account.Id}", account);
        }).WithName("CreateOrganizationAccount").WithValidation<CreateAccountDto>();
    }
}

public record CreateAccountDto(string Name, decimal CreditLimit);
