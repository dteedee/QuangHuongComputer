using ApiGateway.Seo;
using BuildingBlocks.Time;
using BuildingBlocks;
using Accounting;
using Ai;
using Ai.Application;
using BuildingBlocks.Caching.Redis;
using BuildingBlocks.Database;
using BuildingBlocks.Email;
using BuildingBlocks.Messaging;
using BuildingBlocks.Validation;
using Catalog;
using Communication;
using Content;
using CRM;
using HR;
using Identity;
using InventoryModule;
using MassTransit;
using Microsoft.AspNetCore.ResponseCompression;
using Payments;
using Repair;
using Reporting;
using Sales;
using Sales.Application.Pricing;
using SystemConfig;
using System.Globalization;
using Warranty;

namespace ApiGateway.Startup;

/// <summary>
/// Central place to wire up every module and cross-cutting service.
/// Order of registration is preserved — several modules rely on downstream services being registered first.
/// </summary>
public static class ServiceRegistration
{
    public static void RegisterAll(WebApplicationBuilder builder)
    {
        MapOAuthEnvironmentVariables(builder);
        ConfigureCulture();
        RegisterInfrastructure(builder);
        RegisterCors(builder);
        RegisterCachingAndLocalization(builder);
        RegisterModules(builder);
        RegisterEmail(builder);
        RegisterMessagingAndBackgroundJobs(builder);
        RegisterJsonAndControllers(builder);
        // Chạy sau RegisterModules để đảm bảo mọi assembly Services.* đã được load vào AppDomain
        // trước khi quét IValidator<T> (FluentValidation).
        // Platform kernel của W1-3 (IAppSettings, IDocumentNumberService, validators) + IBusinessClock.
        // Trước đây host chỉ gọi AddApplicationValidators(), nên IAppSettings KHÔNG có trong DI:
        // mọi endpoint minh hoạ nhận IAppSettings đều làm ASP.NET Core ném
        // "Failure to infer one or more parameters" ngay lúc dựng bảng route (W2-9 PcBuilderSuggest
        // đụng đúng lỗi này; Inventory và HR đã phải tự né trong DependencyInjection của module).
        // AddPlatformKernel dùng TryAdd nên module nào đã tự đăng ký thì vẫn thắng.
        builder.Services.AddPlatformKernel();
        builder.Services.AddBusinessClock();
    }

    private static void MapOAuthEnvironmentVariables(WebApplicationBuilder builder)
    {
        MapIfPresent("GOOGLE_CLIENT_ID", "OAuth:Google:ClientId");
        MapIfPresent("GOOGLE_CLIENT_SECRET", "OAuth:Google:ClientSecret");
        MapIfPresent("FACEBOOK_APP_ID", "OAuth:Facebook:AppId");
        MapIfPresent("FACEBOOK_APP_SECRET", "OAuth:Facebook:AppSecret");

        void MapIfPresent(string envKey, string configKey)
        {
            var value = Environment.GetEnvironmentVariable(envKey);
            if (!string.IsNullOrEmpty(value)) builder.Configuration[configKey] = value;
        }
    }

    private static void ConfigureCulture()
    {
        CultureInfo.DefaultThreadCurrentCulture = new CultureInfo("vi-VN");
        CultureInfo.DefaultThreadCurrentUICulture = new CultureInfo("vi-VN");
    }

    private static void RegisterInfrastructure(WebApplicationBuilder builder)
    {
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen(c => c.CustomSchemaIds(type => type.FullName?.Replace("+", ".")));

        builder.Services.AddResponseCompression(options =>
        {
            options.Providers.Add<GzipCompressionProvider>();
            options.Providers.Add<BrotliCompressionProvider>();
            options.MimeTypes = ResponseCompressionDefaults.MimeTypes
                .Concat(new[] { "application/json", "text/json", "application/xml", "text/plain" })
                .Distinct();
        });

        builder.Services.AddHttpContextAccessor();
        builder.Services.AddScoped<AuditSaveChangesInterceptor>();

        RegisterForwardedHeaders(builder);
        RateLimitingSetup.Register(builder);

        // D11: nothing registered OutputCache/ResponseCaching anywhere in the repo before this.
        // W1-6's MiddlewarePipeline.cs still needs app.UseOutputCache() and W2-17's SEO shell adds
        // the named policy that keys on path+page+filtered - both integration requests filed
        // (see reports/integration-requests-w1.md).
        builder.Services.AddOutputCache();

        // W2-17 đã có: đăng ký SEO shell (D11). Trước đây Program.cs gọi app.MapSeoShell() nhưng
        // AddSeoShell() không ai gọi, nên SeoShellTemplateLoader không nằm trong DI và ASP.NET Core
        // suy tham số đó thành body -> "Body was inferred but the method does not allow inferred
        // body parameters" ngay lúc dựng bảng route, API không khởi động được.
        builder.Services.AddSeoShell(builder.Configuration);

        var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
        // Tagged "ready": /health/ready filters on this tag and matched NOTHING before, so it always
        // reported Healthy even with the database down. /health/live stays dependency-free (it answers
        // "the process is up"), which is what a container restart policy must probe.
        // Redis only degrades the service (caching falls back to the database); Postgres and RabbitMQ
        // are hard dependencies — decision D05.
        builder.Services.AddHealthChecks()
            .AddNpgSql(connectionString!, name: "postgres", tags: new[] { "ready", "db" })
            .AddCheck(
                "rabbitmq",
                new RabbitMqHealthCheck(builder.Configuration.GetConnectionString("RabbitMQ") ?? "amqp://guest:guest@localhost:5672"),
                failureStatus: Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Unhealthy,
                tags: new[] { "ready", "bus" })
            .AddRedis(
                builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379",
                name: "redis",
                failureStatus: Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Degraded,
                tags: new[] { "ready", "cache" });
    }

    /// <summary>
    /// Trust X-Forwarded-For / X-Forwarded-Proto ONLY from the reverse proxy.
    ///
    /// Without this the rate limiter, the audit log and every "client IP" in the system see the
    /// proxy's address, so the whole internet shares one bucket. Trusting the header from ANY peer
    /// would be worse: a caller could then spoof its own address and escape rate limiting entirely.
    /// Default network is 172.16.0.0/12 (the Docker bridge Caddy runs on) — decision D05.
    /// With no proxy in front (today's dev setup) nothing matches and the socket address is used.
    /// </summary>
    private static void RegisterForwardedHeaders(WebApplicationBuilder builder)
    {
        var networks = builder.Configuration.GetSection("ForwardedHeaders:KnownNetworks").Get<string[]>()
            ?? new[] { "172.16.0.0/12" };
        var proxies = builder.Configuration.GetSection("ForwardedHeaders:KnownProxies").Get<string[]>()
            ?? Array.Empty<string>();

        builder.Services.Configure<Microsoft.AspNetCore.Builder.ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor
                                     | Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto;
            // One hop: Caddy. A longer chain would let a client prepend a forged address.
            options.ForwardLimit = builder.Configuration.GetValue("ForwardedHeaders:ForwardLimit", 1);

            // The defaults trust the loopback address; replace them with the configured set so the
            // trusted list is explicit and reviewable rather than implicit.
            options.KnownNetworks.Clear();
            options.KnownProxies.Clear();

            foreach (var network in networks)
            {
                var parts = network.Split('/', 2);
                if (parts.Length == 2
                    && System.Net.IPAddress.TryParse(parts[0], out var prefix)
                    && int.TryParse(parts[1], out var prefixLength))
                {
                    options.KnownNetworks.Add(new Microsoft.AspNetCore.HttpOverrides.IPNetwork(prefix, prefixLength));
                }
            }

            foreach (var proxy in proxies)
            {
                if (System.Net.IPAddress.TryParse(proxy, out var address))
                {
                    options.KnownProxies.Add(address);
                }
            }
        });
    }

    private static void RegisterCors(WebApplicationBuilder builder)
    {
        var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? new[] { "http://localhost:5173", "http://localhost:4173", "http://localhost:3000", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176" };

        if (builder.Environment.IsDevelopment())
        {
            var devOrigins = new[] { "http://localhost:5173", "http://localhost:3000", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176" };
            corsOrigins = corsOrigins.Union(devOrigins).Distinct().ToArray();
        }

        builder.Services.AddCors(options =>
        {
            options.AddDefaultPolicy(policy =>
            {
                if (builder.Environment.IsDevelopment())
                {
                    policy.SetIsOriginAllowed(origin => true)
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials();
                }
                else
                {
                    policy.WithOrigins(corsOrigins)
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials();
                }
            });
        });
    }

    private static void RegisterCachingAndLocalization(WebApplicationBuilder builder)
    {
        builder.Services.AddRedisCache(builder.Configuration);

        builder.Services.AddLocalization(options => options.ResourcesPath = "Resources");

        builder.Services.Configure<Microsoft.AspNetCore.Builder.RequestLocalizationOptions>(options =>
        {
            var supportedCultures = new[]
            {
                new CultureInfo("vi-VN"),
                new CultureInfo("en-US")
            };

            options.DefaultRequestCulture = new Microsoft.AspNetCore.Localization.RequestCulture("vi-VN");
            options.SupportedCultures = supportedCultures;
            options.SupportedUICultures = supportedCultures;
        });
    }

    private static void RegisterModules(WebApplicationBuilder builder)
    {
        builder.Services.AddCatalogModule(builder.Configuration);
        // builder.Services.AddOmnichannelModule(builder.Configuration); // Removed: Omnichannel module deleted (no .csproj)
        builder.Services.AddSalesModule(builder.Configuration);
        builder.Services.AddRepairModule(builder.Configuration);
        builder.Services.AddWarrantyModule(builder.Configuration);
        builder.Services.AddInventoryModule(builder.Configuration);
        builder.Services.AddAccountingModule(builder.Configuration);
        builder.Services.AddIdentityModule(builder.Configuration);
        builder.Services.AddPaymentsModule(builder.Configuration);
        builder.Services.AddContentModule(builder.Configuration);
        // Promotion engine — 9 rule + evaluator + engine.
        builder.Services.AddPricingEngine();
        builder.Services.AddAiModule(builder.Configuration);
        builder.Services.AddSignalR()
            .AddJsonProtocol(options => BuildingBlocks.Endpoints.ApiJsonOptions.Apply(options.PayloadSerializerOptions));
        builder.Services.AddCommunicationModule(builder.Configuration);
        builder.Services.AddHRModule(builder.Configuration);
        builder.Services.AddSystemConfigModule(builder.Configuration);
        // Hằng số thuế động (ITaxSettingsProvider) — đọc ConfigurationEntry category "Tax",
        // consume bởi HR PayrollCalculationService (fallback luật định nếu thiếu config).
        builder.Services.AddTaxSettings();
        builder.Services.AddReportingModule();
        builder.Services.AddCrmModule(builder.Configuration);
    }

    /// <summary>
    /// D12 unification: one queued SMTP pipeline (BuildingBlocks/Email) behind IEmailSender, bound
    /// to "Email:Smtp:*". Both BuildingBlocks.Email.IEmailService and Identity.Services.IEmailService
    /// now delegate to it - see the comment atop Identity/Services/EmailService.cs.
    /// </summary>
    private static void RegisterEmail(WebApplicationBuilder builder)
    {
        builder.Services.AddQuangHuongEmail(builder.Configuration);
    }

    private static void RegisterMessagingAndBackgroundJobs(WebApplicationBuilder builder)
    {
        builder.Services.AddMassTransit(x =>
        {
            x.AddConsumers(typeof(Communication.DependencyInjection).Assembly);
            x.AddConsumers(typeof(Sales.DependencyInjection).Assembly);
            x.AddConsumers(typeof(Accounting.DependencyInjection).Assembly);
            x.AddConsumers(typeof(Warranty.DependencyInjection).Assembly);
            x.AddConsumers(typeof(Identity.DependencyInjection).Assembly);
            // HR: hoa hồng kỹ thuật nghe RepairWorkOrderSettlementChangedEvent.
            x.AddConsumers(typeof(HR.DependencyInjection).Assembly);

            // phase-14 step 2: custom outbox (BuildingBlocks/Messaging/Outbox/**) deleted - it was
            // dead code (grepped: 0 live callers besides itself). Its replacement,
            // MassTransit.AddEntityFrameworkOutbox<TDbContext>, is NOT wired here: from
            // MassTransit.EntityFrameworkCore 8.5.0 onward (including the D05-pinned 8.5.10) its
            // net8.0 dependency group requires Microsoft.EntityFrameworkCore.Relational >= 9.0.1,
            // binary-incompatible with this repo's EF Core 8.0.2 pin (Directory.Build.props) -
            // referencing the package reproducibly crashes EVERY DbContext at startup with
            // TypeLoadException on NpgsqlHistoryRepository.get_LockReleaseBehavior (confirmed
            // against the TEST stack, see w1-5-report.md). Publishing inside these five contexts'
            // scope today is fire-and-forget again, same as before this track - flagged RED, not
            // silently "fixed". See report for the options this blocks on.

            x.UsingRabbitMq((context, cfg) =>
            {
                MassTransitRegistration.ConfigureHost(cfg, builder.Configuration, builder.Environment);
                cfg.ConfigureEndpoints(context);
            });
        });

        builder.Services.AddHostedService<CRM.BackgroundServices.AutomationJobService>();
    }

    /// <summary>
    /// One JSON contract for the whole API — see <see cref="BuildingBlocks.Endpoints.ApiJsonOptions"/>.
    /// It must be applied to all three pipelines (minimal APIs, MVC controllers, SignalR), otherwise
    /// the same DTO is serialized differently depending on which one served it. The SignalR hub
    /// protocol was previously left at its defaults, so chat/notification payloads went out PascalCase
    /// with naive timestamps while the REST responses were camelCase with UTC ones.
    /// </summary>
    private static void RegisterJsonAndControllers(WebApplicationBuilder builder)
    {
        builder.Services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(
            options => BuildingBlocks.Endpoints.ApiJsonOptions.Apply(options.SerializerOptions));

        builder.Services.AddControllers()
            .AddJsonOptions(options => BuildingBlocks.Endpoints.ApiJsonOptions.Apply(options.JsonSerializerOptions));
    }
}
