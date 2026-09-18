using Accounting.Infrastructure;
using Accounting.Infrastructure.EInvoice;
using BuildingBlocks.Paging;
using BuildingBlocks.Repository;
using BuildingBlocks.Time;
using Microsoft.EntityFrameworkCore;

namespace Accounting.Application.EInvoice;

/// <summary>
/// Hàng đợi "Chờ xuất HĐĐT": mọi hoá đơn bán ra ĐÃ phát hành nội bộ mà chưa có hoá đơn điện tử.
///
/// Vì sao hàng đợi đọc từ bảng <c>Invoices</c> chứ không từ bảng đơn hàng: module Kế toán không
/// truy vấn cơ sở dữ liệu của module Bán hàng. Mỗi đơn GIAO XONG đều sinh đúng một hoá đơn nội bộ
/// (consumer <c>OrderDelivered</c>/<c>OrderPaid</c> của W2-14) ngay trong cùng chu kỳ xử lý, nên
/// "đơn đã giao chưa có HĐĐT" và "hoá đơn chưa có HĐĐT" là cùng một tập hợp.
/// </summary>
public class EInvoiceQueueService
{
    private readonly AccountingDbContext _db;
    private readonly EInvoiceOptions _options;
    private readonly IBusinessClock _clock;

    public EInvoiceQueueService(AccountingDbContext db, EInvoiceOptions options, IBusinessClock clock)
    {
        _db = db;
        _options = options;
        _clock = clock;
    }

    /// <summary>
    /// Cũ nhất trước. Bộ lọc "trễ" chạy TRONG SQL (so ngày lập với mốc cắt) chứ không lọc sau khi
    /// phân trang — lọc sau sẽ làm <c>total</c> và nội dung các trang không khớp nhau.
    /// </summary>
    public async Task<PagedResult<EInvoiceQueueItemDto>> GetAsync(
        PagedRequest request, bool onlyLate, CancellationToken ct = default)
    {
        var nowUtc = _clock.UtcNow.UtcDateTime;

        var page = await BuildQuery(onlyLate, nowUtc)
            .OrderBy(r => r.IssueDate)
            .ToPagedResultAsync(request, ct);

        return new PagedResult<EInvoiceQueueItemDto>(
            page.Items.Select(r => ToDto(r, nowUtc)).ToList(), page.Total, page.Page, page.PageSize);
    }

    /// <summary>Toàn bộ hàng đợi cho bản xuất Excel (trần cứng để không bao giờ kéo cả bảng).</summary>
    public async Task<IReadOnlyList<EInvoiceQueueItemDto>> GetForExportAsync(
        bool onlyLate, int max = 5000, CancellationToken ct = default)
    {
        var nowUtc = _clock.UtcNow.UtcDateTime;
        var rows = await BuildQuery(onlyLate, nowUtc).OrderBy(r => r.IssueDate).Take(max).ToListAsync(ct);
        return rows.Select(r => ToDto(r, nowUtc)).ToList();
    }

    public Task<int> CountAsync(CancellationToken ct = default)
        => QueueQuery(_db).CountAsync(ct);

    /// <summary>Hoá đơn bán ra đã phát hành, chưa huỷ, chưa có HĐĐT ở trạng thái đã xong.</summary>
    internal static IQueryable<Domain.Invoice> QueueQuery(AccountingDbContext db) =>
        db.Invoices.AsNoTracking().Where(i =>
            i.Type == Domain.InvoiceType.Receivable
            && i.Status != Domain.InvoiceStatus.Draft
            && i.Status != Domain.InvoiceStatus.Cancelled
            && (i.EInvoiceStatus == null || !EInvoiceStatuses.Settled.Contains(i.EInvoiceStatus)));

    private IQueryable<QueueRow> BuildQuery(bool onlyLate, DateTime nowUtc)
    {
        var query = QueueQuery(_db);
        if (onlyLate)
        {
            var cutoff = nowUtc.AddDays(-_options.QueueWarningDays);
            query = query.Where(i => i.IssueDate <= cutoff);
        }

        return query.Select(i => new QueueRow(
            i.Id, i.InvoiceNumber, i.OrderId, i.OrderNumber, i.IssueDate,
            i.TotalAmount, i.SubTotal, i.VatAmount,
            i.BuyerLegalName, i.BuyerFullName, i.BuyerTaxCode, i.BuyerBudgetUnitCode,
            i.BuyerAddress, i.EInvoiceStatus));
    }

    private EInvoiceQueueItemDto ToDto(QueueRow r, DateTime nowUtc)
    {
        var buyer = new EInvoiceBuyer(null, r.BuyerLegalName, r.BuyerFullName, r.BuyerTaxCode,
            r.BuyerBudgetUnitCode, r.BuyerAddress, null, null);
        var age = (int)Math.Floor((nowUtc - r.IssueDate).TotalDays);

        return new EInvoiceQueueItemDto(
            r.Id, r.InvoiceNumber, r.OrderId, r.OrderNumber, r.IssueDate,
            r.TotalAmount, r.SubTotal, r.VatAmount,
            buyer.DisplayName, r.BuyerTaxCode, r.BuyerAddress, buyer.IsConsumer,
            r.EInvoiceStatus ?? EInvoiceStatuses.NotIssued,
            age, age >= _options.QueueWarningDays);
    }

    private sealed record QueueRow(
        Guid Id, string InvoiceNumber, Guid? OrderId, string? OrderNumber, DateTime IssueDate,
        decimal TotalAmount, decimal SubTotal, decimal VatAmount,
        string? BuyerLegalName, string? BuyerFullName, string? BuyerTaxCode,
        string? BuyerBudgetUnitCode, string? BuyerAddress, string? EInvoiceStatus);
}
