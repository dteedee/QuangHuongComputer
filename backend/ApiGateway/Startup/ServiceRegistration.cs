using Accounting;
using Ai;
using Ai.Application;
using BuildingBlocks.Caching.Redis;
using BuildingBlocks.Database;
using BuildingBlocks.Email;
using BuildingBlocks.Messaging.Outbox;
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
        RegisterMessagingAndBackgroundJobs(builder);
        RegisterJsonAndControllers(builder);
        // Chạy sau RegisterModules để đảm bảo mọi assembly Services.* đã được load vào AppDomain
        // trước khi quét IValidator<T> (FluentValidation).
        builder.Services.AddApplicationValidators();
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

        var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
        // Tagged "ready": /health/ready filters on this tag and matched NOTHING before, so it always
        // reported Healthy even with the database down. /health/live stays dependency-free (it answers
        // "the process is up"), which is what a container restart policy must probe.
        // Redis only degrades the service (caching falls back to the database); Postgres and RabbitMQ
        // are hard dependencies — decision D05.
        builder.Services.AddHealthChecks()
            .AddNpgSql(connectionString!, name: "postgres", tags: new[] { "ready", "db" })
            .AddRabbitMQ(
                rabbitConnectionString: builder.Configuration.GetConnectionString("RabbitMQ") ?? "amqp://guest:guest@localhost:5672",
                name: "rabbitmq",
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

        builder.Services.AddSingleton<IEmailService, EmailService>();
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

            x.UsingRabbitMq((context, cfg) =>
            {
                cfg.Host(builder.Configuration.GetValue<string>("RabbitMQ:Host") ?? "localhost", builder.Configuration.GetValue<string>("RabbitMQ:VirtualHost") ?? "/", h =>
                {
                    h.Username("guest");
                    h.Password("guest");
                });

                cfg.ConfigureEndpoints(context);
            });
        });

        builder.Services.AddHostedService<OutboxProcessorBackgroundService>();
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
