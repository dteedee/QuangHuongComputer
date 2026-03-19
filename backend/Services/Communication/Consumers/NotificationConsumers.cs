using BuildingBlocks.Messaging.IntegrationEvents;
using BuildingBlocks.Security;
using Communication.Domain;
using Communication.Services;
using MassTransit;
using Microsoft.Extensions.Logging;

namespace Communication.Consumers;

/// <summary>
/// Consumer for OrderCreated events - sends notification to Admin, Sale, Manager
/// </summary>
public class OrderCreatedNotificationConsumer : IConsumer<OrderCreatedIntegrationEvent>
{
    private readonly INotificationService _notificationService;
    private readonly ILogger<OrderCreatedNotificationConsumer> _logger;

    public OrderCreatedNotificationConsumer(
        INotificationService notificationService,
        ILogger<OrderCreatedNotificationConsumer> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<OrderCreatedIntegrationEvent> context)
    {
        var message = context.Message;
        _logger.LogInformation("Sending notification for new order {OrderNumber}", message.OrderNumber);

        await _notificationService.SendToRolesAsync(
            new[] { Roles.Admin, Roles.Sale, Roles.Manager },
            new CreateNotificationDto
            {
                Type = NotificationType.OrderCreated,
                Title = "Đơn hàng mới",
                Message = $"Đơn hàng #{message.OrderNumber} - {message.TotalAmount:N0} VND",
                Link = $"/backoffice/orders?search={message.OrderNumber}",
                Priority = "high",
                ReferenceId = message.OrderId.ToString()
            });
    }
}

/// <summary>
/// Consumer for PaymentSucceeded events - sends notification to Admin, Sale, Accountant
/// </summary>
public class PaymentSucceededNotificationConsumer : IConsumer<PaymentSucceededEvent>
{
    private readonly INotificationService _notificationService;
    private readonly ILogger<PaymentSucceededNotificationConsumer> _logger;

    public PaymentSucceededNotificationConsumer(
        INotificationService notificationService,
        ILogger<PaymentSucceededNotificationConsumer> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<PaymentSucceededEvent> context)
    {
        var message = context.Message;
        _logger.LogInformation("Sending notification for payment succeeded {PaymentId}", message.PaymentId);

        await _notificationService.SendToRolesAsync(
            new[] { Roles.Admin, Roles.Sale, Roles.Accountant },
            new CreateNotificationDto
            {
                Type = NotificationType.PaymentReceived,
                Title = "Thanh toán thành công",
                Message = $"Đã nhận thanh toán {message.Amount:N0} VND cho đơn hàng",
                Link = $"/backoffice/orders?orderId={message.OrderId}",
                Priority = "high",
                ReferenceId = message.OrderId.ToString()
            });
    }
}

/// <summary>
/// Consumer for PaymentFailed events - sends notification to Admin, Sale, Accountant
/// </summary>
public class PaymentFailedNotificationConsumer : IConsumer<PaymentFailedEvent>
{
    private readonly INotificationService _notificationService;
    private readonly ILogger<PaymentFailedNotificationConsumer> _logger;

    public PaymentFailedNotificationConsumer(
        INotificationService notificationService,
        ILogger<PaymentFailedNotificationConsumer> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<PaymentFailedEvent> context)
    {
        var message = context.Message;
        _logger.LogInformation("Sending notification for payment failed {PaymentId}", message.PaymentId);

        await _notificationService.SendToRolesAsync(
            new[] { Roles.Admin, Roles.Sale, Roles.Accountant },
            new CreateNotificationDto
            {
                Type = NotificationType.PaymentFailed,
                Title = "Thanh toán thất bại",
                Message = $"Lỗi thanh toán: {message.Reason}",
                Link = $"/backoffice/orders?orderId={message.OrderId}",
                Priority = "high",
                ReferenceId = message.OrderId.ToString()
            });
    }
}
