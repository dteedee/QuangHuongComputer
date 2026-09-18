using Accounting.Application.Invoicing;
using Accounting.Domain;
using Accounting.DTOs;
using Accounting.Infrastructure;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Paging;
using BuildingBlocks.Time;
using BuildingBlocks.Validation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Accounting.Endpoints;

/// <summary>Hoá đơn (chung cho cả bán ra và mua vào) + thống kê tổng quan.</summary>
public static class InvoiceEndpoints
{
    public static void MapInvoiceEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/invoices", async (
            [AsParameters] PagedRequest paging,
            AccountingDbContext db,
            InvoiceType? type,
            InvoiceStatus? status,
            CancellationToken ct) =>
        {
            var query = db.Invoices.AsQueryable();
            if (type.HasValue) query = query.Where(i => i.Type == type.Value);
            if (status.HasValue) query = query.Where(i => i.Status == status.Value);
            if (paging.NormalizedSearch is { } search)
            {
                query = query.Where(i =>
                    i.InvoiceNumber.Contains(search) ||
                    (i.OrderNumber != null && i.OrderNumber.Contains(search)) ||
                    (i.BuyerFullName != null && i.BuyerFullName.Contains(search)) ||
                    (i.BuyerTaxCode != null && i.BuyerTaxCode.Contains(search)));
            }

            var sortable = new Dictionary<string, System.Linq.Expressions.Expression<Func<Invoice, object?>>>
            {
                ["invoiceNumber"] = i => i.InvoiceNumber,
                ["issueDate"] = i => i.IssueDate,
                ["dueDate"] = i => i.DueDate,
                ["totalAmount"] = i => i.TotalAmount
            };

            return Results.Ok(await query
                .ApplySort(paging, sortable, i => i.IssueDate)
                .Select(i => new InvoiceListItemDto(
                    i.Id, i.InvoiceNumber, i.Type, i.Status, i.CustomerId, i.SupplierId,
                    i.OrderId, i.OrderNumber, i.IssueDate, i.DueDate,
                    i.SubTotal, i.VatAmount, i.TotalAmount, i.PaidAmount,
                    i.TotalAmount - i.PaidAmount, i.AgingBucket, i.Currency))
                .ToPagedResultAsync(paging, ct));
        }).WithName("GetInvoices");

        group.MapGet("/invoices/{id:guid}", async (Guid id, AccountingDbContext db, CancellationToken ct) =>
        {
            var invoice = await db.Invoices.AsNoTracking()
                .Include(i => i.Lines)
                .Include(i => i.PaymentApplications)
                .FirstOrDefaultAsync(i => i.Id == id, ct)
                ?? throw NotFoundException.For("hoá đơn", id);

            return Results.Ok(invoice.ToDetail());
        }).WithName("GetInvoiceDetail");

        group.MapPost("/invoices", async (
            CreateManualInvoiceRequest request,
            ManualInvoiceService service,
            CancellationToken ct) =>
        {
            var invoice = await service.CreateAsync(request, ct);
            return Results.Created($"/api/accounting/invoices/{invoice.Id}", invoice.ToDetail());
        }).WithName("CreateInvoice").WithValidation<CreateManualInvoiceRequest>();

        group.MapPut("/invoices/{id:guid}", async (
            Guid id,
            UpdateManualInvoiceRequest request,
            AccountingDbContext db,
            ManualInvoiceService service,
            CancellationToken ct) =>
        {
            var invoice = await db.Invoices.Include(i => i.Lines).FirstOrDefaultAsync(i => i.Id == id, ct)
                ?? throw NotFoundException.For("hoá đơn", id);

            await service.UpdateAsync(invoice, request, ct);
            return Results.Ok(invoice.ToDetail());
        }).WithName("UpdateInvoice").WithValidation<UpdateManualInvoiceRequest>();

        group.MapPost("/invoices/{id:guid}/issue", async (
            Guid id, AccountingDbContext db, IBusinessClock clock, CancellationToken ct) =>
        {
            var invoice = await db.Invoices.Include(i => i.Lines).FirstOrDefaultAsync(i => i.Id == id, ct)
                ?? throw NotFoundException.For("hoá đơn", id);

            if (invoice.Status != InvoiceStatus.Draft)
                throw new ConflictException("Hoá đơn này đã được phát hành.");

            invoice.Issue(clock.UtcNow.UtcDateTime);
            await db.SaveChangesAsync(ct);
            return Results.Ok(invoice.ToDetail());
        }).WithName("IssueInvoice");

        group.MapPost("/invoices/{id:guid}/cancel", async (
            Guid id, CancelInvoiceRequest request, AccountingDbContext db, CancellationToken ct) =>
        {
            var invoice = await db.Invoices.Include(i => i.Lines).FirstOrDefaultAsync(i => i.Id == id, ct)
                ?? throw NotFoundException.For("hoá đơn", id);

            if (invoice.PaidAmount > 0)
                throw new ConflictException("Hoá đơn đã thu tiền: phải lập giấy báo có thay vì huỷ.");

            invoice.Cancel(request.Reason);
            await db.SaveChangesAsync(ct);
            return Results.Ok(invoice.ToDetail());
        }).WithName("CancelInvoice").WithValidation<CancelInvoiceRequest>();

        group.MapGet("/invoices/{id:guid}/html", async (Guid id, AccountingDbContext db, CancellationToken ct) =>
        {
            var invoice = await db.Invoices.AsNoTracking().Include(i => i.Lines)
                .FirstOrDefaultAsync(i => i.Id == id, ct)
                ?? throw NotFoundException.For("hoá đơn", id);

            return Results.Content(Templates.InvoiceHtmlTemplate.Render(invoice), "text/html");
        }).WithName("GetInvoiceHtml");

        group.MapGet("/stats", async (AccountingDbContext db, IBusinessClock clock, CancellationToken ct) =>
        {
            // Một DbContext KHÔNG thread-safe: các truy vấn này phải tuần tự, không Task.WhenAll.
            var todayStartUtc = new DateTime(clock.TodayVn, TimeOnly.MinValue, DateTimeKind.Unspecified).AddHours(-7);

            var open = db.Invoices.Where(i => i.Status != InvoiceStatus.Paid && i.Status != InvoiceStatus.Cancelled);

            var receivables = await open.Where(i => i.Type == InvoiceType.Receivable)
                .SumAsync(i => i.TotalAmount - i.PaidAmount, ct);
            var payables = await open.Where(i => i.Type == InvoiceType.Payable)
                .SumAsync(i => i.TotalAmount - i.PaidAmount, ct);
            var overdueReceivables = await open
                .Where(i => i.Type == InvoiceType.Receivable && i.Status == InvoiceStatus.Overdue)
                .SumAsync(i => i.TotalAmount - i.PaidAmount, ct);
            var overduePayables = await open
                .Where(i => i.Type == InvoiceType.Payable && i.Status == InvoiceStatus.Overdue)
                .SumAsync(i => i.TotalAmount - i.PaidAmount, ct);
            var revenueToday = await db.Invoices
                .Where(i => i.Type == InvoiceType.Receivable
                            && i.IssueDate >= todayStartUtc
                            && i.Status != InvoiceStatus.Cancelled
                            && i.Status != InvoiceStatus.Draft)
                .SumAsync(i => i.TotalAmount, ct);
            var arCount = await db.Invoices.CountAsync(i => i.Type == InvoiceType.Receivable, ct);
            var apCount = await db.Invoices.CountAsync(i => i.Type == InvoiceType.Payable, ct);
            var accounts = await db.Accounts.CountAsync(ct);

            return Results.Ok(new AccountingStatsDto(
                receivables, payables, overdueReceivables, overduePayables,
                revenueToday, arCount, apCount, accounts));
        }).WithName("GetAccountingStats");
    }
}
