using BuildingBlocks.Messaging.IntegrationEvents;
using MassTransit;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using System.Security.Claims;

namespace BuildingBlocks.Endpoints;

public static class AuditExtensions
{
    /// <summary>
    /// Log audit with basic details
    /// </summary>
    public static async Task LogAuditAsync(
        this HttpContext context,
        string action,
        string entityName,
        string entityId,
        string details)
    {
        await context.LogAuditAsync(action, entityName, entityId, details, module: null);
    }

    /// <summary>
    /// Log audit with module and optional old/new values for detailed change tracking
    /// </summary>
    public static async Task LogAuditAsync(
        this HttpContext context,
        string action,
        string entityName,
        string entityId,
        string details,
        string? module = null,
        string? oldValues = null,
        string? newValues = null)
    {
        var publishEndpoint = context.RequestServices.GetService<IPublishEndpoint>();
        if (publishEndpoint == null) return;

        var userId = context.User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? "anonymous";
        var userName = context.User?.FindFirstValue(ClaimTypes.Name) 
            ?? context.User?.FindFirstValue("FullName")
            ?? context.User?.FindFirstValue(ClaimTypes.Email)
            ?? "anonymous";
        var ipAddress = context.Connection.RemoteIpAddress?.ToString();
        var userAgent = context.Request.Headers["User-Agent"].ToString();

        await publishEndpoint.Publish(new AuditLogIntegrationEvent(
            UserId: userId,
            Action: action,
            EntityName: entityName,
            EntityId: entityId,
            Details: details,
            Module: module,
            UserName: userName,
            OldValues: oldValues,
            NewValues: newValues,
            IpAddress: ipAddress,
            UserAgent: userAgent,
            RequestPath: context.Request.Path,
            RequestMethod: context.Request.Method
        ));
    }
}

