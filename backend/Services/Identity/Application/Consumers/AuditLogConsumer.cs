using BuildingBlocks.Messaging.IntegrationEvents;
using Identity.Infrastructure;
using MassTransit;
using Microsoft.Extensions.Logging;

namespace Identity.Application.Consumers;

public class AuditLogConsumer : IConsumer<AuditLogIntegrationEvent>
{
    private readonly IdentityDbContext _dbContext;
    private readonly ILogger<AuditLogConsumer> _logger;

    public AuditLogConsumer(IdentityDbContext dbContext, ILogger<AuditLogConsumer> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<AuditLogIntegrationEvent> context)
    {
        var message = context.Message;
        _logger.LogInformation("Consuming AuditLogIntegrationEvent for Action: {Action}, Entity: {EntityName}", message.Action, message.EntityName);

        var auditLog = new AuditLog
        {
            UserId = message.UserId,
            Action = message.Action,
            EntityName = message.EntityName,
            EntityId = message.EntityId,
            Details = message.Details,
            Timestamp = DateTime.UtcNow,
            IpAddress = message.IpAddress,
            UserAgent = message.UserAgent,
            RequestPath = message.RequestPath,
            RequestMethod = message.RequestMethod
        };

        _dbContext.AuditLogs.Add(auditLog);
        await _dbContext.SaveChangesAsync();
    }
}
