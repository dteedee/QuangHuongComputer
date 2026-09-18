using System.Text;
using Identity.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using BuildingBlocks.Database;

namespace Identity;

public static class DependencyInjection
{
    public static IServiceCollection AddIdentityModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection not found");

        services.AddDbContext<IdentityDbContext>((serviceProvider, options) =>
        {
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.CommandTimeout(30);
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromSeconds(5), errorCodesToAdd: null);
                npgsqlOptions.MigrationsAssembly(typeof(IdentityDbContext).Assembly.FullName);
            });

            var interceptor = serviceProvider.GetService<AuditSaveChangesInterceptor>();
            if (interceptor != null)
                options.AddInterceptors(interceptor);
        });

        services.AddIdentity<ApplicationUser, IdentityRole>(options =>
        {
            options.Password.RequireDigit = false;
            options.Password.RequiredLength = 6;
            options.Password.RequireNonAlphanumeric = false;
            options.Password.RequireUppercase = false;

            // Persistent brute-force defence. The in-memory rate limiter in the
            // login endpoint resets with the process and is per-instance; this
            // one lives in AspNetUsers.LockoutEnd and survives a restart.
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            options.Lockout.AllowedForNewUsers = true;

            // Two accounts must never share an address - the password-reset
            // challenge is keyed on the e-mail.
            options.User.RequireUniqueEmail = true;
        })
        .AddEntityFrameworkStores<IdentityDbContext>()
        .AddDefaultTokenProviders();

        var jwtSettings = configuration.GetSection("Jwt");
        var key = Encoding.ASCII.GetBytes(jwtSettings["Key"] ?? "super_secret_key_1234567890123456");

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtSettings["Issuer"] ?? "QuangHuongComputer",
                ValidAudience = jwtSettings["Audience"] ?? "QuangHuongComputer",
                IssuerSigningKey = new SymmetricSecurityKey(key)
            };

            // SignalR clients cannot set the Authorization header on WebSocket/SSE
            // handshake requests — they pass the JWT via the `access_token` query
            // string instead. Without this, all /hubs/* connections return 401.
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    var path = context.HttpContext.Request.Path;
                    if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    {
                        context.Token = accessToken;
                    }
                    return Task.CompletedTask;
                },

                // W1-2: a signed token is not enough. This re-checks IsActive and
                // the security stamp against Redis (60s TTL, database fallback),
                // which is what makes deactivation, role changes and session
                // revocation take effect instead of waiting out the token.
                OnTokenValidated = Identity.Services.AccessTokenStateGuard.ValidateAsync
            };
        });

        services.AddAuthorization();

        services.AddMemoryCache();
        services.AddScoped<Identity.Services.IAuditService, Identity.Services.AuditService>();
        services.AddScoped<Identity.Services.IEmailService, Identity.Services.EmailService>();
        services.AddScoped<Identity.Services.IRefreshTokenService, Identity.Services.RefreshTokenService>();
        services.AddSingleton<Identity.Services.IRateLimitService, Identity.Services.RateLimitService>();

        // W1-2: sessions, immediate invalidation, 2FA and the cross-module user
        // directory. UserStateCache takes IConnectionMultiplexer as an OPTIONAL
        // constructor argument, so the module still starts when Redis is not
        // registered - it then reads the database on every check (D05 item 8).
        services.AddScoped<Identity.Services.IUserStateCache, Identity.Services.UserStateCache>();
        services.AddScoped<Identity.Services.ITokenIssuer, Identity.Services.TokenIssuer>();
        services.AddScoped<Identity.Services.ITwoFactorChallengeService, Identity.Services.TwoFactorChallengeService>();
        services.AddScoped<Identity.Services.IUserDirectory, Identity.Services.UserDirectory>();

        // Background Services
        services.AddHostedService<Identity.Services.RefreshTokenCleanupService>();

        return services;
    }
}
