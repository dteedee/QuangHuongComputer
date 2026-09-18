using BuildingBlocks.Endpoints;
using BuildingBlocks.Messaging.IntegrationEvents;
using Catalog.Infrastructure;
using InventoryModule.Infrastructure;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Sales.Application.Inventory;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Application.Orders;

/// <summary>
/// W2-23 — BÊN GHI DUY NHẤT của vòng đời đơn hàng sau khi đơn đã được tạo.
///
/// Trước track này: `MarkAsPaid` không có đường nào gọi tới, `PaymentStatus` không bao giờ thành
/// Paid, mỗi endpoint tự ghi <c>OrderHistories</c> một kiểu (hoặc quên ghi), và không chỗ nào phát
/// <c>OrderShipped</c>/<c>OrderDelivered</c>. Ở đây: một bước = đổi trạng thái qua
/// <see cref="OrderStateMachine"/> + ghi lịch sử + phát sự kiện, trong đúng một giao dịch.
///
/// KHÔNG nhận số tiền hay đơn giá từ client ở bất kỳ bước nào (phase-72 "Security Considerations");
/// số tiền thu là dữ liệu đối soát, luôn so với <c>Order.TotalAmount</c> đã đóng băng.
/// </summary>
public class OrderLifecycleService
{
    private readonly SalesDbContext _db;
    private readonly InventoryDbContext _inventoryDb;
    private readonly CatalogDbContext _catalogDb;
    private readonly InventoryReservationService _reservations;
    private readonly IPublishEndpoint _publish;
    private readonly ILogger<OrderLifecycleService> _logger;

    public OrderLifecycleService(
        SalesDbContext db,
        InventoryDbContext inventoryDb,
        CatalogDbContext catalogDb,
        InventoryReservationService reservations,
        IPublishEndpoint publish,
        ILogger<OrderLifecycleService> logger)
    {
        _db = db;
        _inventoryDb = inventoryDb;
        _catalogDb = catalogDb;
        _reservations = reservations;
        _publish = publish;
        _logger = logger;
    }

    public async Task<Order> LoadAsync(Guid orderId, CancellationToken ct = default)
        => await _db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == orderId, ct)
           ?? throw NotFoundException.For("đơn hàng", orderId);

    /// <summary>Tổng tiền ĐÃ THU của đơn (bỏ các dòng đã đảo).</summary>
    public async Task<decimal> CollectedAsync(Guid orderId, CancellationToken ct = default)
        => await _db.OrderPayments
            .Where(p => p.OrderId == orderId && !p.IsReversed)
            .SumAsync(p => (decimal?)p.Amount, ct) ?? 0m;

    /// <summary>
    /// Chuyển đơn sang <paramref name="to"/> theo bảng chuyển trạng thái. Bước nhảy sai → 409.
    /// Đây là hàm mà endpoint `POST /admin/orders/{id}/transitions` gọi.
    /// </summary>
    public async Task<Order> TransitionAsync(
        Guid orderId, OrderStatus to, string actor, string? reason,
        string? trackingNumber = null, string? carrier = null, CancellationToken ct = default)
    {
        var order = await LoadAsync(orderId, ct);
        var from = order.Status;

        switch (to)
        {
            case OrderStatus.Confirmed: order.Confirm(); break;
            case OrderStatus.Fulfilled: order.MarkAsFulfilled(); break;
            case OrderStatus.Shipped: order.MarkAsShipped(trackingNumber ?? "", carrier ?? ""); break;
            case OrderStatus.Delivered: order.MarkAsDelivered(); break;
            case OrderStatus.Completed: order.MarkAsCompleted(); break;
            case OrderStatus.Cancelled:
                await CancelAsync(orderId, reason ?? "Không có lý do", actor, ct);
                return await LoadAsync(orderId, ct);
            default:
                throw new ConflictException(
                    $"Không hỗ trợ chuyển thẳng sang trạng thái {OrderStateMachine.Vi(to)}.");
        }

        if (order.Status == from && order.FulfillmentStatus != FulfillmentStatus.Fulfilled)
            return order; // no-op idempotent

        Record(order, from, reason ?? $"Chuyển sang {OrderStateMachine.Vi(order.Status)}", actor);
        await _db.SaveChangesAsync(ct);

        await OrderEventPublisher.PublishForStatusAsync(_publish, _inventoryDb, order, ct);
        return order;
    }

    /// <summary>
    /// GHI NHẬN MỘT LẦN THU TIỀN — lối vào duy nhất của "tiền đã về" cho mọi kênh (COD, chuyển
    /// khoản, webhook cổng, trả góp, thu công nợ). Idempotent theo <paramref name="reference"/>.
    /// Thu chưa đủ → <c>PartiallyPaid</c>, KHÔNG phát <c>InvoiceRequested</c> (D07 §5, Đ9.2:
    /// đặt cọc không phải thời điểm lập hoá đơn).
    /// </summary>
    public async Task<(Order Order, decimal Collected, decimal Due)> RecordTenderAsync(
        Guid orderId, PaymentTenderMethod method, decimal amount, string reference,
        string actor, decimal tenderedAmount = 0m, Guid? shiftId = null, CancellationToken ct = default)
    {
        if (amount <= 0m) throw new DomainException("Số tiền thu phải lớn hơn 0.");

        var order = await LoadAsync(orderId, ct);
        if (order.Status == OrderStatus.Cancelled)
            throw new ConflictException("Đơn đã huỷ — không ghi nhận thu tiền được.");

        // Idempotent theo mã đối soát: webhook/IPN của cổng thanh toán được phép gửi lại.
        var already = !string.IsNullOrWhiteSpace(reference)
            && await _db.OrderPayments.AnyAsync(
                p => p.OrderId == orderId && p.Reference == reference && !p.IsReversed, ct);

        if (!already)
        {
            _db.OrderPayments.Add(new OrderPayment(
                orderId, method, amount, tenderedAmount, reference, shiftId, actor));
        }

        var collected = await CollectedAsync(orderId, ct) + (already ? 0m : amount);
        var due = OrderStateMachine.AmountDue(order, collected);
        var from = order.Status;

        if (due <= 0m) order.MarkAsPaid(reference);
        else order.MarkAsPartiallyPaid();

        Record(order, from,
            due <= 0m
                ? $"Thu đủ {collected:#,##0}đ ({method}) — {OrderLifecycleMarkers.Tender(reference)}"
                : $"Thu {amount:#,##0}đ ({method}), còn thiếu {due:#,##0}đ — {OrderLifecycleMarkers.Tender(reference)}",
            actor);

        await _db.SaveChangesAsync(ct);

        if (due <= 0m) await OrderEventPublisher.PublishForStatusAsync(_publish, _inventoryDb, order, ct);
        return (order, collected, due);
    }

    /// <summary>
    /// Huỷ đơn: nhả/nhập lại tồn, và mở việc hoàn tiền nếu đã thu tiền.
    /// IR w2#4 + #8 — nhả qua <see cref="InventoryReservationService"/> thay vì cộng tay tồn kho.
    /// </summary>
    public async Task<Order> CancelAsync(
        Guid orderId, string reason, string actor, CancellationToken ct = default)
    {
        var order = await LoadAsync(orderId, ct);
        if (order.Status == OrderStatus.Cancelled) return order;

        var from = order.Status;
        order.Cancel(reason);

        // 1) Giữ chỗ còn treo (đơn chưa commit tồn) — nhả qua một điểm duy nhất.
        await _reservations.ReleaseAsync(orderId.ToString(), $"Huỷ đơn: {reason}", ct);

        // 2) Tồn đã bị trừ thật lúc chốt đơn (CheckoutOrchestrator commit giữ chỗ ngay) nên nhả
        //    giữ chỗ KHÔNG đủ: phải nhập lại đúng số lượng của từng dòng đơn.
        var productIds = order.Items.Select(i => i.ProductId).ToList();
        var inventoryItems = await _inventoryDb.InventoryItems
            .Where(i => productIds.Contains(i.ProductId)).ToListAsync(ct);
        var products = await _catalogDb.Products
            .Where(p => productIds.Contains(p.Id)).ToListAsync(ct);

        foreach (var item in order.Items)
        {
            inventoryItems.FirstOrDefault(i => i.ProductId == item.ProductId)
                ?.AdjustStock(item.Quantity, $"Nhập lại từ đơn huỷ {order.OrderNumber}");
            products.FirstOrDefault(p => p.Id == item.ProductId)?.UpdateStock(item.Quantity);
        }

        // 3) Đã thu tiền thì huỷ đơn KHÔNG tự hoàn tiền — mở việc hoàn tiền cho Payments (W2-4).
        var collected = await CollectedAsync(orderId, ct);
        Record(order, from,
            collected > 0m
                ? $"Huỷ đơn: {reason}. Đã thu {collected:#,##0}đ {OrderLifecycleMarkers.RefundTask}"
                : $"Huỷ đơn: {reason}",
            actor);

        await _inventoryDb.SaveChangesAsync(ct);
        await _catalogDb.SaveChangesAsync(ct);
        await _db.SaveChangesAsync(ct);

        await _publish.Publish(new OrderCancelledEvent(
            order.Id, order.CustomerId, order.OrderNumber, reason, DateTime.UtcNow), ct);

        if (collected > 0m)
        {
            await _publish.Publish(new RefundRequestedEvent(
                Guid.NewGuid(), order.Id, order.CustomerId, collected,
                $"Huỷ đơn {order.OrderNumber}: {reason}", DateTime.UtcNow), ct);
            _logger.LogWarning(
                "Đơn {OrderId} huỷ khi đã thu {Collected} — đã mở yêu cầu hoàn tiền", order.Id, collected);
        }

        return order;
    }

    private void Record(Order order, OrderStatus from, string note, string actor)
        => _db.OrderHistories.Add(new OrderHistory(order.Id, from, order.Status, actor, note));
}
