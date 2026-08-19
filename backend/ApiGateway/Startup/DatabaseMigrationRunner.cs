using Accounting.Infrastructure;
using Ai.Infrastructure;
using Catalog.Infrastructure;
using Catalog.Infrastructure.Data;
using Communication.Infrastructure;
using Content.Infrastructure;
using Content.Infrastructure.Data;
using CRM.Infrastructure;
using HR.Infrastructure;
using Identity;
using Identity.Infrastructure;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Payments.Infrastructure;
using Repair.Infrastructure;
using Sales.Infrastructure;
using SystemConfig.Infrastructure;
using SystemConfig.Infrastructure.Data;
using Warranty.Infrastructure;

namespace ApiGateway.Startup;

/// <summary>
/// Runs EF Core migrations for every module DbContext and executes seed data.
///
/// Rules:
/// - Every DbContext MUST have proper migrations. No <c>EnsureCreated</c>, no raw ALTER TABLE.
/// - Runs in every environment. Gated by <c>Database:AutoMigrate</c> config (default true in Development, false in Production).
/// - In Production, a migration failure THROWS to stop application startup (fail fast).
/// - In Development, migration failures are logged but startup continues.
/// </summary>
public static class DatabaseMigrationRunner
{
    public static async Task RunAsync(WebApplication app)
    {
        var config = app.Configuration;
        var env = app.Environment;
        var defaultAutoMigrate = env.IsDevelopment();
        var autoMigrate = config.GetValue("Database:AutoMigrate", defaultAutoMigrate);

        if (!autoMigrate)
        {
            app.Logger.LogInformation("Database:AutoMigrate=false — skipping migrations for env {Env}", env.EnvironmentName);
            return;
        }

        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;
        var logger = services.GetRequiredService<ILogger<Program>>();
        var failFast = env.IsProduction();

        // ONE authoritative list of every DbContext. All use EF migrations.
        var contexts = new DbContext[]
        {
            services.GetRequiredService<CatalogDbContext>(),
            services.GetRequiredService<SalesDbContext>(),
            services.GetRequiredService<RepairDbContext>(),
            services.GetRequiredService<WarrantyDbContext>(),
            services.GetRequiredService<ContentDbContext>(),
            services.GetRequiredService<IdentityDbContext>(),
            services.GetRequiredService<PaymentsDbContext>(),
            services.GetRequiredService<InventoryDbContext>(),
            services.GetRequiredService<AccountingDbContext>(),
            services.GetRequiredService<AiDbContext>(),
            services.GetRequiredService<CommunicationDbContext>(),
            services.GetRequiredService<HRDbContext>(),
            services.GetRequiredService<SystemConfigDbContext>(),
            // CustomFieldDbContext từng bị bỏ sót → bảng config.CustomFieldDefinitions không được tạo
            services.GetRequiredService<CustomFieldDbContext>(),
            services.GetRequiredService<CrmDbContext>(),
        };

        foreach (var ctx in contexts)
        {
            var name = ctx.GetType().Name;
            try
            {
                logger.LogInformation("Migrating {Context}...", name);
                await ctx.Database.MigrateAsync();
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Migration failed for {Context}", name);
                if (failFast)
                {
                    throw new InvalidOperationException($"Migration failed for {name} in Production. Aborting startup.", ex);
                }
            }
        }

        await RunSeedersAsync(services, logger);
    }

    private static async Task RunSeedersAsync(IServiceProvider services, ILogger logger)
    {
        await TryRun(logger, "Catalog", () => CatalogDbSeeder.SeedAsync(services.GetRequiredService<CatalogDbContext>()));
        await TryRun(logger, "SystemConfig", () => SystemConfigDbSeeder.SeedAsync(services.GetRequiredService<SystemConfigDbContext>()));
        await TryRun(logger, "BackofficeMenu", () => BackofficeMenuSeeder.SeedAsync(services.GetRequiredService<SystemConfigDbContext>()));
        await TryRun(logger, "ReportDefinition", () => ReportDefinitionSeeder.SeedAsync(services.GetRequiredService<SystemConfigDbContext>()));
        await TryRun(logger, "Identity", () => IdentitySeeder.SeedAsync(services));
        await TryRun(logger, "HR", () => HRDbSeeder.SeedAsync(services.GetRequiredService<HRDbContext>()));
        await TryRun(logger, "Content", () => ContentDbSeeder.SeedAsync(services.GetRequiredService<ContentDbContext>()));
    }

    private static async Task TryRun(ILogger logger, string name, Func<Task> action)
    {
        try
        {
            await action();
            logger.LogInformation("{Name} seeding completed.", name);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "{Name} seeding failed", name);
        }
    }
}
