using BuildingBlocks.Messaging.IntegrationEvents;
using CRM.Domain;
using CRM.Infrastructure;
using CRM.Services;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CRM.Consumers;

/// <summary>
/// W2-8 step 4: tạo <see cref="CustomerAnalytics"/> ngay khi một tài khoản mới đăng ký, thay vì
/// đợi tới lần chạy RFM đêm 02:00 UTC. Trước đó, một khách vừa đăng ký không xuất hiện trong
/// Customer 360 cho tới khi họ có đơn hàng VÀ batch đêm chạy - có thể trễ tới 24h.
///
/// Idempotent: nếu bản ghi đã tồn tại (ví dụ message được redeliver), bỏ qua.
///
/// NOTE (đã ghi vào integration-requests-w2.md): consumer này chỉ được MassTransit nhận diện khi
/// ApiGateway gọi `x.AddConsumers(typeof(CRM.DependencyInjection).Assembly)` trong
/// ServiceRegistration.cs — dòng đó hiện CHƯA có (chỉ có Communication/Sales/Accounting/Warranty/
/// Identity). Ngoài phạm vi sở hữu của track này (backend/Services/CRM/** only).
/// </summary>
public class CustomerRegisteredAnalyticsConsumer(CrmDbContext crmDb, ILogger<CustomerRegisteredAnalyticsConsumer> logger)
    : IConsumer<UserRegisteredIntegrationEvent>
{
    public async Task Consume(ConsumeContext<UserRegisteredIntegrationEvent> context)
    {
        var message = context.Message;

        var exists = await crmDb.CustomerAnalytics.AnyAsync(c => c.UserId == message.UserId);
        if (exists)
        {
            logger.LogDebug("CustomerAnalytics already exists for user {UserId}, skipping", message.UserId);
            return;
        }

        crmDb.CustomerAnalytics.Add(new CustomerAnalytics(message.UserId));
        await crmDb.SaveChangesAsync();

        logger.LogInformation("Created CustomerAnalytics for newly registered user {UserId}", message.UserId);
    }
}

/// <summary>
/// W2-8 step 4: khi một đơn hàng hoàn tất, tính lại RFM của riêng khách hàng đó ngay (không đợi
/// batch đêm) — Customer 360 phản ánh đơn hàng vừa xong trong vòng vài giây thay vì tối đa 24h.
/// </summary>
public class OrderCompletedRfmConsumer(IRfmCalculationService rfmService, ILogger<OrderCompletedRfmConsumer> logger)
    : IConsumer<OrderCompletedEvent>
{
    public async Task Consume(ConsumeContext<OrderCompletedEvent> context)
    {
        var message = context.Message;

        await rfmService.CalculateForCustomerAsync(message.CustomerId, context.CancellationToken);

        logger.LogInformation(
            "Recalculated RFM for customer {CustomerId} after order {OrderId} completed",
            message.CustomerId, message.OrderId);
    }
}
