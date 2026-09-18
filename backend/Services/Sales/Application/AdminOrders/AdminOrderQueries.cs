using Identity.Services;
using Microsoft.EntityFrameworkCore;
using Sales.Application.Orders;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Application.AdminOrders;

/// <summary>
/// Truy vấn danh sách / chi tiết đơn cho trang quản trị (phase-48 bước 7).
///
/// Bản cũ trả về ENTITY THÔ (<c>Results.Ok(order)</c>): kèm cả <c>CustomerIp</c>,
/// <c>CustomerUserAgent</c>, <c>InternalNotes</c>, khối người mua, và không kèm sổ thu tiền hay
/// lịch sử — nghĩa là vừa lộ thừa vừa thiếu đúng thứ nhân viên cần. Ở đây là DTO tường minh.
///
/// Tên + số điện thoại khách lấy qua <see cref="IUserDirectory"/> trong MỘT lượt gọi cho cả
/// trang (<c>GetByIdsAsync</c>) — đúng lý do interface đó tồn tại: chặn N+1.
/// </summary>
public static partial class AdminOrderQueries
{
    public sealed record ListFilter(
        int Page,
        int PageSize,
        string? Search,
        string? Status,
        string? PaymentStatus,
        string? Channel,
        DateTime? From,
        DateTime? To);

    public static async Task<object> ListAsync(
        SalesDbContext db, IUserDirectory directory, ListFilter filter, CancellationToken ct)
    {
        var page = filter.Page < 1 ? 1 : filter.Page;
        var pageSize = Math.Clamp(filter.PageSize, 1, 100);

        var query = db.Orders.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var needle = filter.Search.Trim().ToLower();
            query = query.Where(o =>
                o.OrderNumber.ToLower().Contains(needle)
                || (o.CustomerName != null && o.CustomerName.ToLower().Contains(needle))
                || (o.CustomerEmail != null && o.CustomerEmail.ToLower().Contains(needle))
                || (o.CustomerPhone != null && o.CustomerPhone.Contains(needle)));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status) && filter.Status != "all"
            && Enum.TryParse<OrderStatus>(filter.Status, true, out var status))
            query = query.Where(o => o.Status == status);

        if (!string.IsNullOrWhiteSpace(filter.PaymentStatus) && filter.PaymentStatus != "all"
            && Enum.TryParse<PaymentStatus>(filter.PaymentStatus, true, out var paymentStatus))
            query = query.Where(o => o.PaymentStatus == paymentStatus);

        if (!string.IsNullOrWhiteSpace(filter.Channel) && filter.Channel != "all")
            query = query.Where(o => o.Channel == filter.Channel);

        if (filter.From.HasValue) query = query.Where(o => o.OrderDate >= filter.From.Value);
        if (filter.To.HasValue) query = query.Where(o => o.OrderDate <= filter.To.Value);

        var total = await query.CountAsync(ct);
        var rows = await query
            .OrderByDescending(o => o.OrderDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new
            {
                o.Id,
                o.OrderNumber,
                o.CustomerId,
                o.CustomerName,
                o.CustomerPhone,
                o.CustomerEmail,
                Status = o.Status.ToString(),
                PaymentStatus = o.PaymentStatus.ToString(),
                FulfillmentStatus = o.FulfillmentStatus.ToString(),
                o.Channel,
                o.TotalAmount,
                o.OrderDate,
                o.IsPickup,
                ItemCount = o.Items.Count,
                Collected = db.OrderPayments
                    .Where(p => p.OrderId == o.Id && !p.IsReversed)
                    .Sum(p => (decimal?)p.Amount) ?? 0m,
            })
            .ToListAsync(ct);

        var directoryEntries = await ResolveCustomersAsync(directory, rows.Select(r => r.CustomerId), ct);

        var orders = rows.Select(r =>
        {
            directoryEntries.TryGetValue(r.CustomerId.ToString(), out var account);
            return new
            {
                r.Id,
                r.OrderNumber,
                r.CustomerId,
                CustomerName = account?.FullName ?? r.CustomerName ?? "Khách lẻ",
                CustomerPhone = account?.PhoneNumber ?? r.CustomerPhone,
                CustomerEmail = account?.Email ?? r.CustomerEmail,
                r.Status,
                r.PaymentStatus,
                r.FulfillmentStatus,
                r.Channel,
                r.TotalAmount,
                r.Collected,
                AmountDue = r.TotalAmount - r.Collected < 0m ? 0m : r.TotalAmount - r.Collected,
                r.OrderDate,
                r.IsPickup,
                r.ItemCount,
            };
        }).ToList();

        return new { Total = total, Page = page, PageSize = pageSize, Orders = orders };
    }

    private static async Task<Dictionary<string, UserDirectoryEntry>> ResolveCustomersAsync(
        IUserDirectory directory, IEnumerable<Guid> customerIds, CancellationToken ct)
    {
        var ids = customerIds.Where(id => id != Guid.Empty).Distinct().Select(id => id.ToString()).ToList();
        if (ids.Count == 0) return new Dictionary<string, UserDirectoryEntry>();

        var entries = await directory.GetByIdsAsync(ids, ct);
        return entries.ToDictionary(e => e.Id, e => e);
    }
}
