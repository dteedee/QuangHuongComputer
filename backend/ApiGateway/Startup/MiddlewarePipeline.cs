using ApiGateway;
using BuildingBlocks.Endpoints;
using Microsoft.AspNetCore.Localization;
using Microsoft.Extensions.Options;

namespace ApiGateway.Startup;

/// <summary>
/// Configures the HTTP request pipeline. Order MATTERS — do not shuffle these calls.
///
/// Contract:
/// 1. Swagger (dev only)
/// 2. CORS — MUST run before Authentication so preflight requests are handled
/// 3. Localization
/// 4. HTTPS redirect
/// 5. Static files + compression
/// 6. Global exception / security headers / performance monitoring
/// 7. Rate limiter — before Auth so DoS gets stopped even for unauthenticated traffic
/// 8. Authentication → Authorization → domain-specific validation
/// </summary>
public static class MiddlewarePipeline
{
    public static void Configure(WebApplication app)
    {
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

        app.UseRateLimiter();

        app.UseAuthentication();
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
