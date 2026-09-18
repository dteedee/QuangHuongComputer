using BuildingBlocks.Email;
using BuildingBlocks.Messaging.IntegrationEvents;
using Communication.Domain;
using Communication.Services;
using Identity.Services;
using MassTransit;
using Microsoft.Extensions.Logging;

namespace Communication.Consumers;

/// <summary>
/// W2-15: customer-facing notifications. Before this file, only 3 staff-facing consumers existed
/// (NotificationConsumers.cs) - a customer never heard about their own order, repair or warranty
/// event, in-app or by e-mail. Every consumer here resolves the customer's e-mail through
/// Identity.Services.IUserDirectory (the narrow, credential-free cross-module contract already
/// used by Sales/Reporting - NOT BuildingBlocks.Contracts.IUserDirectory, which is declared but
/// never registered in DI: Identity.DependencyInjection.cs:117 binds its own local interface,
/// so injecting the BuildingBlocks one would resolve to nothing at runtime. Filed as an IR) rather
/// than trusting an event field that may be absent, so the same code path works whether or not the
/// publishing event carries BuyerInvoiceInfo.
///
/// D08 note: the order-confirmation/shipping copy is supposed to carry a link to the exact policy
/// version the customer agreed to (return/warranty policy) and, on delivery, an "add company
/// invoice details" link. Neither a policy-version store nor that FE route exists yet anywhere in
/// the codebase (checked: no `/chinh-sach-bao-hanh-doi-tra` or invoice-details route in
/// frontend/src) - inventing a link would be a fabricated URL sent to a real customer inbox, so
/// this file omits it and flags it in the W2-15 report instead of faking it.
/// </summary>
public abstract class CustomerNotificationConsumerBase
{
    protected readonly INotificationService NotificationService;
    protected readonly IEmailSender EmailSender;
    protected readonly IUserDirectory UserDirectory;
    protected readonly ILogger Logger;

    protected CustomerNotificationConsumerBase(
        INotificationService notificationService,
        IEmailSender emailSender,
        IUserDirectory userDirectory,
        ILogger logger)
    {
        NotificationService = notificationService;
        EmailSender = emailSender;
        UserDirectory = userDirectory;
        Logger = logger;
    }

    /// <summary>Sends the in-app notification, then queues an e-mail if the customer has one on
    /// file. Never throws past this point - a missing/inactive customer must not fail the
    /// consumer and requeue the event.</summary>
    protected async Task NotifyCustomerAsync(
        Guid customerId,
        CreateNotificationDto notification,
        string emailSubject,
        Func<string, string> buildEmailBodyHtml,
        CancellationToken ct)
    {
        await NotificationService.SendToUserAsync(customerId, notification);

        try
        {
            var entries = await UserDirectory.GetByIdsAsync(new[] { customerId.ToString() }, ct);
            var customer = entries.FirstOrDefault();
            if (customer?.Email is { Length: > 0 } email)
            {
                await EmailSender.QueueAsync(new EmailMessage
                {
                    ToEmail = email,
                    Subject = emailSubject,
                    Body = buildEmailBodyHtml(customer.FullName),
                    IsHtml = true
                }, ct);
            }
            else
            {
                Logger.LogInformation(
                    "Customer {CustomerId} has no e-mail on file - in-app notification only", customerId);
            }
        }
        catch (Exception ex)
        {
            // Best-effort: the in-app notification above already succeeded.
            Logger.LogWarning(ex, "Failed to queue e-mail for customer {CustomerId}", customerId);
        }
    }
}

public class OrderShippedCustomerNotificationConsumer
    : CustomerNotificationConsumerBase, IConsumer<OrderShippedEvent>
{
    public OrderShippedCustomerNotificationConsumer(
        INotificationService notificationService, IEmailSender emailSender, IUserDirectory userDirectory,
        ILogger<OrderShippedCustomerNotificationConsumer> logger)
        : base(notificationService, emailSender, userDirectory, logger) { }

    public Task Consume(ConsumeContext<OrderShippedEvent> context)
    {
        var m = context.Message;
        var tracking = string.IsNullOrWhiteSpace(m.TrackingNumber) ? "" : $" (mã vận đơn: {m.TrackingNumber})";
        return NotifyCustomerAsync(
            m.CustomerId,
            new CreateNotificationDto
            {
                Type = NotificationType.OrderShipped,
                Title = "Đơn hàng đang giao",
                Message = $"Đơn hàng #{m.OrderNumber} đã được giao cho đơn vị vận chuyển{tracking}.",
                Link = $"/tai-khoan/don-hang/{m.OrderId}",
                Priority = "medium",
                ReferenceId = m.OrderId.ToString()
            },
            $"Đơn hàng #{m.OrderNumber} đang trên đường giao đến bạn",
            name => $"<p>Chào {System.Net.WebUtility.HtmlEncode(name)},</p>" +
                    $"<p>Đơn hàng <b>#{m.OrderNumber}</b> của bạn đã được giao cho đơn vị vận chuyển{tracking}.</p>" +
                    "<p>Quang Hường Computer</p>",
            context.CancellationToken);
    }
}

public class OrderDeliveredCustomerNotificationConsumer
    : CustomerNotificationConsumerBase, IConsumer<OrderDeliveredEvent>
{
    public OrderDeliveredCustomerNotificationConsumer(
        INotificationService notificationService, IEmailSender emailSender, IUserDirectory userDirectory,
        ILogger<OrderDeliveredCustomerNotificationConsumer> logger)
        : base(notificationService, emailSender, userDirectory, logger) { }

    public Task Consume(ConsumeContext<OrderDeliveredEvent> context)
    {
        var m = context.Message;
        return NotifyCustomerAsync(
            m.CustomerId,
            new CreateNotificationDto
            {
                Type = NotificationType.OrderDelivered,
                Title = "Đơn hàng đã giao thành công",
                Message = $"Đơn hàng #{m.OrderNumber} đã giao thành công. Cảm ơn bạn đã mua sắm tại Quang Hường Computer!",
                Link = $"/tai-khoan/don-hang/{m.OrderId}",
                Priority = "medium",
                ReferenceId = m.OrderId.ToString()
            },
            $"Đơn hàng #{m.OrderNumber} đã giao thành công",
            name => $"<p>Chào {System.Net.WebUtility.HtmlEncode(name)},</p>" +
                    $"<p>Đơn hàng <b>#{m.OrderNumber}</b> đã giao thành công. Cảm ơn bạn đã mua sắm tại Quang Hường Computer!</p>" +
                    "<p>Quang Hường Computer</p>",
            context.CancellationToken);
    }
}

public class OrderCancelledCustomerNotificationConsumer
    : CustomerNotificationConsumerBase, IConsumer<OrderCancelledEvent>
{
    public OrderCancelledCustomerNotificationConsumer(
        INotificationService notificationService, IEmailSender emailSender, IUserDirectory userDirectory,
        ILogger<OrderCancelledCustomerNotificationConsumer> logger)
        : base(notificationService, emailSender, userDirectory, logger) { }

    public Task Consume(ConsumeContext<OrderCancelledEvent> context)
    {
        var m = context.Message;
        return NotifyCustomerAsync(
            m.CustomerId,
            new CreateNotificationDto
            {
                Type = NotificationType.OrderCancelled,
                Title = "Đơn hàng đã bị huỷ",
                Message = $"Đơn hàng #{m.OrderNumber} đã bị huỷ. Lý do: {m.Reason}",
                Link = $"/tai-khoan/don-hang/{m.OrderId}",
                Priority = "high",
                ReferenceId = m.OrderId.ToString()
            },
            $"Đơn hàng #{m.OrderNumber} đã bị huỷ",
            name => $"<p>Chào {System.Net.WebUtility.HtmlEncode(name)},</p>" +
                    $"<p>Đơn hàng <b>#{m.OrderNumber}</b> đã bị huỷ.</p>" +
                    $"<p>Lý do: {System.Net.WebUtility.HtmlEncode(m.Reason)}</p>" +
                    "<p>Liên hệ chúng tôi nếu bạn cần hỗ trợ thêm. Quang Hường Computer</p>",
            context.CancellationToken);
    }
}

public class RepairCompletedCustomerNotificationConsumer
    : CustomerNotificationConsumerBase, IConsumer<RepairCompletedEvent>
{
    public RepairCompletedCustomerNotificationConsumer(
        INotificationService notificationService, IEmailSender emailSender, IUserDirectory userDirectory,
        ILogger<RepairCompletedCustomerNotificationConsumer> logger)
        : base(notificationService, emailSender, userDirectory, logger) { }

    public Task Consume(ConsumeContext<RepairCompletedEvent> context)
    {
        var m = context.Message;
        return NotifyCustomerAsync(
            m.CustomerId,
            new CreateNotificationDto
            {
                Type = NotificationType.RepairCompleted,
                Title = "Sửa chữa hoàn tất",
                Message = $"Thiết bị \"{m.DeviceDescription}\" đã sửa chữa xong. Chi phí: {m.FinalCost:N0} VNĐ.",
                Link = $"/tai-khoan/sua-chua/{m.BookingId}",
                Priority = "medium",
                ReferenceId = m.BookingId.ToString()
            },
            "Thiết bị của bạn đã sửa chữa xong",
            name => $"<p>Chào {System.Net.WebUtility.HtmlEncode(name)},</p>" +
                    $"<p>Thiết bị <b>{System.Net.WebUtility.HtmlEncode(m.DeviceDescription)}</b> đã sửa chữa xong.</p>" +
                    $"<p>Chi phí: {m.FinalCost:N0} VNĐ</p>" +
                    "<p>Quang Hường Computer</p>",
            context.CancellationToken);
    }
}

public class WarrantyClaimUpdatedCustomerNotificationConsumer
    : CustomerNotificationConsumerBase, IConsumer<WarrantyClaimUpdatedEvent>
{
    public WarrantyClaimUpdatedCustomerNotificationConsumer(
        INotificationService notificationService, IEmailSender emailSender, IUserDirectory userDirectory,
        ILogger<WarrantyClaimUpdatedCustomerNotificationConsumer> logger)
        : base(notificationService, emailSender, userDirectory, logger) { }

    public Task Consume(ConsumeContext<WarrantyClaimUpdatedEvent> context)
    {
        var m = context.Message;
        return NotifyCustomerAsync(
            m.CustomerId,
            new CreateNotificationDto
            {
                Type = NotificationType.WarrantyExpiring, // closest existing enum value for a claim status change
                Title = "Cập nhật bảo hành",
                Message = $"Yêu cầu bảo hành cho serial {m.SerialNumber} chuyển sang trạng thái: {m.NewStatus}.",
                Link = $"/tai-khoan/bao-hanh/{m.ClaimId}",
                Priority = "medium",
                ReferenceId = m.ClaimId.ToString()
            },
            "Cập nhật yêu cầu bảo hành của bạn",
            name => $"<p>Chào {System.Net.WebUtility.HtmlEncode(name)},</p>" +
                    $"<p>Yêu cầu bảo hành cho serial <b>{System.Net.WebUtility.HtmlEncode(m.SerialNumber)}</b> " +
                    $"chuyển sang trạng thái: <b>{System.Net.WebUtility.HtmlEncode(m.NewStatus)}</b>.</p>" +
                    "<p>Quang Hường Computer</p>",
            context.CancellationToken);
    }
}

/// <summary>Staff-facing: low stock is an operational alert, not a customer notification.</summary>
public class LowStockNotificationConsumer : IConsumer<LowStockEvent>
{
    private readonly INotificationService _notificationService;
    private readonly ILogger<LowStockNotificationConsumer> _logger;

    public LowStockNotificationConsumer(
        INotificationService notificationService, ILogger<LowStockNotificationConsumer> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<LowStockEvent> context)
    {
        var m = context.Message;
        _logger.LogInformation("Low stock alert for product {ProductId}", m.ProductId);

        await _notificationService.SendToRolesAsync(
            new[] { BuildingBlocks.Security.Roles.Admin, BuildingBlocks.Security.Roles.Manager },
            new CreateNotificationDto
            {
                Type = NotificationType.SystemAlert,
                Title = "Sắp hết hàng",
                Message = $"{m.ProductName} chỉ còn {m.QuantityOnHand} (ngưỡng cảnh báo: {m.Threshold}).",
                Link = $"/backoffice/inventory?productId={m.ProductId}",
                Priority = "high",
                ReferenceId = m.ProductId.ToString()
            });
    }
}
