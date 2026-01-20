using Microsoft.AspNetCore.Http;

namespace BuildingBlocks.Endpoints;

public class AuditFilter : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        // Add audit information before executing endpoint
        var user = context.HttpContext.User;
        var userName = user?.Identity?.Name ?? "System";

        // Store in HttpContext for use in repositories
        context.HttpContext.Items["CurrentUser"] = userName;

        // Execute the endpoint
        var result = await next(context);

        return result;
    }
}

public class ValidationFilter<T> : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        // Get the DTO from arguments
        var dto = context.Arguments.OfType<T>().FirstOrDefault();
        if (dto == null)
        {
            return await next(context);
        }

        // Basic null checks can be added here
        // More complex validation should use IValidator

        return await next(context);
    }
}
