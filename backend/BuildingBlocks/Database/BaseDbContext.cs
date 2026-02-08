using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Npgsql.EntityFrameworkCore.PostgreSQL;

namespace BuildingBlocks.Database;

/// <summary>
/// Base DbContext với schema separation support
/// Tất cả DbContexts nên inherit từ class này để có schema isolation
/// </summary>
public abstract class BaseDbContext : DbContext
{
    private readonly string _schemaName;

    protected BaseDbContext(DbContextOptions options, string schemaName) : base(options)
    {
        _schemaName = schemaName;
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Set default schema cho module này
        modelBuilder.HasDefaultSchema(_schemaName);

        base.OnModelCreating(modelBuilder);
    }

    /// <summary>
    /// Helper method để config connection string với schema
    /// </summary>
    protected static DbContextOptionsBuilder ConfigureOptions(
        DbContextOptionsBuilder options,
        string connectionString,
        string schemaName)
    {
        options.UseNpgsql(connectionString, npgsqlOptions =>
        {
            npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", schemaName);
            npgsqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(30),
                errorCodesToAdd: null);
        });

        // Enable sensitive data logging in development
#if DEBUG
        options.EnableSensitiveDataLogging();
        options.EnableDetailedErrors();
#endif

        return options;
    }
}

/// <summary>
/// Database configuration helper
/// </summary>
public static class DatabaseConfiguration
{
    /// <summary>
    /// Schema names cho từng module
    /// </summary>
    public static class Schemas
    {
        public const string Identity = "identity";
        public const string Catalog = "catalog";
        public const string Sales = "sales";
        public const string Inventory = "inventory";
        public const string Repair = "repair";
        public const string Warranty = "warranty";
        public const string Accounting = "accounting";
        public const string HR = "hr";
        public const string Content = "content";
        public const string Communication = "communication";
        public const string Payments = "payments";
        public const string SystemConfig = "system_config";
        public const string AI = "ai";
    }

    /// <summary>
    /// Get connection string từ configuration
    /// </summary>
    public static string GetConnectionString(IConfiguration configuration, string? overrideConnectionName = null)
    {
        var connectionName = overrideConnectionName ?? "DefaultConnection";
        var connectionString = configuration.GetConnectionString(connectionName);

        if (string.IsNullOrEmpty(connectionString))
        {
            throw new InvalidOperationException($"Connection string '{connectionName}' not found in configuration");
        }

        return connectionString;
    }

    /// <summary>
    /// Configure DbContext với schema separation
    /// </summary>
    public static void ConfigureDbContext<TContext>(
        this DbContextOptionsBuilder<TContext> options,
        IConfiguration configuration,
        string schemaName) where TContext : DbContext
    {
        var connectionString = GetConnectionString(configuration);

        options.UseNpgsql(connectionString, npgsqlOptions =>
        {
            npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", schemaName);
            npgsqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(30),
                errorCodesToAdd: null);
            npgsqlOptions.CommandTimeout(60);
        });

        // Performance optimization
        options.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);

#if DEBUG
        options.EnableSensitiveDataLogging();
        options.EnableDetailedErrors();
#endif
    }
}
