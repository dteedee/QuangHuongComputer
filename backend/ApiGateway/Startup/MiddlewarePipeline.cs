using ApiGateway;
using BuildingBlocks.Endpoints;
using Microsoft.AspNetCore.Localization;
using Microsoft.Extensions.Options;

namespace ApiGateway.Startup;

/// <summary>
/// Configures the HTTP request pipeline. Order MATTERS — do not shuffle these calls.
///
/// Contract:
/// 1. Forwarded headers — FIRST, so every later component sees the real client IP and scheme
/// 2. Swagger (dev only)
/// 3. CORS — MUST run before Authentication so preflight requests are handled
/// 4. Localization
/// 5. HTTPS redirect
/// 6. Static files + compression
/// 7. Global exception / security headers / performance monitoring
/// 8. Authentication → Rate limiter → Authorization → domain-specific validation
///
/// Why the rate limiter sits BETWEEN authentication and authorization:
///   · after UseAuthentication, so HttpContext.User is populated and a signed-in caller gets their
///     own bucket instead of sharing one IP bucket with everybody behind the same proxy;
///   · before UseAuthorization, so a flood of unauthenticated requests against a protected endpoint
///     is still throttled instead of being cheaply 401'd forever.
/// Authentication itself is only a signature check on a JWT already in the request — it does not
/// touch the database, so doing it before the limiter does not open a DoS amplification.
/// </summary>
public static class MiddlewarePipeline
{
    public static void Configure(WebApplication app)
    {
        // Must precede everything that reads the client address (rate limiter, audit log, security
        // headers). Which proxies are trusted is configured in ServiceRegistration; with no trusted
        // proxy configured this is a no-op and the socket address is kept.
        app.UseForwardedHeaders();

        // Immediately after forwarded headers so the summary line carries the real client IP, and
        // early enough to cover requests that a later middleware short-circuits (401, 429, 4xx).
        LoggingSetup.UseRequestLogging(app);

        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseCors();

        var localizationOptions = app.Services.GetRequiredService<IOptions<RequestLocalizationOptions>>().Value;
        app.UseRequestLocalization(localizationOptions);

        app.UseHttpsRedirection();

        EnsureUploadsFolder(app);
        app.UseStaticFiles();
        app.UseResponseCompression();

        // Custom middleware (defined in Middleware.cs)
        app.UseGlobalExceptionHandling();
        app.UseSecurityHeaders();
        app.UsePerformanceMonitoring();

        app.UseAuthentication();
        app.UseRateLimiter();
        app.UseAuthorization();

        // Review validation: Ensure users have purchased a product before reviewing
        app.UseReviewValidation();
    }

    private static void EnsureUploadsFolder(WebApplication app)
    {
        var webRootPath = app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot");
        var uploadsPath = Path.Combine(webRootPath, "uploads");
        if (!Directory.Exists(uploadsPath))
        {
            Directory.CreateDirectory(uploadsPath);
        }
    }
}
