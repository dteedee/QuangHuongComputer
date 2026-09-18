using Microsoft.EntityFrameworkCore;

namespace ApiGateway.Startup;

/// <summary>
/// After migrations have run, proves that every table the EF model expects actually exists.
///
/// Why this is needed: <c>20260216160010_AddSePayTables</c> declared <c>DropTable("PaymentIntents")</c>
/// in Down() but never created the table in Up(). The model snapshot said the table existed, EF said
/// "all migrations applied", and nothing failed at startup — the drift only surfaced in production
/// traffic as <c>42P01 relation "payments.PaymentIntents" does not exist</c> on every payment, for
/// months. A migration history row proves a FILE ran; it proves nothing about the schema.
///
/// Cost: one <c>pg_class</c> query per DbContext (15 queries), not one query per table.
/// Behaviour: Production aborts startup; Development logs each missing table loudly and continues,
/// because a developer mid-migration must still be able to boot and run <c>dotnet ef</c>.
/// Disable with <c>Database:SchemaSmokeCheck=false</c>.
/// </summary>
public static class SchemaSmokeCheck
{
    public static async Task RunAsync(WebApplication app)
    {
        if (!app.Configuration.GetValue("Database:SchemaSmokeCheck", true))
        {
            app.Logger.LogInformation("Database:SchemaSmokeCheck=false — skipping the schema drift check");
            return;
        }

        using var scope = app.Services.CreateScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        var missing = new List<string>();

        foreach (var context in DatabaseMigrationRunner.ResolveAllContexts(scope.ServiceProvider))
        {
            try
            {
                missing.AddRange(await FindMissingTablesAsync(context));
            }
            catch (Exception ex)
            {
                // A context we cannot even query is a connectivity problem, not drift. Migration
                // already reported it; do not turn it into a false "table missing" verdict.
                logger.LogError(ex, "Schema smoke check could not query {Context}", context.GetType().Name);
            }
        }

        if (missing.Count == 0)
        {
            logger.LogInformation("Schema smoke check passed — every mapped table exists.");
            return;
        }

        foreach (var table in missing)
        {
            logger.LogError("SCHEMA DRIFT: {Table} is mapped by the EF model but does not exist in the database", table);
        }

        if (app.Environment.IsProduction())
        {
            throw new InvalidOperationException(
                $"Schema smoke check failed: {missing.Count} mapped table(s) missing — {string.Join(", ", missing)}. " +
                "Aborting startup: the migration history is out of sync with the actual schema.");
        }

        logger.LogWarning(
            "Schema smoke check found {Count} missing table(s). Startup continues because the environment is {Env}, " +
            "but every request touching them will fail with PostgreSQL 42P01.",
            missing.Count, app.Environment.EnvironmentName);
    }

    /// <summary>
    /// Compares the tables the model maps against the relations that exist, in a single round trip.
    /// Views, materialised views, foreign tables and partitioned tables all count as present.
    /// </summary>
    private static async Task<List<string>> FindMissingTablesAsync(DbContext context)
    {
        var expected = ExpectedTables(context);
        if (expected.Count == 0) return new List<string>();

        var existing = await ExistingRelationsAsync(context);
        return expected.Where(table => !existing.Contains(table)).OrderBy(t => t).ToList();
    }

    private static HashSet<string> ExpectedTables(DbContext context)
    {
        var defaultSchema = context.Model.GetDefaultSchema() ?? "public";
        var expected = new HashSet<string>(StringComparer.Ordinal);

        foreach (var entityType in context.Model.GetEntityTypes())
        {
            // Owned types and TPH children share their parent's table (same name -> deduped by the set).
            // A null table name means the entity maps to a view, a query or nothing at all.
            var tableName = entityType.GetTableName();
            if (string.IsNullOrEmpty(tableName)) continue;

            expected.Add($"{entityType.GetSchema() ?? defaultSchema}.{tableName}");
        }

        return expected;
    }

    private static async Task<HashSet<string>> ExistingRelationsAsync(DbContext context)
    {
        var existing = new HashSet<string>(StringComparer.Ordinal);
        var connection = context.Database.GetDbConnection();
        var openedHere = connection.State != System.Data.ConnectionState.Open;

        if (openedHere) await connection.OpenAsync();
        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = """
                SELECT n.nspname || '.' || c.relname
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f')
                  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
                """;

            await using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                existing.Add(reader.GetString(0));
            }
        }
        finally
        {
            if (openedHere) await connection.CloseAsync();
        }

        return existing;
    }
}
