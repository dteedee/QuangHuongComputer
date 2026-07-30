using Accounting;
using Ai;
using Ai.Application;
using BuildingBlocks.Caching.Redis;
using BuildingBlocks.Database;
using BuildingBlocks.Email;
using BuildingBlocks.Messaging.Outbox;
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

        RateLimitingSetup.Register(builder);

        var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
        builder.Services.AddHealthChecks()
            .AddNpgSql(connectionString!, name: "postgres")
            .AddRabbitMQ(rabbitConnectionString: builder.Configuration.GetConnectionString("RabbitMQ") ?? "amqp://guest:guest@localhost:5672", name: "rabbitmq")
            .AddRedis(builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379", name: "redis");
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
        builder.Services.AddSignalR();
        builder.Services.AddCommunicationModule(builder.Configuration);
        builder.Services.AddHRModule(builder.Configuration);
        builder.Services.AddSystemConfigModule(builder.Configuration);
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
                cfg.Host(builder.Configuration.GetValue<string>("RabbitMQ:Host") ?? "localhost", "/", h =>
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

    private static void RegisterJsonAndControllers(WebApplicationBuilder builder)
    {
        builder.Services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(options =>
        {
            options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
            options.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        });

        builder.Services.AddControllers()
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
                options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
            });
    }
}
