using System.Diagnostics;
using Microsoft.AspNetCore.Http;

namespace ApiGateway;

/// <summary>
/// Middleware for measuring API performance and logging
/// </summary>
public class PerformanceMonitoringMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<PerformanceMonitoringMiddleware> _logger;
    private const int SlowRequestThresholdMs = 1000; // Log requests slower than 1 second

    public PerformanceMonitoringMiddleware(RequestDelegate next, ILogger<PerformanceMonitoringMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            // Store request info for later use
            context.Items["RequestStartTime"] = DateTime.UtcNow;

            await _next(context);

            stopwatch.Stop();

            // Log slow requests
            if (stopwatch.ElapsedMilliseconds > SlowRequestThresholdMs)
            {
                _logger.LogWarning(
                    "Slow API Request: {Method} {Path} completed in {ElapsedMs}ms with status {StatusCode}",
                    context.Request.Method,
                    context.Request.Path,
                    stopwatch.ElapsedMilliseconds,
                    context.Response.StatusCode);
            }

            // Add performance headers only if response hasn't started
            if (!context.Response.HasStarted)
            {
                context.Response.Headers.TryAdd("X-Response-Time-Ms", stopwatch.ElapsedMilliseconds.ToString());
            }
        }
        catch (Exception ex)
        {
            stopwatch.Stop();

            _logger.LogError(
                ex,
                "API Request Failed: {Method}{Path} after {ElapsedMs}ms",
                context.Request.Method,
                context.Request.Path,
                stopwatch.ElapsedMilliseconds);

            throw;
        }
    }
}

/// <summary>
/// Middleware for request/response logging
/// </summary>
public class RequestResponseLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestResponseLoggingMiddleware> _logger;

    public RequestResponseLoggingMiddleware(RequestDelegate next, ILogger<RequestResponseLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Skip logging for health checks
        if (context.Request.Path.StartsWithSegments("/health"))
        {
            await _next(context);
            return;
        }

        // Log request
        _logger.LogInformation(
            "HTTP Request: {Method} {Path} from {RemoteIp}",
            context.Request.Method,
            context.Request.Path,
            context.Connection.RemoteIpAddress);

        // Capture response status code
        var originalBodyStream = context.Response.Body;
        using (var responseBody = new MemoryStream())
        {
            context.Response.Body = responseBody;

            try
            {
                await _next(context);

                // Log response
                _logger.LogInformation(
                    "HTTP Response: {Method}{Path} returned {StatusCode}",
                    context.Request.Method,
                    context.Request.Path,
                    context.Response.StatusCode);

                await responseBody.CopyToAsync(originalBodyStream);
            }
            finally
            {
                context.Response.Body = originalBodyStream;
            }
        }
    }
}

/// <summary>
/// Middleware for adding security headers
/// </summary>
public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Add security headers only if response hasn't started
        if (!context.Response.HasStarted)
        {
            context.Response.Headers.TryAdd("X-Content-Type-Options", "nosniff");
            context.Response.Headers.TryAdd("X-Frame-Options", "SAMEORIGIN");
            context.Response.Headers.TryAdd("X-XSS-Protection", "1; mode=block");
            context.Response.Headers.TryAdd("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
            
            // Required for Google Login popup to communicate back to the main window
            context.Response.Headers.TryAdd("Cross-Origin-Opener-Policy", "same-origin-allow-popups");

            // Referrer Policy - Limit information sent in Referer header
            context.Response.Headers.TryAdd("Referrer-Policy", "strict-origin-when-cross-origin");

            // Permissions Policy - Restrict browser features
            context.Response.Headers.TryAdd("Permissions-Policy",
                "camera=(), microphone=(), geolocation=(self), payment=(self)");
            
            // Comprehensive CSP for Google OAuth and common assets
            // Note: 'unsafe-inline' is required for Google OAuth popup communication
            // Consider implementing nonce-based CSP for stricter security in production
            var cspDirectives = new[]
            {
                "default-src 'self'",
                // Scripts: Allow Google OAuth scripts. 'unsafe-inline' needed for OAuth popup
                "script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com https://www.gstatic.com https://www.google.com https://connect.facebook.net",
                // Frames: Allow OAuth popups
                "frame-src 'self' https://accounts.google.com https://www.google.com https://www.facebook.com",
                // API connections
                "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://graph.facebook.com wss: ws:",
                // Styles: 'unsafe-inline' for dynamic styles
                "style-src 'self' 'unsafe-inline' https://accounts.google.com https://fonts.googleapis.com",
                // Images: Allow OAuth provider avatars and data URIs
                "img-src 'self' data: blob: https://lh3.googleusercontent.com https://www.google.com https://platform-lookaside.fbsbx.com https://res.cloudinary.com https://*.cloudinary.com",
                // Fonts
                "font-src 'self' data: https://fonts.gstatic.com",
                // Object/embed: Block all
                "object-src 'none'",
                // Base URI restriction
                "base-uri 'self'",
                // Form action restriction
                "form-action 'self' https://accounts.google.com https://www.facebook.com",
                // Upgrade insecure requests in production
                "upgrade-insecure-requests"
            };

            context.Response.Headers.TryAdd("Content-Security-Policy", string.Join("; ", cspDirectives));
        }

        await _next(context);
    }
}

/// <summary>
/// Extension methods for registering middleware
/// </summary>
public static class MiddlewareExtensions
{
    public static IApplicationBuilder UsePerformanceMonitoring(this IApplicationBuilder app)
    {
        return app.UseMiddleware<PerformanceMonitoringMiddleware>();
    }

    public static IApplicationBuilder UseRequestResponseLogging(this IApplicationBuilder app)
    {
        return app.UseMiddleware<RequestResponseLoggingMiddleware>();
    }

    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app)
    {
        return app.UseMiddleware<SecurityHeadersMiddleware>();
    }
}
