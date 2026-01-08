using BuildingBlocks.Messaging.IntegrationEvents;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure;
using Microsoft.Extensions.Logging;

namespace Sales.Application.Consumers;

public class OrderPaidConsumer : IConsumer<PaymentSucceededEvent>
{
    private readonly SalesDbContext _dbContext;
    private readonly ILogger<OrderPaidConsumer> _logger;

    private readonly IPublishEndpoint _publishEndpoint;

    public OrderPaidConsumer(SalesDbContext dbContext, ILogger<OrderPaidConsumer> logger, IPublishEndpoint publishEndpoint)
    {
        _dbContext = dbContext;
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
            await _dbContext.SaveChangesAsync();
            
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
}
