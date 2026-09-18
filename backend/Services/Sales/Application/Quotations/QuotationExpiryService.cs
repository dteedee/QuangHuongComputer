using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Application.Quotations;

/// <summary>
/// Risk Assessment: "Expired needs a scheduler -> it reuses W2-10's existing order-timeout job",
/// KHÔNG có job riêng cho báo giá. Tại thời điểm triển khai track này (2026-09-18), grep repo
/// không thấy job hết hạn đơn nào của W2-10 (chỉ có <c>CheckoutSessionExpiryJob</c>, hết hạn PHIÊN
/// checkout — khác phạm vi). Method này là ĐIỂM GỌI sẵn sàng: khi job đó xuất hiện, nó chỉ cần gọi
/// <see cref="ExpireDueAsync"/> mỗi lượt quét (xem integration-requests-w2.md).
/// </summary>
internal static class QuotationExpiryService
{
    public static async Task<int> ExpireDueAsync(SalesDbContext salesDb, DateTime nowUtc, CancellationToken ct)
    {
        var due = await salesDb.Set<SalesQuotation>()
            .Where(q => q.IsActive
                && (q.Status == QuotationStatus.Sent || q.Status == QuotationStatus.Accepted)
                && q.ValidUntil != null && q.ValidUntil < nowUtc)
            .ToListAsync(ct);

        foreach (var quotation in due) quotation.Expire(nowUtc);

        if (due.Count > 0) await salesDb.SaveChangesAsync(ct);
        return due.Count;
    }
}
