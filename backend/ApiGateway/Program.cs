using Catalog;
using Sales;
using Repair;
using Warranty;
using InventoryModule;
using Accounting;
using Payments;
using Content;
using Identity;
using Ai;
using Ai.Application;
using Communication;
using HR;
using SystemConfig;
using Reporting;
using Catalog.Infrastructure;
using Catalog.Infrastructure.Data;
using Sales.Infrastructure;
using Repair.Infrastructure;
using Accounting.Infrastructure;
using Warranty.Infrastructure;
using InventoryModule.Infrastructure;
using Payments.Infrastructure;
using Content.Infrastructure;
using Ai.Infrastructure;
using HR.Infrastructure;
using SystemConfig.Infrastructure;
using BuildingBlocks.Messaging.Outbox;
using BuildingBlocks.Security;
using BuildingBlocks.Email;
using BuildingBlocks.Caching;
using BuildingBlocks.Endpoints;
using MassTransit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using ApiGateway;
using Content.Infrastructure.Data;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using DotNetEnv;

Env.TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(options =>
{
    options.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
});

// ========================================
// RESPONSE COMPRESSION
// ========================================
builder.Services.AddResponseCompression(options =>
{
    options.Providers.Add<GzipCompressionProvider>();
    options.Providers.Add<BrotliCompressionProvider>();
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes
        .Concat(new[] { "application/json", "text/json", "application/xml", "text/plain" })
        .Distinct();
});

// ========================================
// RATE LIMITING CONFIGURATION
// ========================================
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetSlidingWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
            factory: _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = int.Parse(builder.Configuration["RateLimiting:PermitLimit"] ?? "100"),
                Window = TimeSpan.FromSeconds(int.Parse(builder.Configuration["RateLimiting:WindowInSeconds"] ?? "60")),
                SegmentsPerWindow = 2,
                QueueLimit = 10,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst
            }));

    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        context.HttpContext.Response.Headers.Add("Retry-After", "60");
        
        await context.HttpContext.Response.WriteAsJsonAsync(new 
        { 
            error = "Too many requests. Please try again later.",
            retryAfter = 60
        }, cancellationToken);
    };
});

// Health Checks
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddHealthChecks()
    .AddNpgSql(connectionString!, name: "postgres")
    .AddRabbitMQ(rabbitConnectionString: builder.Configuration.GetConnectionString("RabbitMQ") ?? "amqp://guest:guest@localhost:5672", name: "rabbitmq")
    .AddRedis(builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379", name: "redis");

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000", "http://localhost:5174") // Allow Frontend
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// ========================================
// REDIS CACHING CONFIGURATION
// ========================================
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
    options.InstanceName = "quanghc:";
});
builder.Services.AddScoped<ICacheService, CacheService>();

// Modules
builder.Services.AddCatalogModule(builder.Configuration);
builder.Services.AddSalesModule(builder.Configuration);
builder.Services.AddRepairModule(builder.Configuration);
builder.Services.AddWarrantyModule(builder.Configuration);
builder.Services.AddInventoryModule(builder.Configuration);
builder.Services.AddAccountingModule(builder.Configuration);
builder.Services.AddIdentityModule(builder.Configuration);
builder.Services.AddPaymentsModule(builder.Configuration);
builder.Services.AddContentModule(builder.Configuration);
builder.Services.AddAiModule(builder.Configuration);
builder.Services.AddSignalR();
builder.Services.AddCommunicationModule(builder.Configuration);  // Added Communication Module
builder.Services.AddHRModule(builder.Configuration);
builder.Services.AddSystemConfigModule(builder.Configuration);
builder.Services.AddReportingModule();

// Email Service
builder.Services.AddSingleton<IEmailService, EmailService>();

// Infrastructure
builder.Services.AddMassTransit(x =>
{
    // Register Consumers from Modules
    x.AddConsumers(typeof(Communication.DependencyInjection).Assembly);
    x.AddConsumers(typeof(Sales.DependencyInjection).Assembly);
    x.AddConsumers(typeof(Accounting.DependencyInjection).Assembly);
    x.AddConsumers(typeof(Warranty.DependencyInjection).Assembly);
    
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

// Security
builder.Services.AddAuthorization(options =>
{
    foreach (var field in typeof(Permissions).GetNestedTypes().SelectMany(t => t.GetFields()))
    {
        var permission = field.GetValue(null)?.ToString();
        if (permission != null)
        {
            options.AddPolicy(permission, policy => policy.Requirements.Add(new PermissionRequirement(permission)));
        }
    }
});
builder.Services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();

    using (var scope = app.Services.CreateScope())
    {
        var services = scope.ServiceProvider;
        var logger = services.GetRequiredService<ILogger<Program>>();

        // ── Contexts that HAVE EF migrations ──
        var migrateContexts = new DbContext[]
        {
            services.GetRequiredService<CatalogDbContext>(),
            services.GetRequiredService<SalesDbContext>(),
            services.GetRequiredService<RepairDbContext>(),
            services.GetRequiredService<WarrantyDbContext>(),
            services.GetRequiredService<ContentDbContext>(),
            services.GetRequiredService<Identity.Infrastructure.IdentityDbContext>(),
        };

        foreach (var ctx in migrateContexts)
        {
            try
            {
                logger.LogInformation("Migrating {Context}...", ctx.GetType().Name);
                await ctx.Database.MigrateAsync();
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Migration failed for {Context}", ctx.GetType().Name);
            }
        }

        // ── Contexts WITHOUT migrations – use EnsureCreated ──
        var ensureCreatedContexts = new DbContext[]
        {
            services.GetRequiredService<InventoryModule.Infrastructure.InventoryDbContext>(),
            services.GetRequiredService<AccountingDbContext>(),
            services.GetRequiredService<PaymentsDbContext>(),
            services.GetRequiredService<AiDbContext>(),
            services.GetRequiredService<Communication.Infrastructure.CommunicationDbContext>(),
            services.GetRequiredService<HRDbContext>(),
            services.GetRequiredService<SystemConfigDbContext>(),
        };

        foreach (var ctx in ensureCreatedContexts)
        {
            try
            {
                logger.LogInformation("EnsureCreated {Context}...", ctx.GetType().Name);
                await ctx.Database.EnsureCreatedAsync();
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "EnsureCreated failed for {Context}", ctx.GetType().Name);
            }
        }

        // ── Seed data ──
        try
        {
            await CatalogDbSeeder.SeedAsync(services.GetRequiredService<CatalogDbContext>());
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Catalog seeding failed (tables may not exist yet)");
        }
    }
}

app.UseCors();
app.UseHttpsRedirection();
app.UseResponseCompression();

// ========================================
// CUSTOM MIDDLEWARE
// ========================================
app.UseGlobalExceptionHandling();
app.UseSecurityHeaders();
app.UsePerformanceMonitoring();
app.UseApiResponseTime();

// ========================================
// RATE LIMITING MIDDLEWARE
// ========================================
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

// Chatbot Endpoint
app.MapPost("/api/ai/chat", async (GatewayChatRequest request, IAiService ai) =>
{
    var response = await ai.AskAsync(request.Message);
    return Results.Ok(new { Response = response });
}).WithName("ChatWithAi");

app.MapHub<Communication.Hubs.ChatHub>("/hubs/chat");

// Health Checks Endpoints
app.MapHealthChecks("/health");
app.MapHealthChecks("/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});
app.MapHealthChecks("/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = _ => false
});

// Map Endpoints
app.MapCatalogEndpoints();
app.MapIdentityEndpoints();
app.MapSalesEndpoints();
app.MapRepairEndpoints();
app.MapWarrantyEndpoints();
app.MapPaymentsEndpoints();
app.MapContentEndpoints();
app.MapCommunicationEndpoints(); // Added Communication Endpoints
app.MapHREndpoints();
app.MapSystemConfigEndpoints();
app.MapInventoryEndpoints();
app.MapAccountingEndpoints();
app.MapReportingEndpoints();

app.MapControllers();


app.Run();


