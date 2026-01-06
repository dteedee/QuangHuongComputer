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
using BuildingBlocks.Messaging.Outbox;
using BuildingBlocks.Security;
using MassTransit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using ApiGateway;
using Content.Infrastructure.Data;
using DotNetEnv;

Env.TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000") // Allow Frontend
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

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

// Infrastructure
builder.Services.AddMassTransit(x =>
{
    // Register Consumers from Modules
    x.AddConsumers(typeof(Communication.DependencyInjection).Assembly);
    
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

builder.Services.AddControllers();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();

    using (var scope = app.Services.CreateScope())
    {
        var services = scope.ServiceProvider;
        
        // Ensure all DBs are created and seeded
        var contexts = new DbContext[] 
        { 
            services.GetRequiredService<CatalogDbContext>(),
            services.GetRequiredService<SalesDbContext>(),
            services.GetRequiredService<RepairDbContext>(),
            services.GetRequiredService<InventoryModule.Infrastructure.InventoryDbContext>(),
            services.GetRequiredService<AccountingDbContext>(),
            services.GetRequiredService<WarrantyDbContext>(),
            services.GetRequiredService<PaymentsDbContext>(),
            services.GetRequiredService<ContentDbContext>(),
            services.GetRequiredService<AiDbContext>(),
            services.GetRequiredService<Identity.Infrastructure.IdentityDbContext>()
        };

        foreach (var ctx in contexts)
        {
            try
            {
                await ctx.Database.MigrateAsync();
            }
            catch (Exception ex)
            {
                // Log error but continue to next context/module
                var logger = services.GetRequiredService<ILogger<Program>>();
                logger.LogError(ex, "Migration failed for {ContextName}", ctx.GetType().Name);
            }
        }

        await CatalogDbSeeder.SeedAsync(services.GetRequiredService<CatalogDbContext>());
        await IdentitySeeder.SeedAsync(services);
        await new ContentDbSeeder(services.GetRequiredService<ContentDbContext>()).SeedAsync();
    }
}

app.UseCors();
app.UseHttpsRedirection();
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

app.MapControllers();


app.Run();


