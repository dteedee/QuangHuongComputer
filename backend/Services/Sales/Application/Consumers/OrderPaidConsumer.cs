using BuildingBlocks.Messaging.IntegrationEvents;
using Content.Domain;
using Content.Infrastructure;
using InventoryModule.Infrastructure;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace Sales.Application.Consumers;

public class OrderPaidConsumer : IConsumer<PaymentSucceededEvent>
{
    private readonly SalesDbContext _dbContext;
    private readonly ContentDbContext _contentDb;
    private readonly InventoryDbContext _inventoryDb;
    private readonly ILogger<OrderPaidConsumer> _logger;

    private readonly IPublishEndpoint _publishEndpoint;
    private readonly Catalog.Infrastructure.CatalogDbContext _catalogDb;
    private readonly Sales.Application.Inventory.InventoryReservationService _reservations;
    private readonly ILogger<Sales.Application.Orders.OrderLifecycleService> _lifecycleLogger;

    public OrderPaidConsumer(
        SalesDbContext dbContext,
        ContentDbContext contentDb,
        InventoryDbContext inventoryDb,
        ILogger<OrderPaidConsumer> logger,
        IPublishEndpoint publishEndpoint,
        Catalog.Infrastructure.CatalogDbContext catalogDb,
        Sales.Application.Inventory.InventoryReservationService reservations,
        ILogger<Sales.Application.Orders.OrderLifecycleService> lifecycleLogger)
    {
        _dbContext = dbContext;
        _contentDb = contentDb;
        _inventoryDb = inventoryDb;
        _logger = logger;
        _publishEndpoint = publishEndpoint;
        _catalogDb = catalogDb;
        _reservations = reservations;
        _lifecycleLogger = lifecycleLogger;
    }

    public async Task Consume(ConsumeContext<PaymentSucceededEvent> context)
    {
        _logger.LogInformation("Processing Payment Succeeded for Order {OrderId}", context.Message.OrderId);

        var order = await _dbContext.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == context.Message.OrderId);
        if (order == null)
        {
            _logger.LogWarning("Order {OrderId} not found for payment {PaymentId}", context.Message.OrderId, context.Message.PaymentId);
            return;
        }

        // W0-10 (1/3): đơn đã huỷ không bao giờ trở thành "đã trả".
        if (order.Status == OrderStatus.Cancelled)
        {
            _logger.LogWarning(
                "Bỏ qua PaymentSucceeded cho đơn ĐÃ HUỶ {OrderId} (payment {PaymentId}) — cần hoàn tiền thủ công",
                order.Id, context.Message.PaymentId);
            return;
        }

        // W0-10 (2/3): idempotent theo PaymentStatus, KHÔNG theo OrderStatus.
        // Trước đây điều kiện là `Status != Paid` nên một đơn đã Shipped/Delivered/Completed
        // vẫn lọt vào và bị `SetStatus(Paid)` kéo LÙI trạng thái.
        if (order.PaymentStatus == Sales.Domain.PaymentStatus.Paid)
        {
            _logger.LogInformation("Đơn {OrderId} đã ở PaymentStatus=Paid — bỏ qua (idempotent)", order.Id);
            return;
        }

        // W0-10 (3/3): số tiền cổng báo về phải khớp tổng tiền đơn. Lệch ⇒ KHÔNG tự xác nhận.
        if (context.Message.Amount != order.TotalAmount)
        {
            _logger.LogError(
                "LỆCH SỐ TIỀN: payment {PaymentId} báo {Paid} nhưng đơn {OrderId} là {Total} — giữ nguyên trạng thái, chờ đối soát tay",
                context.Message.PaymentId, context.Message.Amount, order.Id, order.TotalAmount);
            return;
        }

        // W2-23: mọi đường "tiền đã về" đi qua ĐÚNG MỘT lối vào — RecordTenderAsync — nên sổ thu
        // (OrderPayments) và OrderHistories luôn khớp trạng thái, và webhook gửi lại không ghi đúp.
        var lifecycle = new Sales.Application.Orders.OrderLifecycleService(
            _dbContext, _inventoryDb, _catalogDb, _reservations, _publishEndpoint, _lifecycleLogger);

        var (_, collected, due) = await lifecycle.RecordTenderAsync(
            order.Id,
            Sales.Domain.PaymentTenderMethod.Transfer,
            context.Message.Amount,
            context.Message.PaymentId.ToString(),
            actor: "payment-gateway",
            ct: context.CancellationToken);

        // Phase 04: chỉ tăng CurrentUsage của promotion khi đã Paid — sửa nợ Phase 01.
        //    Trước đây Coupon.Apply() tăng lúc tạo Order → mã cháy oan khi thanh toán fail.
        await IncrementPromotionUsageAsync(order, context.CancellationToken);
        await _dbContext.SaveChangesAsync();
        await _contentDb.SaveChangesAsync();

        // W2-23 / D07 §5 (NĐ 254/2026 Đ9.1): KHÔNG lập hoá đơn ở mốc thu tiền. Hoá đơn được neo
        // vào mốc BÀN GIAO và do OrderInvoiceTriggerConsumer phát, theo `EInvoice:IssueTrigger`.

        // Fulfillment thật: gán serial InStock thật từ kho (nếu sản phẩm có theo dõi serial) và đánh dấu đã bán.
        var fulfilledItems = await AllocateFulfilledItemsAsync(order, context.CancellationToken);

        await _publishEndpoint.Publish(new OrderFulfilledEvent(order.Id, order.CustomerId, fulfilledItems));

        _logger.LogInformation(
            "Đơn {OrderId}: đã thu {Collected}, còn thiếu {Due} (Status={Status}, PaymentStatus={PaymentStatus})",
            order.Id, collected, due, order.Status, order.PaymentStatus);
    }

    /// <summary>
    /// Parse Order.AppliedPromotionsJson → tăng CurrentUsage cho từng promotion.
    /// Silent fail nếu promotion không còn tồn tại (đã xoá) — không throw để không block flow paid.
    /// </summary>
    private async Task IncrementPromotionUsageAsync(Order order, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(order.AppliedPromotionsJson)) return;

        List<AppliedPromotionSnapshot>? snaps;
        try
        {
            snaps = JsonSerializer.Deserialize<List<AppliedPromotionSnapshot>>(order.AppliedPromotionsJson);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "AppliedPromotionsJson malformed cho order {OrderId}", order.Id);
            return;
        }
        if (snaps == null || snaps.Count == 0) return;

        var ids = snaps.Select(s => s.PromotionId).Distinct().ToList();
        var promos = await _contentDb.Promotions.Where(p => ids.Contains(p.Id)).ToListAsync(ct);
        foreach (var promo in promos)
        {
            try { promo.IncrementUsage(); }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Promotion {PromoId} không tăng usage được cho order {OrderId}",
                    promo.Id, order.Id);
            }
        }
    }

    /// <summary>
    /// Với mỗi dòng đơn hàng, lấy các SerialNumber còn InStock trong kho (nếu sản phẩm có theo dõi serial)
    /// và đánh dấu Sold gắn với đơn hàng. Sản phẩm không theo dõi serial → trả danh sách rỗng (không bịa serial).
    /// </summary>
    private async Task<List<FulfilledItemDto>> AllocateFulfilledItemsAsync(Order order, CancellationToken ct)
    {
        var result = new List<FulfilledItemDto>();

        foreach (var item in order.Items)
        {
            var availableSerials = await _inventoryDb.SerialNumbers
                .Where(s => s.ProductId == item.ProductId && s.Status == InventoryModule.Domain.SerialStatus.InStock)
                .Take(item.Quantity)
                .ToListAsync(ct);

            foreach (var serial in availableSerials)
            {
                serial.Sell(order.Id, order.CustomerId.ToString());
            }

            result.Add(new FulfilledItemDto(
                item.ProductId,
                item.Quantity,
                availableSerials.Select(s => s.Serial).ToList()));
        }

        if (result.Any(r => r.SerialNumbers.Count > 0))
        {
            await _inventoryDb.SaveChangesAsync(ct);
        }

        return result;
    }

    // Local snapshot shape (match AppliedPromotion trong IPricingEngine).
    private record AppliedPromotionSnapshot(
        Guid PromotionId, string Code, string Name,
        string DiscountType, decimal DiscountAmount, string AppliesTo);
}
