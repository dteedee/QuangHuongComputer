using BuildingBlocks.Messaging.IntegrationEvents;
using Content.Domain;
using Content.Infrastructure;
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
    private readonly ILogger<OrderPaidConsumer> _logger;

    private readonly IPublishEndpoint _publishEndpoint;

    public OrderPaidConsumer(
        SalesDbContext dbContext,
        ContentDbContext contentDb,
        ILogger<OrderPaidConsumer> logger,
        IPublishEndpoint publishEndpoint)
    {
        _dbContext = dbContext;
        _contentDb = contentDb;
        _logger = logger;
        _publishEndpoint = publishEndpoint;
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

        if (order.Status != OrderStatus.Paid && order.Status != OrderStatus.Cancelled)
        {
            order.SetStatus(OrderStatus.Paid);
            // Phase 04: chỉ tăng CurrentUsage của promotion khi đã Paid — sửa nợ Phase 01.
            //    Trước đây Coupon.Apply() tăng lúc tạo Order → mã cháy oan khi thanh toán fail.
            await IncrementPromotionUsageAsync(order, context.CancellationToken);
            await _dbContext.SaveChangesAsync();
            await _contentDb.SaveChangesAsync();
            
            // Trigger Invoice Creation
            await _publishEndpoint.Publish(new InvoiceRequestedEvent(
                order.Id,
                order.CustomerId,
                order.Items.Select(i => new InvoiceItemDto(i.ProductId, i.ProductName, i.Quantity, i.UnitPrice)).ToList(),
                order.TotalAmount
            ));

            // Mock Fulfillment & Warranty Registration
            var fulfilledItems = order.Items.Select(i => new FulfilledItemDto(
                i.ProductId, 
                i.Quantity, 
                Enumerable.Range(0, i.Quantity).Select(_ => $"SN-{Guid.NewGuid().ToString().Substring(0,8).ToUpper()}").ToList()
            )).ToList();

            await _publishEndpoint.Publish(new OrderFulfilledEvent(order.Id, order.CustomerId, fulfilledItems));

            _logger.LogInformation("Order {OrderId} marked as Paid, Invoice Requested, and Fulfilled", order.Id);
        }
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

    // Local snapshot shape (match AppliedPromotion trong IPricingEngine).
    private record AppliedPromotionSnapshot(
        Guid PromotionId, string Code, string Name,
        string DiscountType, decimal DiscountAmount, string AppliesTo);
}
