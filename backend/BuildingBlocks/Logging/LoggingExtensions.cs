using Serilog;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Http;
using System.Diagnostics;
using MicrosoftILogger = Microsoft.Extensions.Logging.ILogger;

namespace BuildingBlocks.Logging;

/// <summary>
/// Extension methods for structured logging
/// </summary>
public static class LoggingExtensions
{
    /// <summary>
    /// Add correlation ID to all log events
    /// </summary>
    public static IServiceProvider AddCorrelationId(this IServiceProvider services)
    {
        var httpContextAccessor = services.GetService<IHttpContextAccessor>();
        if (httpContextAccessor != null && httpContextAccessor.HttpContext != null)
        {
            var correlationId = httpContextAccessor.HttpContext.TraceIdentifier;
            Serilog.Context.LogContext.PushProperty("CorrelationId", correlationId);
        }
        
        return services;
    }

    /// <summary>
    /// Log user action with structured data
    /// </summary>
    public static void LogUserAction(
        this MicrosoftILogger logger,
        string action,
        string userId,
        string? details = null,
        Dictionary<string, object>? properties = null)
    {
        var logEvent = Serilog.Log.ForContext("Action", action)
            .ForContext("UserId", userId);
        
        if (details != null)
        {
            logEvent = logEvent.ForContext("Details", details);
        }
        
        if (properties != null)
        {
            foreach (var prop in properties)
            {
                logEvent = logEvent.ForContext(prop.Key, prop.Value);
            }
        }
        
        logEvent.Information("User action: {Action}", action);
    }

    /// <summary>
    /// Log error with context
    /// </summary>
    public static void LogError(
        this MicrosoftILogger logger,
        Exception exception,
        string message,
        Dictionary<string, object>? properties = null)
    {
        var logEvent = Serilog.Log.ForContext("SourceContext", logger.GetType().FullName);
        
        if (properties != null)
        {
            foreach (var prop in properties)
            {
                logEvent = logEvent.ForContext(prop.Key, prop.Value);
            }
        }
        
        logEvent.Error(exception, message);
    }

    /// <summary>
    /// Log warning with context
    /// </summary>
    public static void LogWarning(
        this MicrosoftILogger logger,
        string message,
        Dictionary<string, object>? properties = null)
    {
        var logEvent = Serilog.Log.ForContext("SourceContext", logger.GetType().FullName);
        
        if (properties != null)
        {
            foreach (var prop in properties)
            {
                logEvent = logEvent.ForContext(prop.Key, prop.Value);
            }
        }
        
        logEvent.Warning(message);
    }
}

/// <summary>
/// Middleware for correlation ID
/// </summary>
public class CorrelationIdMiddleware
{
    private readonly RequestDelegate _next;

    public CorrelationIdMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = context.TraceIdentifier;
        
        context.Response.OnStarting(() =>
        {
            context.Response.Headers.Append("X-Correlation-ID", correlationId);
            return Task.CompletedTask;
        });
        
        using (Serilog.Context.LogContext.PushProperty("CorrelationId", correlationId))
        {
            await _next(context);
        }
    }
}

/// <summary>
/// Middleware for request logging
/// </summary>
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly Serilog.ILogger _logger;

    public RequestLoggingMiddleware(RequestDelegate next)
    {
        _next = next;
        _logger = Serilog.Log.ForContext<RequestLoggingMiddleware>();
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        var request = context.Request;
        var response = context.Response;
        
        try
        {
            await _next(context);
            
            stopwatch.Stop();
            
            var logLevel = response.StatusCode >= 400 ? Serilog.Events.LogEventLevel.Warning : Serilog.Events.LogEventLevel.Information;
            
            _logger.Write(logLevel, 
                "HTTP {Method} {Path} responded {StatusCode} in {Elapsed:0.0000}ms",
                request.Method,
                request.Path,
                response.StatusCode,
                stopwatch.Elapsed.TotalMilliseconds);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            
            _logger.Error(ex,
                "HTTP {Method} {Path} failed after {Elapsed:0.0000}ms",
                request.Method,
                request.Path,
                stopwatch.Elapsed.TotalMilliseconds);
            
            throw;
        }
    }
}
