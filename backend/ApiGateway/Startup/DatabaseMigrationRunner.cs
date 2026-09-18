using Accounting.Infrastructure;
using Ai.Infrastructure;
using Catalog.Infrastructure;
using Catalog.Infrastructure.Data;
using Catalog.Infrastructure.Data.Import;
using Communication.Infrastructure;
using Content.Infrastructure;
using Content.Infrastructure.Data;
using CRM.Infrastructure;
using HR.Infrastructure;
using Identity;
using Identity.Infrastructure;
using Identity.Services;
using InventoryModule.Infrastructure;
using InventoryModule.Infrastructure.Seed;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Payments.Infrastructure;
using Repair.Infrastructure;
using Sales.Infrastructure;
using Sales.Infrastructure.Seed;
using SystemConfig.Infrastructure;
using SystemConfig.Infrastructure.Data;
using SystemConfig.Infrastructure.Seed;
using Warranty.Infrastructure;
using Warranty.Infrastructure.Seed;

namespace ApiGateway.Startup;

/// <summary>
/// Migrations, the seed registry and the <c>db</c> command line.
///
/// This one file is the whole run path, because W1-4's ownership glob inside ApiGateway is
/// exactly <c>Program.cs</c> and this file - adding a sibling would put it in another track's
/// territory. It is over the repository's 200-line guidance for that reason and that reason only;
/// the seed WORK all lives in the module projects under <c>Services/*/Infrastructure/Seed/</c>,
/// which is what later waves extend.
///
/// The contract 40+ later tracks depend on (documented in <c>docs/deployment-guide.md</c>):
///
///   dotnet ApiGateway.dll db migrate                  apply every module's EF migrations
///   dotnet ApiGateway.dll db seed --profile reference reference data for every environment
///   dotnet ApiGateway.dll db seed --profile demo      reference + demo accounts (Development only)
///   dotnet ApiGateway.dll db reset --demo             truncate transactional tables, then re-seed
///
/// Exit code 0 = success, 1 = a step failed, 2 = bad usage. Every verb prints one line per step
/// with the number of rows it changed, so "second run reports 0 changes" is observable, not
/// assumed.
///
/// A seeder is a <see cref="SeedStep"/>: a name, a profile, an order and a delegate that returns
/// HOW MANY ROWS IT CHANGED. Returning a count rather than void is what makes idempotence
/// testable: run twice, the second total must be 0.
///
/// Rules that must survive later edits:
///   * Every DbContext MUST have proper migrations. No <c>EnsureCreated</c>, no raw ALTER TABLE.
///   * Seeding is NO LONGER gated by <c>Database:AutoMigrate</c>. The two were coupled, and
///     because <c>AutoMigrate</c> is unset outside Development, no environment but this one
///     developer's machine has ever had seed data.
///   * In Production a migration failure THROWS to stop application startup (fail fast).
/// </summary>
public static class DatabaseMigrationRunner
{
    public const string ReferenceProfile = "reference";
    public const string DemoProfile = "demo";

    /// <param name="Order">Lower runs first. Warehouses before stores, stores before stock.</param>
    /// <param name="Run">Returns the number of rows created, changed or deleted.</param>
    public sealed record SeedStep(string Name, string Profile, int Order, Func<IServiceProvider, CancellationToken, Task<int>> Run);

    // =====================================================================================
    // Startup path
    // =====================================================================================

    public static async Task RunAsync(WebApplication app)
    {
        var config = app.Configuration;
        var env = app.Environment;
        var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Database");

        var autoMigrate = config.GetValue("Database:AutoMigrate", env.IsDevelopment());
        var autoSeed = config.GetValue("Database:AutoSeed", env.IsDevelopment());

        using var scope = app.Services.CreateScope();

        if (autoMigrate)
        {
            var failures = await MigrateAsync(scope.ServiceProvider, logger, failFast: env.IsProduction());
            if (failures > 0 && env.IsProduction())
                throw new InvalidOperationException($"{failures} migration(s) failed in Production. Aborting startup.");
        }
        else
        {
            logger.LogInformation("Database:AutoMigrate=false - skipping migrations for env {Env}", env.EnvironmentName);
        }

        if (autoSeed)
        {
            // Startup seeding never aborts the process: an API that refuses to boot because one
            // reference row could not be written is worse than an API that boots and logs it.
            // `db seed` is the path that reports failure with an exit code.
            await RunSeedAsync(scope.ServiceProvider, logger,
                env.IsDevelopment() ? DemoProfile : ReferenceProfile, env, throwOnFailure: false);
        }
        else
        {
            logger.LogInformation("Database:AutoSeed=false - skipping seeders for env {Env}", env.EnvironmentName);
        }
    }

    // =====================================================================================
    // CLI
    // =====================================================================================

    /// <summary>True when the process was started as <c>dotnet ApiGateway.dll db ...</c>.</summary>
    public static bool IsDbCommand(string[] args) =>
        args.Length > 0 && string.Equals(args[0], "db", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Flags that are a yes/no on their own. The command-line CONFIGURATION provider does not know
    /// that: it reads <c>--demo</c> as a key and eats the following token as its value, so
    /// <c>db reset --demo --ConnectionStrings:DefaultConnection=…</c> lost the connection string
    /// and the reset silently targeted whatever appsettings pointed at. The verb parser below
    /// reads these from the raw args; configuration must never see them.
    /// </summary>
    private static readonly string[] ValuelessFlags = { "--demo" };

    /// <summary>
    /// The args to hand to <c>WebApplication.CreateBuilder</c>. Identical to <paramref name="args"/>
    /// for a normal start; for a <c>db</c> verb it drops <see cref="ValuelessFlags"/> so a
    /// <c>--Key=Value</c> override after one of them still reaches configuration.
    /// </summary>
    public static string[] ConfigurationArgs(string[] args) =>
        IsDbCommand(args)
            ? args.Where(a => !ValuelessFlags.Contains(a, StringComparer.OrdinalIgnoreCase)).ToArray()
            : args;

    /// <summary>Runs the <c>db</c> verb and returns the process exit code.</summary>
    public static async Task<int> RunCommandAsync(WebApplication app, string[] args)
    {
        var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("db");
        var verb = args.Length > 1 ? args[1].ToLowerInvariant() : "";
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;

        try
        {
            switch (verb)
            {
                case "migrate":
                {
                    var failures = await MigrateAsync(services, logger, failFast: false);
                    if (failures > 0) { logger.LogError("db migrate: {Count} context(s) failed", failures); return 1; }
                    logger.LogInformation("db migrate: OK");
                    return 0;
                }

                case "seed":
                {
                    var profile = ValueOf(args, "--profile") ?? ReferenceProfile;
                    if (profile != ReferenceProfile && profile != DemoProfile)
                    {
                        logger.LogError("db seed: unknown profile '{Profile}' (reference | demo)", profile);
                        return 2;
                    }
                    var total = await RunSeedAsync(services, logger, profile, app.Environment, throwOnFailure: true);
                    logger.LogInformation("db seed --profile {Profile}: {Total} row(s) changed", profile, total);
                    return 0;
                }

                case "reset":
                {
                    if (!args.Contains("--demo"))
                    {
                        logger.LogError("db reset: refusing without --demo (it deletes every transactional row)");
                        return 2;
                    }
                    var deleted = await ResetAsync(services, logger);
                    var total = await RunSeedAsync(services, logger, DemoProfile, app.Environment, throwOnFailure: true);
                    logger.LogInformation("db reset --demo: {Deleted} row(s) deleted, {Total} row(s) re-seeded", deleted, total);
                    return 0;
                }

                default:
                    logger.LogError("usage: db migrate | db seed --profile reference|demo | db reset --demo");
                    return 2;
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "db {Verb} FAILED", verb);
            return 1;
        }
    }

    private static string? ValueOf(string[] args, string name)
    {
        var i = Array.FindIndex(args, a => string.Equals(a, name, StringComparison.OrdinalIgnoreCase));
        return i >= 0 && i + 1 < args.Length ? args[i + 1] : null;
    }

    // =====================================================================================
    // Migrations
    // =====================================================================================

    private static async Task<int> MigrateAsync(IServiceProvider services, ILogger logger, bool failFast)
    {
        var failures = 0;

        foreach (var ctx in ResolveAllContexts(services))
        {
            var name = ctx.GetType().Name;
            try
            {
                var pending = (await ctx.Database.GetPendingMigrationsAsync()).ToList();
                if (pending.Count == 0) { logger.LogInformation("{Context}: up to date", name); continue; }

                logger.LogInformation("{Context}: applying {Count} migration(s)", name, pending.Count);
                await ctx.Database.MigrateAsync();
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Migration failed for {Context}", name);
                failures++;
                if (failFast) throw new InvalidOperationException($"Migration failed for {name}. Aborting.", ex);
            }
        }

        return failures;
    }

    /// <summary>
    /// THE authoritative list of every module DbContext. Migrations, the schema smoke check and any
    /// future maintenance command must all read it from here - a context missing from this list is
    /// a context whose tables silently never get created (that is how <c>CustomFieldDbContext</c>
    /// was lost once already).
    /// </summary>
    public static DbContext[] ResolveAllContexts(IServiceProvider services) => new DbContext[]
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

    // =====================================================================================
    // Seed registry
    // =====================================================================================

    /// <summary>
    /// Every seed step, in run order. Wave-2 module tracks append their own steps here after
    /// adding the seeder under their module's <c>Infrastructure/Seed/</c> folder.
    ///
    /// Order matters in exactly two places and both are load-bearing:
    ///   30 warehouses BEFORE 31 stores - the store's primary-warehouse link needs the warehouse;
    ///   40 catalogue   AFTER  30        - opening balances are written into KHO-CHINH.
    /// </summary>
    public static IReadOnlyList<SeedStep> AllSteps { get; } = new List<SeedStep>
    {
        new("identity.roles", ReferenceProfile, 10, async (sp, ct) =>
        {
            await IdentitySeeder.SeedReferenceAsync(sp, sp.GetService<ILoggerFactory>()?.CreateLogger("Identity.Seeder"));
            return 0; // additive and self-reporting; it never rewrites an administrator's claims
        }),

        new("systemconfig.settings", ReferenceProfile, 20, (sp, ct) =>
            SystemConfigDbSeeder.SeedAsync(sp.GetRequiredService<SystemConfigDbContext>(), ct)),

        new("systemconfig.menus", ReferenceProfile, 21, (sp, ct) =>
            BackofficeMenuSeeder.SeedAsync(sp.GetRequiredService<SystemConfigDbContext>(), ct)),

        new("systemconfig.reports", ReferenceProfile, 22, async (sp, ct) =>
        {
            await ReportDefinitionSeeder.SeedAsync(sp.GetRequiredService<SystemConfigDbContext>());
            return 0;
        }),

        new("inventory.warehouses", ReferenceProfile, 30, (sp, ct) =>
            WarehouseSeeder.SeedAsync(sp.GetRequiredService<InventoryDbContext>(), ct)),

        new("systemconfig.stores", ReferenceProfile, 31, async (sp, ct) =>
        {
            var config = sp.GetRequiredService<SystemConfigDbContext>();
            var phone = await ConfigValueAsync(config, "COMPANY_HOTLINE", ct);
            var email = await ConfigValueAsync(config, "COMPANY_EMAIL", ct);
            return await StoreSeeder.SeedAsync(config, WarehouseSeeder.MainId, phone, email, ct);
        }),

        new("inventory.po-approval-rules", ReferenceProfile, 32, (sp, ct) =>
            PoApprovalRuleSeeder.SeedAsync(sp.GetRequiredService<InventoryDbContext>(), ct)),

        new("sales.return-policy", ReferenceProfile, 33, (sp, ct) =>
            ReturnPolicySeeder.SeedAsync(sp.GetRequiredService<SalesDbContext>(), ct)),

        new("warranty.policies", ReferenceProfile, 34, (sp, ct) =>
            WarrantyPolicySeeder.SeedAsync(sp.GetRequiredService<WarrantyDbContext>(), ct)),

        new("catalog.reference", ReferenceProfile, 39, async (sp, ct) =>
        {
            await CatalogDbSeeder.SeedAsync(sp.GetRequiredService<CatalogDbContext>());
            return 0;
        }),

        new("catalog.products", ReferenceProfile, 40, (sp, ct) => SeedCatalogueAsync(sp, ct)),

        new("content.pages", ReferenceProfile, 50, async (sp, ct) =>
        {
            await ContentDbSeeder.SeedAsync(sp.GetRequiredService<ContentDbContext>());
            return 0;
        }),

        new("hr.job-listings", ReferenceProfile, 51, async (sp, ct) =>
        {
            await HRDbSeeder.SeedAsync(sp.GetRequiredService<HRDbContext>());
            return 0;
        }),

        new("identity.admin-bootstrap", ReferenceProfile, 90, BootstrapAdminAsync),

        // ----- demo profile: Development only, enforced again inside RunSeedAsync -----
        new("identity.demo-users", DemoProfile, 95, async (sp, ct) =>
        {
            // The environment is read here, NOT hard-coded to true: IdentitySeeder has its own
            // `if (!isDevelopment) return` guard, and passing a literal `true` would disable it,
            // leaving the profile downgrade in RunSeedAsync as the only thing between documented
            // dev passwords and a production database. Two independent guards, as intended.
            // GetService, not GetRequiredService: if the environment cannot be resolved the guard
            // must FAIL CLOSED (no demo accounts), never throw and never assume Development.
            var isDevelopment = sp.GetService<IHostEnvironment>()?.IsDevelopment() ?? false;
            await IdentitySeeder.SeedDemoUsersAsync(sp, isDevelopment,
                sp.GetService<ILoggerFactory>()?.CreateLogger("Identity.Seeder"));
            return 0;
        }),
    };

    /// <summary>
    /// Runs the steps for <paramref name="profile"/>. The demo profile always includes the
    /// reference profile - "demo" means "reference plus the demo accounts", never "instead of".
    /// </summary>
    public static async Task<int> RunSeedAsync(
        IServiceProvider services, ILogger logger, string profile, IHostEnvironment env,
        bool throwOnFailure, CancellationToken ct = default)
    {
        if (profile == DemoProfile && !env.IsDevelopment())
        {
            // Documented dev passwords in a staging or production database is the single worst
            // thing a seeder can do, so the guard sits here as well as inside IdentitySeeder.
            logger.LogWarning("db seed: profile 'demo' is Development-only; falling back to 'reference' in {Env}", env.EnvironmentName);
            profile = ReferenceProfile;
        }

        var steps = AllSteps
            .Where(s => s.Profile == ReferenceProfile || s.Profile == profile)
            .OrderBy(s => s.Order)
            .ToList();

        var total = 0;
        var failed = new List<string>();

        foreach (var step in steps)
        {
            try
            {
                var changed = await step.Run(services, ct);
                total += changed;
                logger.LogInformation("seed {Step}: {Changed} change(s)", step.Name, changed);
            }
            catch (Exception ex)
            {
                failed.Add(step.Name);
                logger.LogError(ex, "seed {Step} FAILED", step.Name);
            }
        }

        if (failed.Count > 0 && throwOnFailure)
            throw new InvalidOperationException($"Seed step(s) failed: {string.Join(", ", failed)}");

        return total;
    }

    private static async Task<string> ConfigValueAsync(SystemConfigDbContext db, string key, CancellationToken ct)
    {
        var row = await db.Configurations.AsNoTracking().FirstOrDefaultAsync(c => c.Key == key, ct);
        return row?.Value ?? string.Empty;
    }

    /// <summary>
    /// The 70-product catalogue plus its opening stock. Skipped with a warning - not an error -
    /// when the versioned dataset is not on disk, which is the normal case for a published binary
    /// that was deployed without it (see docs/deployment-guide.md, "Catalogue dataset").
    /// </summary>
    private static async Task<int> SeedCatalogueAsync(IServiceProvider sp, CancellationToken ct)
    {
        var logger = sp.GetRequiredService<ILoggerFactory>().CreateLogger("seed.catalog");
        var datasetDir = Environment.GetEnvironmentVariable("QH_IMPORT_DATASET") ?? FindDataset();
        if (datasetDir is null)
        {
            logger.LogWarning("catalog.products: dataset not found (set QH_IMPORT_DATASET) - skipping catalogue import");
            return 0;
        }

        var catalog = sp.GetRequiredService<CatalogDbContext>();
        var inventory = sp.GetRequiredService<InventoryDbContext>();

        var summary = new ProductImportSummary();
        var loader = new ImportDatasetLoader(datasetDir);

        // ProductDatasetImporter opens its own transaction. Every module registers its DbContext
        // with EnableRetryOnFailure, and NpgsqlRetryingExecutionStrategy refuses a user-initiated
        // transaction unless the whole unit runs inside the strategy. The standalone
        // ProductImporter tool never hit this because it news up a context without retries.
        await catalog.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            await new ProductDatasetImporter(catalog, loader).RunAsync(summary, ct);
        });

        if (summary.ProductsFailed > 0)
            throw new InvalidOperationException($"catalogue import: {summary.ProductsFailed} product(s) failed");

        var balances = await catalog.Products.AsNoTracking()
            .Select(p => new { p.Id, p.Sku, p.StockQuantity, p.CostPrice })
            .ToListAsync(ct);

        var stockChanges = await OpeningBalanceSeeder.SeedAsync(
            inventory, balances.Select(b => (b.Id, b.Sku, b.StockQuantity, b.CostPrice)).ToList(), summary, ct);

        logger.LogInformation("catalog.products: {Summary}", summary);

        // MediaWritten / SpecRowsWritten count rows RECONCILED, not rows changed - they are the
        // same on every run, which is why ProductImportSummary.IsNoOp ignores them. Counting them
        // here would make a clean re-run report hundreds of "changes" and destroy the one signal
        // this whole contract rests on.
        return summary.CategoriesUpdated + summary.BrandsCreated + summary.BrandsUpdated
             + summary.ProductsCreated + summary.ProductsUpdated + stockChanges;
    }

    private const string DatasetRelativePath = "backend/Services/Catalog/Infrastructure/Data/Import/dataset";

    private static string? FindDataset()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, DatasetRelativePath);
            if (Directory.Exists(candidate)) return candidate;
            dir = dir.Parent;
        }
        return null;
    }

    // =====================================================================================
    // Production admin bootstrap
    // =====================================================================================

    /// <summary>
    /// Creates exactly one administrator on a database that has none, from
    /// <c>ADMIN_EMAIL</c> + <c>ADMIN_INITIAL_PASSWORD</c>, and forces a password change on first
    /// login. Does nothing when an admin already exists - it can never be used to re-grant
    /// privileges behind an operator's back, and it never touches an existing account's password.
    /// </summary>
    private static async Task<int> BootstrapAdminAsync(IServiceProvider sp, CancellationToken ct)
    {
        var logger = sp.GetRequiredService<ILoggerFactory>().CreateLogger("seed.admin");
        var userManager = sp.GetRequiredService<UserManager<ApplicationUser>>();

        var existing = await SystemRoleGuard.GetActiveAdminIdsAsync(userManager);
        if (existing.Count > 0) return 0;

        var email = Environment.GetEnvironmentVariable("ADMIN_EMAIL");
        var password = Environment.GetEnvironmentVariable("ADMIN_INITIAL_PASSWORD");
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning(
                "No account holds the Admin role and ADMIN_EMAIL / ADMIN_INITIAL_PASSWORD are not set. " +
                "Nobody can administer this system - set both and run `db seed --profile reference` again.");
            return 0;
        }

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FullName = "Quản trị hệ thống",
            EmailConfirmed = true,
            ForcePasswordChange = true
        };

        var created = await userManager.CreateAsync(user, password);
        if (!created.Succeeded)
        {
            throw new InvalidOperationException(
                "Could not create the bootstrap administrator: " +
                string.Join(", ", created.Errors.Select(e => e.Description)));
        }

        await userManager.AddToRoleAsync(user, BuildingBlocks.Security.Roles.Admin);
        logger.LogWarning("Bootstrapped administrator {Email}; the password must be changed at first login.", email);
        return 1;
    }

    // =====================================================================================
    // db reset --demo
    // =====================================================================================

    /// <summary>
    /// Transactional tables, in child-before-parent order. Reference data (roles, config, menus,
    /// pages, categories, brands, products, policies) is NOT listed: <c>db reset --demo</c> exists
    /// to give a demo a clean set of orders, not to rebuild the shop.
    /// </summary>
    private static readonly string[] TransactionalTables =
    {
        @"""OrderItem""", @"""OrderHistories""", @"""ReturnRequests""", @"""Orders""",
        @"""CartItem""", @"""Carts""", @"""CheckoutSessions""", @"""WishlistItems""",
        @"""LoyaltyTransactions""", @"""LoyaltyAccounts""",
        @"""StockReservations""", @"""StockMovements""", @"""GoodsReceivedNotes""",
        @"""POApprovalRequests""", @"""PurchaseOrders""", @"""PurchaseRequisitions""",
        @"""Claims""", @"""Rmas""", @"""ProductWarranties""",
        @"""ServiceBookings""", @"""WorkOrders""",
        @"crm.""Leads""", @"crm.""CustomerAnalytics""",
        @"communication.""Conversations""", @"communication.""NotificationLogs""",
    };

    /// <summary>
    /// D03: refuses any database whose name does not end in <c>_test</c> or <c>_demo</c>. The
    /// guard is on the database NAME rather than on a flag, because the mistake this prevents -
    /// pointing a reset at the live database - is exactly the mistake where a flag gets passed by
    /// habit. There is no override.
    /// </summary>
    private static async Task<int> ResetAsync(IServiceProvider services, ILogger logger)
    {
        var db = services.GetRequiredService<SalesDbContext>();
        var name = db.Database.GetDbConnection().Database ?? "";

        if (!name.EndsWith("_test", StringComparison.OrdinalIgnoreCase) &&
            !name.EndsWith("_demo", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"db reset REFUSED: database '{name}' is not a throwaway database. " +
                "Only a name ending in _test or _demo may be reset. There is no override flag.");
        }

        logger.LogWarning("db reset --demo: truncating {Count} transactional table(s) in {Database}",
            TransactionalTables.Length, name);

        var deleted = 0;
        foreach (var table in TransactionalTables)
        {
            try
            {
                // Concatenated, not interpolated: the interpolated overload triggers EF1002, and
                // a table name cannot be a parameter anyway. Every value comes from the private
                // const array above, never from input.
                deleted += await db.Database.ExecuteSqlRawAsync("DELETE FROM " + table);
            }
            catch (Exception ex)
            {
                // A table that a later migration renamed or dropped must not abort the reset.
                logger.LogWarning("db reset: skipped {Table} ({Message})", table, ex.Message);
            }
        }

        return deleted;
    }
}
