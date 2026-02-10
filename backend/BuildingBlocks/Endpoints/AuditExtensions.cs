using BuildingBlocks.Messaging.IntegrationEvents;
using MassTransit;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using System.Security.Claims;

namespace BuildingBlocks.Endpoints;

public static class AuditExtensions
{
    public static async Task LogAuditAsync(
        this HttpContext context,
        string action,
        string entityName,
        string entityId,
        string details)
    {
        var publishEndpoint = context.RequestServices.GetService<IPublishEndpoint>();
        if (publishEndpoint == null) return;

        var userId = context.User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? "anonymous";
        var ipAddress = context.Connection.RemoteIpAddress?.ToString();
        var userAgent = context.Request.Headers["User-Agent"].ToString();

        await publishEndpoint.Publish(new AuditLogIntegrationEvent(
            UserId: userId,
            Action: action,
            EntityName: entityName,
            EntityId: entityId,
            Details: details,
            IpAddress: ipAddress,
            UserAgent: userAgent,
            RequestPath: context.Request.Path,
            RequestMethod: context.Request.Method
        ));
    }
}
