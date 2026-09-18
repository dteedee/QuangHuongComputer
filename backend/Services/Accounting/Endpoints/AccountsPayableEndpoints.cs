using Accounting.Domain;
using Accounting.DTOs;
using Accounting.Infrastructure;
using BuildingBlocks.Documents;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Paging;
using BuildingBlocks.Time;
using BuildingBlocks.Validation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Accounting.Endpoints;

/// <summary>Công nợ phải trả nhà cung cấp (AP). Nguồn chính là sự kiện nhập kho (GRN).</summary>
public static class AccountsPayableEndpoints
{
    public static void MapAccountsPayableEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/ap", async (
            [AsParameters] PagedRequest paging,
            AccountingDbContext db,
            AgingBucket? aging,
            InvoiceStatus? status,
            Guid? supplierId,
            CancellationToken ct) =>
        {
            var query = db.Invoices.Where(i => i.Type == InvoiceType.Payable);
            if (aging.HasValue) query = query.Where(i => i.AgingBucket == aging.Value);
            if (status.HasValue) query = query.Where(i => i.Status == status.Value);
            if (supplierId.HasValue) query = query.Where(i => i.SupplierId == supplierId.Value);
            if (paging.NormalizedSearch is { } search)
                query = query.Where(i => i.InvoiceNumber.Contains(search));

            var sortable = new Dictionary<string, System.Linq.Expressions.Expression<Func<Invoice, object?>>>
            {
                ["invoiceNumber"] = i => i.InvoiceNumber,
                ["issueDate"] = i => i.IssueDate,
                ["dueDate"] = i => i.DueDate,
                ["totalAmount"] = i => i.TotalAmount
            };

            return Results.Ok(await query
                .ApplySort(paging, sortable, i => i.IssueDate)
                .Select(i => new APInvoiceListDto(
                    i.Id, i.InvoiceNumber, i.SupplierId!.Value, i.IssueDate, i.DueDate,
                    i.TotalAmount, i.PaidAmount, i.TotalAmount - i.PaidAmount,
                    i.Status, i.AgingBucket, i.Currency,
                    i.PurchaseOrderId, i.GoodsReceiptId))
                .ToPagedResultAsync(paging, ct));
        }).WithName("GetAPInvoices");

        group.MapGet("/ap/aging-summary", async (AccountingDbContext db, CancellationToken ct) =>
        {
            var buckets = await AccountsReceivableEndpoints.AgingBuckets(db, InvoiceType.Payable, ct);
            return Results.Ok(new APAgingSummaryDto(
                AccountsReceivableEndpoints.Bucket(buckets, AgingBucket.Current),
                AccountsReceivableEndpoints.Bucket(buckets, AgingBucket.Days1To30),
                AccountsReceivableEndpoints.Bucket(buckets, AgingBucket.Days31To60),
                AccountsReceivableEndpoints.Bucket(buckets, AgingBucket.Days61To90),
                AccountsReceivableEndpoints.Bucket(buckets, AgingBucket.Over90Days),
                buckets.Sum(b => b.Total)));
        }).WithName("GetAPAgingSummary");

        group.MapGet("/ap/{id:guid}", async (Guid id, AccountingDbContext db, CancellationToken ct) =>
        {
            var invoice = await db.Invoices.AsNoTracking()
                .Include(i => i.Lines).Include(i => i.PaymentApplications)
                .FirstOrDefaultAsync(i => i.Id == id && i.Type == InvoiceType.Payable, ct)
                ?? throw NotFoundException.For("hoá đơn mua vào", id);

            return Results.Ok(invoice.ToDetail());
        }).WithName("GetAPInvoiceDetail");

        group.MapPost("/ap", async (
            CreateAPInvoiceRequest request,
            AccountingDbContext db,
            IDocumentNumberService documentNumbers,
            IBusinessClock clock,
            CancellationToken ct) =>
        {
            var nowUtc = clock.UtcNow.UtcDateTime;
            var number = await documentNumbers.NextAsync(DocumentNumberTypes.Invoice, ct);

            var invoice = Invoice.CreatePayable(
                request.SupplierId, number, nowUtc, request.DueDate, request.Notes);

            foreach (var line in request.Lines)
            {
                // Giá nhà cung cấp là giá CHƯA thuế -> thuế cộng thêm (xem POReceivedConsumer).
                var ratePercent = line.VatRate > 1m ? line.VatRate : line.VatRate * 100m;
                var net = Math.Round(line.Quantity * line.UnitPrice, 0, MidpointRounding.AwayFromZero);
                var vat = Math.Round(net * ratePercent / 100m, 0, MidpointRounding.AwayFromZero);

                invoice.AddLine(InvoiceLine.FromExtracted(
                    description: line.Description,
                    quantity: line.Quantity,
                    vatRatePercent: ratePercent,
                    grossBeforeDiscount: net + vat,
                    lineDiscount: 0m,
                    grossAmount: net + vat,
                    netAmount: net,
                    vatAmount: vat));
            }

            invoice.Issue(nowUtc);
            db.Invoices.Add(invoice);
            await db.SaveChangesAsync(ct);

            return Results.Created($"/api/accounting/ap/{invoice.Id}",
                new { invoice.Id, invoice.InvoiceNumber, invoice.TotalAmount });
        }).WithName("CreateAPInvoice").WithValidation<CreateAPInvoiceRequest>();

        group.MapPost("/ap/{id:guid}/apply-payment", async (
            Guid id,
            ApplyAPPaymentRequest request,
            AccountingDbContext db,
            IBusinessClock clock,
            CancellationToken ct) =>
        {
            var invoice = await db.Invoices.Include(i => i.Payments).FirstOrDefaultAsync(i => i.Id == id, ct)
                ?? throw NotFoundException.For("hoá đơn mua vào", id);

            if (invoice.Type != InvoiceType.Payable)
                throw new ConflictException("Chỉ ghi nhận chi trả trên hoá đơn mua vào.");

            var method = Enum.TryParse<PaymentMethod>(request.PaymentMethod, true, out var pm)
                ? pm
                : PaymentMethod.BankTransfer;

            var now = clock.UtcNow.UtcDateTime;
            invoice.RecordPayment(request.Amount, request.Reference ?? $"AP-{now:yyyyMMddHHmmss}", method, now);
            await db.SaveChangesAsync(ct);

            return Results.Ok(new
            {
                Message = "Đã ghi nhận chi trả.",
                invoice.OutstandingAmount,
                Status = invoice.Status.ToString()
            });
        }).WithName("ApplyAPPayment").WithValidation<ApplyAPPaymentRequest>();
    }
}
