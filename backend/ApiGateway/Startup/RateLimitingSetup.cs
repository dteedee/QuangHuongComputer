using System.Threading.RateLimiting;

namespace ApiGateway.Startup;

/// <summary>
/// Sliding-window rate limiter partitioned by remote IP.
/// Extracted from <see cref="ServiceRegistration"/> to keep it under the 200-line budget.
/// </summary>
public static class RateLimitingSetup
{
    public static void Register(WebApplicationBuilder builder)
    {
        builder.Services.AddRateLimiter(options =>
        {
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
                RateLimitPartition.GetSlidingWindowLimiter(
                    partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
                    factory: _ => new SlidingWindowRateLimiterOptions
                    {
                        PermitLimit = int.Parse(builder.Configuration["RateLimiting:PermitLimit"] ?? "100"),
                        Window = TimeSpan.FromSeconds(int.Parse(builder.Configuration["RateLimiting:WindowInSeconds"] ?? "60")),
                        SegmentsPerWindow = 2,
                        QueueLimit = 10,
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst
                    }));

            options.OnRejected = async (context, cancellationToken) =>
            {
                if (!context.HttpContext.Response.HasStarted)
                {
                    context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                    context.HttpContext.Response.Headers.TryAdd("Retry-After", "60");
                    await context.HttpContext.Response.WriteAsJsonAsync(new
                    {
                        error = "Too many requests. Please try again later.",
                        retryAfter = 60
                    }, cancellationToken);
                }
            };
        });
    }
}
