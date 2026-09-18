using Accounting.Application.Invoicing;
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

/// <summary>Giấy báo có / báo nợ — chứng từ điều chỉnh một hoá đơn đã phát hành.</summary>
public static class CreditNoteEndpoints
{
    public static void MapCreditNoteEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/credit-notes", async (
            [AsParameters] PagedRequest paging,
            AccountingDbContext db,
            CreditNoteStatus? status,
            CreditNoteReason? reasonCode,
            Guid? orderId,
            CancellationToken ct) =>
        {
            var query = db.CreditNotes.AsQueryable();
            if (status.HasValue) query = query.Where(c => c.Status == status.Value);
            if (reasonCode.HasValue) query = query.Where(c => c.ReasonCode == reasonCode.Value);
            if (orderId.HasValue) query = query.Where(c => c.OrderId == orderId.Value);
            if (paging.NormalizedSearch is { } search)
                query = query.Where(c => c.CreditNoteNumber.Contains(search)
                                         || (c.OriginalInvoiceNumber != null && c.OriginalInvoiceNumber.Contains(search)));

            var sortable = new Dictionary<string, System.Linq.Expressions.Expression<Func<CreditNote, object?>>>
            {
                ["creditNoteNumber"] = c => c.CreditNoteNumber,
                ["issueDate"] = c => c.IssueDate,
                ["amount"] = c => c.Amount
            };

            return Results.Ok(await query
                .ApplySort(paging, sortable, c => c.IssueDate)
                .Select(c => new CreditNoteDto(
                    c.Id, c.CreditNoteNumber, c.Type, c.Status, c.ReasonCode, c.Reason,
                    c.Amount, c.NetAmount, c.VatAmount, c.VatRate, c.IssueDate, c.BusinessDate,
                    c.OriginalInvoiceId, c.OriginalInvoiceNumber, c.OrderId, c.CustomerId))
                .ToPagedResultAsync(paging, ct));
        }).WithName("GetCreditNotes");

        group.MapGet("/credit-notes/{id:guid}", async (Guid id, AccountingDbContext db, CancellationToken ct) =>
        {
            var note = await db.CreditNotes.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, ct)
                ?? throw NotFoundException.For("giấy báo có", id);
            return Results.Ok(note.ToDto());
        }).WithName("GetCreditNoteDetail");

        group.MapPost("/credit-notes", async (
            CreateCreditNoteRequest request,
            AccountingDbContext db,
            CreditNoteService service,
            CancellationToken ct) =>
        {
            var invoice = await db.Invoices.AsNoTracking()
                .Where(i => i.Id == request.OriginalInvoiceId)
                .Select(i => new { i.Id, i.OrderId, i.CustomerId, i.Status, i.TotalAmount })
                .FirstOrDefaultAsync(ct)
                ?? throw NotFoundException.For("hoá đơn", request.OriginalInvoiceId);

            if (invoice.Status == InvoiceStatus.Draft)
                throw new ConflictException("Hoá đơn còn ở trạng thái nháp: sửa thẳng hoá đơn thay vì lập giấy báo có.");
            if (request.Amount > invoice.TotalAmount)
                throw new RequestValidationException("amount", "Số tiền điều chỉnh không được vượt quá giá trị hoá đơn.");

            var note = await service.IssueForOrderAsync(
                sourceKey: $"manual:{Guid.NewGuid():N}",
                orderId: invoice.OrderId ?? Guid.Empty,
                customerId: invoice.CustomerId,
                grossAmount: request.Amount,
                reasonCode: request.ReasonCode,
                reason: request.Reason,
                ct: ct);

            if (note is null)
                throw new ConflictException("Không lập được giấy báo có cho hoá đơn này.");

            return Results.Created($"/api/accounting/credit-notes/{note.Id}", note.ToDto());
        }).WithName("CreateCreditNote").WithValidation<CreateCreditNoteRequest>();

        group.MapPost("/credit-notes/{id:guid}/cancel", async (
            Guid id, CancelCreditNoteRequest request, AccountingDbContext db, CancellationToken ct) =>
        {
            var note = await db.CreditNotes.FirstOrDefaultAsync(c => c.Id == id, ct)
                ?? throw NotFoundException.For("giấy báo có", id);

            note.Cancel(request.Reason);
            await db.SaveChangesAsync(ct);
            return Results.Ok(note.ToDto());
        }).WithName("CancelCreditNote").WithValidation<CancelCreditNoteRequest>();
    }
}
