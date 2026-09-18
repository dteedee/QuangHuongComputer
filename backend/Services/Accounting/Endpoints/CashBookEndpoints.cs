using System.Security.Claims;
using Accounting.Application.CashBook;
using Accounting.Domain;
using Accounting.DTOs;
using Accounting.Infrastructure;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Paging;
using BuildingBlocks.Validation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Accounting.Endpoints;

/// <summary>Sổ quỹ tiền mặt: phiếu thu/phiếu chi và số dư luỹ kế theo quỹ.</summary>
public static class CashBookEndpoints
{
    public static void MapCashBookEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/cash-book", async (
            string fundCode,
            CashBookService cashBook,
            DateTime? from,
            DateTime? to,
            CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(fundCode))
                throw new RequestValidationException("fundCode", "Phải chọn quỹ cần xem sổ.");

            return Results.Ok(await cashBook.GetBookAsync(fundCode, from, to, ct));
        }).WithName("GetCashBook");

        group.MapGet("/cash-book/funds", async (AccountingDbContext db, CancellationToken ct) =>
        {
            var funds = await db.CashVouchers.AsNoTracking()
                .GroupBy(v => v.FundCode)
                .Select(g => new
                {
                    FundCode = g.Key,
                    Balance = g.Sum(v => v.Kind == CashVoucherKind.Receipt ? v.Amount : -v.Amount),
                    VoucherCount = g.Count(),
                    LastVoucherAt = g.Max(v => v.VoucherDate)
                })
                .OrderBy(f => f.FundCode)
                .ToListAsync(ct);

            return Results.Ok(funds);
        }).WithName("GetCashFunds");

        group.MapGet("/cash-vouchers", async (
            [AsParameters] PagedRequest paging,
            AccountingDbContext db,
            string? fundCode,
            CashVoucherKind? kind,
            CashVoucherSource? source,
            CancellationToken ct) =>
        {
            var query = db.CashVouchers.AsQueryable();
            if (!string.IsNullOrWhiteSpace(fundCode))
                query = query.Where(v => v.FundCode == fundCode.Trim().ToUpper());
            if (kind.HasValue) query = query.Where(v => v.Kind == kind.Value);
            if (source.HasValue) query = query.Where(v => v.Source == source.Value);
            if (paging.NormalizedSearch is { } search)
                query = query.Where(v => v.VoucherNumber.Contains(search) || v.Description.Contains(search));

            var sortable = new Dictionary<string, System.Linq.Expressions.Expression<Func<CashVoucher, object?>>>
            {
                ["voucherNumber"] = v => v.VoucherNumber,
                ["voucherDate"] = v => v.VoucherDate,
                ["amount"] = v => v.Amount
            };

            return Results.Ok(await query
                .ApplySort(paging, sortable, v => v.VoucherDate)
                .Select(v => new CashVoucherDto(
                    v.Id, v.VoucherNumber, v.Kind, v.FundCode, v.Amount,
                    v.Kind == CashVoucherKind.Receipt ? v.Amount : -v.Amount,
                    v.VoucherDate, v.BusinessDate, v.Description, v.CounterpartyName, v.Source,
                    v.ShiftSessionId, v.ExpenseId, v.InvoiceId, v.OrderId))
                .ToPagedResultAsync(paging, ct));
        }).WithName("GetCashVouchers");

        group.MapPost("/cash-vouchers", async (
            CreateCashVoucherRequest request,
            CashBookService cashBook,
            AccountingDbContext db,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var voucher = await cashBook.RecordAsync(
                request.Kind, request.FundCode, request.Amount, request.Description,
                CashVoucherSource.Manual, request.VoucherDate, request.CounterpartyName,
                request.ShiftSessionId, request.ExpenseId, request.InvoiceId, request.OrderId,
                sourceKey: null, createdByUserId: user.RequireUserId(), ct: ct);

            if (voucher is null)
                throw new RequestValidationException("amount", "Số tiền trên phiếu phải lớn hơn 0.");

            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/accounting/cash-vouchers/{voucher.Id}", voucher.ToDto());
        }).WithName("CreateCashVoucher").WithValidation<CreateCashVoucherRequest>();
    }
}
