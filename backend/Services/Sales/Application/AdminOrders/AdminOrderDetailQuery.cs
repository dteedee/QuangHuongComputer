using Identity.Services;
using Microsoft.EntityFrameworkCore;
using Sales.Application.Orders;
using Sales.Infrastructure;

namespace Sales.Application.AdminOrders;

/// <summary>
/// Chi tiết một đơn cho trang quản trị: dòng hàng + SỔ THU TIỀN + lịch sử + các bước chuyển trạng
/// thái còn hợp lệ. Tách khỏi <c>AdminOrderQueries</c> (danh sách) để mỗi file dưới 200 dòng.
/// </summary>
public static partial class AdminOrderQueries
{
    public static async Task<object?> DetailAsync(
        SalesDbContext db, IUserDirectory directory, Guid id, CancellationToken ct)
    {
        var order = await db.Orders.AsNoTracking()
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order == null) return null;

        var payments = await db.OrderPayments.AsNoTracking()
            .Where(p => p.OrderId == id)
            .OrderBy(p => p.ReceivedAt)
            .Select(p => new
            {
                p.Id,
                Method = p.Method.ToString(),
                p.Amount,
                p.TenderedAmount,
                p.ChangeAmount,
                p.Reference,
                p.ShiftId,
                p.ReceivedBy,
                p.ReceivedAt,
                p.IsReversed,
            })
            .ToListAsync(ct);

        var history = await db.OrderHistories.AsNoTracking()
            .Where(h => h.OrderId == id)
            .OrderBy(h => h.CreatedAt)
            .Select(h => new { h.Id, h.FromStatus, h.ToStatus, h.ChangedBy, h.Notes, h.CreatedAt })
            .ToListAsync(ct);

        var accounts = await ResolveCustomersAsync(directory, new[] { order.CustomerId }, ct);
        accounts.TryGetValue(order.CustomerId.ToString(), out var account);

        var collected = payments.Where(p => !p.IsReversed).Sum(p => p.Amount);

        return new
        {
            order.Id,
            order.OrderNumber,
            Status = order.Status.ToString(),
            PaymentStatus = order.PaymentStatus.ToString(),
            FulfillmentStatus = order.FulfillmentStatus.ToString(),
            order.Channel,
            Customer = new
            {
                order.CustomerId,
                Name = account?.FullName ?? order.CustomerName ?? "Khách lẻ",
                Phone = account?.PhoneNumber ?? order.CustomerPhone,
                Email = account?.Email ?? order.CustomerEmail,
            },
            Money = new
            {
                order.SubtotalAmount,
                order.DiscountAmount,
                order.ShippingAmount,
                order.TaxAmount,
                order.TotalAmount,
                Collected = collected,
                AmountDue = OrderStateMachine.AmountDue(order, collected),
            },
            Shipping = new
            {
                order.ShippingAddress,
                order.IsPickup,
                order.PickupStoreName,
                order.DeliveryTrackingNumber,
                order.DeliveryCarrier,
            },
            Pos = new { order.StoreId, order.ShiftId, order.CashierId },
            Dates = new
            {
                order.OrderDate,
                order.ConfirmedAt,
                order.ShippedAt,
                order.DeliveredAt,
                order.PaidAt,
                order.CompletedAt,
                order.CancelledAt,
            },
            order.CancellationReason,
            order.Notes,
            order.InternalNotes,
            Items = order.Items.OrderBy(i => i.Sequence).Select(i => new
            {
                i.Id,
                i.ProductId,
                i.ProductName,
                i.ProductSku,
                i.VariantId,
                i.VariantName,
                i.UnitPrice,
                i.Quantity,
                i.DiscountAmount,
                i.LineTotal,
                i.VatRate,
                i.VatAmount,
                i.IsGift,
            }).ToList(),
            Payments = payments,
            History = history,
            AllowedTransitions = OrderStateMachine.AllowedNext(order.Status)
                .Select(s => new { value = s.ToString(), label = OrderStateMachine.Vi(s) }).ToList(),
        };
    }
}
