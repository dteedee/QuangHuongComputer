using Accounting;
using Ai;
using ApiGateway.Startup;
using Catalog;
using Communication;
using Content;
using CRM;
using HR;
using Identity;
using InventoryModule;
using Payments;
using Repair;
using Reporting;
using Sales;
using SystemConfig;
using Warranty;

namespace QuangHuong.Tools.DbCli;

/// <summary>
/// Standalone entry point for the database verbs:
///
///   dotnet DbCli.dll --connection "Host=...;Database=qh_seed_test;..." db migrate
///   dotnet DbCli.dll --connection "..." db seed --profile reference
///   dotnet DbCli.dll --connection "..." db reset --demo
///
/// The verb parsing and every seeder are <see cref="DatabaseMigrationRunner"/>'s - this file only
/// assembles the service graph. Running `db migrate` here and running it through
/// `dotnet ApiGateway.dll db migrate` execute the same code.
///
/// The connection string is explicit and is never read from the API's appsettings: pointing a
/// schema-writing tool at the wrong database is the one mistake that must be impossible to make
/// by accident (D12). A database whose name is not clearly a rehearsal database is refused.
/// </summary>
public static class Program
{
    public static async Task<int> Main(string[] args)
    {
        // The schema uses `timestamp without time zone` throughout and the API runs with this
        // switch on (ApiGateway/Program.cs). Without it Npgsql refuses every UTC DateTime the
        // domain sets, and the seed would write timestamps the API cannot read.
        AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

        var connection = ValueOf(args, "--connection") ?? Environment.GetEnvironmentVariable("QH_DB_CONNECTION");
        if (string.IsNullOrWhiteSpace(connection))
        {
            Console.Error.WriteLine("usage: DbCli --connection <npgsql connection string> db <migrate|seed|reset> [...]");
            return 2;
        }

        var database = DatabaseNameOf(connection);
        var isRehearsal = database.EndsWith("_test", StringComparison.OrdinalIgnoreCase)
                          || database.EndsWith("_demo", StringComparison.OrdinalIgnoreCase)
                          || database.StartsWith("qh_", StringComparison.OrdinalIgnoreCase);
        if (!isRehearsal && !args.Contains("--i-know-this-is-the-real-database"))
        {
            Console.Error.WriteLine($"REFUSED: '{database}' is not a rehearsal database (*_test / *_demo / qh_*).");
            Console.Error.WriteLine("Only the orchestrator runs this against the live database, at the wave gate.");
            return 3;
        }

        Console.WriteLine($"database : {database}");

        // Args are passed through DELIBERATELY, even though this CLI reads none of them from
        // configuration: ApiGateway/Program.cs calls WebApplication.CreateBuilder(args) with the
        // very same "db migrate" / "db seed --profile reference" tokens, and the command-line
        // configuration provider is strict about argument shape. Passing them here means this
        // project proves that a bare verb token does not upset the builder.
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            // ConfigurationArgs, not args: a valueless `--demo` would otherwise make the
            // command-line configuration provider swallow the token after it. This CLI sets the
            // connection string explicitly below, so it was never affected - keeping the two
            // entry points identical is what stops the ApiGateway bug from being invisible here.
            Args = DatabaseMigrationRunner.ConfigurationArgs(
                args.SkipWhile(a => !string.Equals(a, "db", StringComparison.OrdinalIgnoreCase)).ToArray()),
            EnvironmentName = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development",
        });

        builder.Configuration["ConnectionStrings:DefaultConnection"] = connection;
        // Jwt:Key is read at registration time by AddIdentityModule; the CLI issues no tokens, so
        // a per-process throwaway keeps the module happy without putting a secret in this file.
        builder.Configuration["Jwt:Key"] ??= Convert.ToBase64String(Guid.NewGuid().ToByteArray()) + Guid.NewGuid();
        builder.Logging.ClearProviders();
        builder.Logging.AddSimpleConsole(o => { o.SingleLine = true; o.TimestampFormat = "HH:mm:ss "; });

        // Development validates the whole container on Build(). ApiGateway's ServiceRegistration
        // also wires SignalR hubs, MassTransit, e-mail and HTTP clients; this process wires only
        // the modules, so validation would fail on services the CLI never resolves. Everything the
        // verbs DO resolve (the 15 DbContexts, UserManager, RoleManager) is registered above and is
        // still resolved eagerly - a missing one is still an immediate, loud failure.
        builder.Host.UseDefaultServiceProvider(o =>
        {
            o.ValidateOnBuild = false;
            o.ValidateScopes = false;
        });

        var cfg = builder.Configuration;
        builder.Services.AddCatalogModule(cfg);
        builder.Services.AddSalesModule(cfg);
        builder.Services.AddRepairModule(cfg);
        builder.Services.AddWarrantyModule(cfg);
        builder.Services.AddInventoryModule(cfg);
        builder.Services.AddAccountingModule(cfg);
        builder.Services.AddIdentityModule(cfg);
        builder.Services.AddPaymentsModule(cfg);
        builder.Services.AddContentModule(cfg);
        builder.Services.AddAiModule(cfg);
        builder.Services.AddCommunicationModule(cfg);
        builder.Services.AddHRModule(cfg);
        builder.Services.AddSystemConfigModule(cfg);
        builder.Services.AddReportingModule();
        builder.Services.AddCrmModule(cfg);

        var app = builder.Build();

        var verbArgs = args.SkipWhile(a => !string.Equals(a, "db", StringComparison.OrdinalIgnoreCase)).ToArray();
        if (!DatabaseMigrationRunner.IsDbCommand(verbArgs))
        {
            Console.Error.WriteLine("usage: DbCli --connection <...> db <migrate|seed|reset> [...]");
            return 2;
        }

        return await DatabaseMigrationRunner.RunCommandAsync(app, verbArgs);
    }

    private static string? ValueOf(string[] args, string name)
    {
        var i = Array.IndexOf(args, name);
        return i >= 0 && i + 1 < args.Length ? args[i + 1] : null;
    }

    private static string DatabaseNameOf(string connection)
    {
        foreach (var part in connection.Split(';', StringSplitOptions.RemoveEmptyEntries))
        {
            var kv = part.Split('=', 2);
            if (kv.Length == 2 && kv[0].Trim().Equals("Database", StringComparison.OrdinalIgnoreCase))
                return kv[1].Trim();
        }
        return "(unknown)";
    }
}
