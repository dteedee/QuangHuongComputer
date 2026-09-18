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
using Microsoft.Extensions.Logging;

namespace Accounting.Endpoints;

/// <summary>Công nợ phải thu (AR).</summary>
public static class AccountsReceivableEndpoints
{
    public static void MapAccountsReceivableEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/ar", async (
            [AsParameters] PagedRequest paging,
            AccountingDbContext db,
            AgingBucket? aging,
            InvoiceStatus? status,
            Guid? customerId,
            CancellationToken ct) =>
        {
            var query = db.Invoices.Where(i => i.Type == InvoiceType.Receivable);
            if (aging.HasValue) query = query.Where(i => i.AgingBucket == aging.Value);
            if (status.HasValue) query = query.Where(i => i.Status == status.Value);
            if (customerId.HasValue) query = query.Where(i => i.CustomerId == customerId.Value);
            if (paging.NormalizedSearch is { } search)
                query = query.Where(i => i.InvoiceNumber.Contains(search)
                                         || (i.OrderNumber != null && i.OrderNumber.Contains(search)));

            var sortable = new Dictionary<string, System.Linq.Expressions.Expression<Func<Invoice, object?>>>
            {
                ["invoiceNumber"] = i => i.InvoiceNumber,
                ["issueDate"] = i => i.IssueDate,
                ["dueDate"] = i => i.DueDate,
                ["totalAmount"] = i => i.TotalAmount
            };

            // OutstandingAmount là biểu thức C# chỉ-đọc, EF không dịch được trong Select —
            // viết thẳng phép trừ trên hai cột thật (W0-8: trước đây mọi lần gọi đều 400).
            return Results.Ok(await query
                .ApplySort(paging, sortable, i => i.IssueDate)
                .Select(i => new ARInvoiceListDto(
                    i.Id, i.InvoiceNumber, i.CustomerId, i.OrganizationAccountId,
                    i.IssueDate, i.DueDate, i.TotalAmount, i.PaidAmount,
                    i.TotalAmount - i.PaidAmount, i.Status, i.AgingBucket, i.Currency))
                .ToPagedResultAsync(paging, ct));
        }).WithName("GetARInvoices");

        group.MapGet("/ar/aging-summary", async (AccountingDbContext db, CancellationToken ct) =>
        {
            var buckets = await AgingBuckets(db, InvoiceType.Receivable, ct);
            return Results.Ok(new ARAgingSummaryDto(
                Bucket(buckets, AgingBucket.Current),
                Bucket(buckets, AgingBucket.Days1To30),
                Bucket(buckets, AgingBucket.Days31To60),
                Bucket(buckets, AgingBucket.Days61To90),
                Bucket(buckets, AgingBucket.Over90Days),
                buckets.Sum(b => b.Total)));
        }).WithName("GetARAgingSummary");

        group.MapGet("/ar/{id:guid}", async (Guid id, AccountingDbContext db, CancellationToken ct) =>
        {
            var invoice = await db.Invoices.AsNoTracking()
                .Include(i => i.Lines).Include(i => i.PaymentApplications)
                .FirstOrDefaultAsync(i => i.Id == id && i.Type == InvoiceType.Receivable, ct)
                ?? throw NotFoundException.For("hoá đơn bán ra", id);

            return Results.Ok(invoice.ToDetail());
        }).WithName("GetARInvoiceDetail");

        group.MapPost("/ar/{id:guid}/apply-payment", async (
            Guid id,
            ApplyPaymentRequest request,
            AccountingDbContext db,
            IBusinessClock clock,
            ILoggerFactory loggerFactory,
            CancellationToken ct) =>
        {
            var invoice = await db.Invoices
                .Include(i => i.PaymentApplications)
                .FirstOrDefaultAsync(i => i.Id == id, ct)
                ?? throw NotFoundException.For("hoá đơn bán ra", id);

            if (invoice.Type != InvoiceType.Receivable)
                throw new ConflictException("Chỉ ghi nhận thu tiền trên hoá đơn bán ra.");

            var now = clock.UtcNow.UtcDateTime;
            invoice.ApplyPayment(request.PaymentIntentId, request.Amount, now, request.Notes);
            await db.SaveChangesAsync(ct);

            // D10: tất toán khoản phải thu của đơn bán công nợ PHẢI phát ReceivablePaidEvent để
            // W2-23 đóng đơn. Hợp đồng sự kiện đó nằm ở BuildingBlocks/Messaging/IntegrationEvents —
            // ngoài phạm vi sở hữu của track này; đã ghi integration request W2-14 #1.
            // Cho tới khi hợp đồng có mặt, mốc tất toán được ghi log để không im lặng bỏ qua.
            if (invoice.Status == InvoiceStatus.Paid && invoice.OrderId.HasValue)
            {
                loggerFactory.CreateLogger("Accounting.Receivables").LogInformation(
                    "Khoản phải thu của đơn {OrderId} đã tất toán qua hoá đơn {InvoiceNumber} lúc {At} " +
                    "(chờ hợp đồng ReceivablePaidEvent — integration request W2-14 #1).",
                    invoice.OrderId, invoice.InvoiceNumber, now);
            }

            return Results.Ok(new
            {
                Message = "Đã ghi nhận thanh toán.",
                invoice.OutstandingAmount,
                Status = invoice.Status.ToString()
            });
        }).WithName("ApplyARPayment").WithValidation<ApplyPaymentRequest>();
    }

    internal static async Task<List<BucketTotal>> AgingBuckets(AccountingDbContext db, InvoiceType type, CancellationToken ct)
        => await db.Invoices
            .Where(i => i.Type == type && i.Status != InvoiceStatus.Paid && i.Status != InvoiceStatus.Cancelled)
            .GroupBy(i => i.AgingBucket)
            .Select(g => new BucketTotal(g.Key, g.Sum(i => i.TotalAmount - i.PaidAmount)))
            .ToListAsync(ct);

    internal static decimal Bucket(List<BucketTotal> buckets, AgingBucket bucket)
        => buckets.FirstOrDefault(b => b.Bucket == bucket)?.Total ?? 0m;

    internal record BucketTotal(AgingBucket Bucket, decimal Total);
}
