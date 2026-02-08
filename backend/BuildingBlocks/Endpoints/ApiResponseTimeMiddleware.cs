using System.Diagnostics;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace BuildingBlocks.Endpoints;

/// <summary>
/// Middleware to track API response times and log slow requests
/// </summary>
public class ApiResponseTimeMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ApiResponseTimeMiddleware> _logger;
    private const int SlowRequestThresholdMs = 1000; // 1 second

    public ApiResponseTimeMiddleware(RequestDelegate next, ILogger<ApiResponseTimeMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            await _next(context);
        }
        finally
        {
            stopwatch.Stop();
            var elapsedMs = stopwatch.ElapsedMilliseconds;
            
            // Add response header with timing information
            context.Response.Headers.Add("X-Response-Time-Ms", elapsedMs.ToString());
            
            // Log slow requests
            if (elapsedMs > SlowRequestThresholdMs)
            {
                _logger.LogWarning(
                    "Slow API Request: {Method}{Path} took {ElapsedMs}ms (Status: {StatusCode})",
                    context.Request.Method,
                    context.Request.Path,
                    elapsedMs,
                    context.Response.StatusCode);
            }
            else
            {
                _logger.LogInformation(
                    "API Request: {Method}{Path} took {ElapsedMs}ms (Status: {StatusCode})",
                    context.Request.Method,
                    context.Request.Path,
                    elapsedMs,
                    context.Response.StatusCode);
            }
        }
    }
}

/// <summary>
/// Extension method to register response time middleware
/// </summary>
public static class ApiResponseTimeMiddlewareExtensions
{
    public static IApplicationBuilder UseApiResponseTime(this IApplicationBuilder app)
    {
        return app.UseMiddleware<ApiResponseTimeMiddleware>();
    }
}
