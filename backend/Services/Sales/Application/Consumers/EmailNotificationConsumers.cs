using BuildingBlocks.Email;
using BuildingBlocks.Messaging.IntegrationEvents;
using Identity.Infrastructure;
using MassTransit;
using Microsoft.Extensions.Logging;
using Sales.Domain;
using Sales.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Sales.Application.Consumers;

public class OrderConfirmedEmailConsumer : IConsumer<OrderConfirmedDomainEvent>
{
    private readonly IEmailService _emailService;
    private readonly SalesDbContext _context;
    private readonly IdentityDbContext _identityDb;
    private readonly ILogger<OrderConfirmedEmailConsumer> _logger;

    public OrderConfirmedEmailConsumer(
        IEmailService emailService,
        SalesDbContext context,
        IdentityDbContext identityDb,
        ILogger<OrderConfirmedEmailConsumer> logger)
    {
        _emailService = emailService;
        _context = context;
        _identityDb = identityDb;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<OrderConfirmedDomainEvent> context)
    {
        try
        {
            var order = await _context.Orders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == context.Message.OrderId);

            if (order == null)
            {
                _logger.LogWarning("Order {OrderId} not found for email notification", context.Message.OrderId);
                return;
            }

            var (customerEmail, customerName) = await CustomerContactResolver.ResolveAsync(_identityDb, order.CustomerId);
            if (string.IsNullOrEmpty(customerEmail))
            {
                _logger.LogWarning("Không tìm thấy email khách hàng {CustomerId} cho đơn {OrderId}, bỏ qua gửi mail", order.CustomerId, order.Id);
                return;
            }

            await _emailService.SendOrderConfirmationAsync(
                customerEmail,
                customerName,
                order.OrderNumber,
                order.TotalAmount
            );

            _logger.LogInformation("Order confirmation email sent for order {OrderNumber}", order.OrderNumber);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send order confirmation email for order {OrderId}", context.Message.OrderId);
            // Don't throw - email failure shouldn't break the order flow
        }
    }
}

public class PaymentSuccessEmailConsumer : IConsumer<PaymentSucceededEvent>
{
    private readonly IEmailService _emailService;
    private readonly SalesDbContext _salesContext;
    private readonly IdentityDbContext _identityDb;
    private readonly ILogger<PaymentSuccessEmailConsumer> _logger;

    public PaymentSuccessEmailConsumer(
        IEmailService emailService,
        SalesDbContext salesContext,
        IdentityDbContext identityDb,
        ILogger<PaymentSuccessEmailConsumer> logger)
    {
        _emailService = emailService;
        _salesContext = salesContext;
        _identityDb = identityDb;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<PaymentSucceededEvent> context)
    {
        try
        {
            var order = await _salesContext.Orders
                .FirstOrDefaultAsync(o => o.Id == context.Message.OrderId);

            if (order == null)
            {
                _logger.LogWarning("Order {OrderId} not found for payment success email", context.Message.OrderId);
                return;
            }

            var (customerEmail, customerName) = await CustomerContactResolver.ResolveAsync(_identityDb, order.CustomerId);
            if (string.IsNullOrEmpty(customerEmail))
            {
                _logger.LogWarning("Không tìm thấy email khách hàng {CustomerId} cho đơn {OrderId}, bỏ qua gửi mail", order.CustomerId, order.Id);
                return;
            }
            var invoiceNumber = $"INV-{DateTime.UtcNow:yyyyMMdd}-{context.Message.PaymentId.ToString().Substring(0, 8).ToUpper()}";

            await _emailService.SendPaymentSuccessAsync(
                customerEmail,
                customerName,
                order.OrderNumber,
                invoiceNumber
            );

            _logger.LogInformation("Payment success email sent for order {OrderNumber}", order.OrderNumber);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send payment success email for order {OrderId}", context.Message.OrderId);
            // Don't throw - email failure shouldn't break the payment flow
        }
    }
}
