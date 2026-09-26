using ApiGateway;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Storage;
using Microsoft.AspNetCore.Localization;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.FileProviders;
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
/// 6. Static files (2 mounts, W1-6 / D02) + compression + output cache (D11)
/// 7. Global exception / security headers / performance monitoring
/// 8. Authentication → Rate limiter → Authorization
///
/// Why the rate limiter sits BETWEEN authentication and authorization:
///   · after UseAuthentication, so HttpContext.User is populated and a signed-in caller gets their
///     own bucket instead of sharing one IP bucket with everybody behind the same proxy;
///   · before UseAuthorization, so a flood of unauthenticated requests against a protected endpoint
///     is still throttled instead of being cheaply 401'd forever.
/// Authentication itself is only a signature check on a JWT already in the request — it does not
/// touch the database, so doing it before the limiter does not open a DoS amplification.
///
/// W1-6 / D02: static files are served from TWO independent mounts, because they have different
/// origins, cache lifetimes and mutability:
///   · the DEFAULT mount (wwwroot) serves versioned seed assets under `/media/seed/**` (W0-6, git
///     tracked) — cache 30 days, filenames are NOT unique-per-content so no `immutable`;
///   · a SECOND mount at `RequestPath="/media/u"` serves `Storage:RootPath` (git-ignored runtime
///     uploads, D02 — OUTSIDE wwwroot on purpose so a volume mounted over it can never obscure the
///     seed images baked into the image) — cache 1 year + `immutable` because every filename
///     contains a GUID (never reused).
/// Both mounts stamp `X-Content-Type-Options: nosniff` themselves in `OnPrepareResponse`, because
/// `UseSecurityHeaders()` below runs AFTER `UseStaticFiles` and therefore never touches a static
/// file response (verified: static file responses short-circuit the pipeline before reaching it).
/// </summary>
public static class MiddlewarePipeline
{
    private const string SeedCacheControl = "public, max-age=2592000"; // 30 ngày — ảnh seed, có thể bị thay tên khi đổi (không immutable)
    private const string RuntimeCacheControl = "public, max-age=31536000, immutable"; // 1 năm — tên file chứa GUID, không bao giờ tái sử dụng

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

        UseMediaStaticFiles(app);
        app.UseResponseCompression();

        // D11 (integration request from W2-17, filed at wave 1 as a no-op until the SEO shell
        // ships): must sit after UseResponseCompression() and before UseAuthentication(). Store is
        // registered by ServiceRegistration.AddOutputCache() (W1-5) — see comment there.
        app.UseOutputCache();

        // Custom middleware (defined in Middleware.cs)
        app.UseGlobalExceptionHandling();
        app.UseSecurityHeaders();
        app.UsePerformanceMonitoring();

        app.UseAuthentication();
        app.UseRateLimiter();
        app.UseAuthorization();
        // "Đã mua mới được đánh giá" nay do chính endpoint review hỏi Sales qua
        // BuildingBlocks.Contracts.IPurchaseVerificationQuery — không còn middleware ghi header.
    }

    /// <summary>Hai mount tĩnh của W1-6 / D02 — xem doc comment ở đầu file.</summary>
    private static void UseMediaStaticFiles(WebApplication app)
    {
        // Mount 1 (mặc định, wwwroot): ảnh seed W0-6 `/media/seed/**` + `/uploads/**` legacy còn lại
        // trong wwwroot (chưa có track nào dọn — xem integration request).
        app.UseStaticFiles(new StaticFileOptions
        {
            OnPrepareResponse = ctx => SetCacheAndNosniff(ctx, SeedCacheControl),
        });

        // Mount 2: upload runtime, NGOÀI wwwroot (Storage:RootPath — D02). Thư mục phải tồn tại
        // trước khi PhysicalFileProvider mount, nên tạo nếu thiếu (thay cho EnsureUploadsFolder cũ,
        // trỏ đúng vị trí mới).
        var storageOptions = FileStorageOptions.Resolve(app.Configuration, app.Environment.ContentRootPath);
        Directory.CreateDirectory(storageOptions.RootPath);

        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(storageOptions.RootPath),
            RequestPath = FileStorageOptions.RuntimeRequestPath,
            ServeUnknownFileTypes = false, // đóng CVE class "serve anything" — webp/mp4/webm đều có trong bảng MIME mặc định .NET 8
            OnPrepareResponse = ctx => SetCacheAndNosniff(ctx, RuntimeCacheControl),
        });
    }

    private static void SetCacheAndNosniff(StaticFileResponseContext ctx, string cacheControl)
    {
        ctx.Context.Response.Headers["Cache-Control"] = cacheControl;
        ctx.Context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    }
}
