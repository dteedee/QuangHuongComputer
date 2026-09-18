using Catalog.Infrastructure;
using Catalog.Infrastructure.Data;
using Catalog.Infrastructure.Data.Import;
using InventoryModule.Infrastructure;
using InventoryModule.Infrastructure.Seed;
using Microsoft.EntityFrameworkCore;

namespace QuangHuong.Tools.ProductImporter;

/// <summary>
/// Operator entry point for the W0-6 product import.
///
///   dotnet ProductImporter.dll --connection "Host=...;Database=qh_w06_test;..." [--dataset DIR] [--dry-run]
///
/// The connection string is passed explicitly and is never read from the API's appsettings:
/// pointing this tool at the wrong database is the one mistake it must be impossible to make
/// by accident. It refuses a database whose name is not clearly a rehearsal database unless
/// --i-know-this-is-the-real-database is given, which is the orchestrator's flag, not a track's.
/// </summary>
public static class Program
{
    private const string RepoRelativeDataset = "backend/Services/Catalog/Infrastructure/Data/Import/dataset";
    private const string RepoRelativeWebroot = "backend/ApiGateway/wwwroot";

    public static async Task<int> Main(string[] args)
    {
        // The schema uses `timestamp without time zone` throughout and the API runs with this
        // switch on (ApiGateway/Program.cs:25). Without it here, Npgsql refuses every UTC
        // DateTime the domain sets, and the importer would write timestamps the API cannot read.
        AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

        try
        {
            var connection = Arg(args, "--connection") ?? Environment.GetEnvironmentVariable("QH_IMPORT_CONNECTION");
            if (string.IsNullOrWhiteSpace(connection))
            {
                Console.Error.WriteLine("usage: ProductImporter --connection <npgsql connection string> [--dataset DIR] [--dry-run]");
                return 2;
            }

            var database = DatabaseNameOf(connection);
            var isRehearsal = database.EndsWith("_test", StringComparison.OrdinalIgnoreCase)
                              || database.StartsWith("qh_w", StringComparison.OrdinalIgnoreCase);
            if (!isRehearsal && !args.Contains("--i-know-this-is-the-real-database"))
            {
                Console.Error.WriteLine($"REFUSED: '{database}' is not a rehearsal database (*_test / qh_w*).");
                Console.Error.WriteLine("Only the orchestrator runs this against the live database, at the wave gate.");
                return 3;
            }

            // `--artifacts-path` (how scripts/qh-build.sh builds) puts the binary outside the
            // repository, so the walk-up cannot find the dataset - pass it, or set the env var.
            var datasetDir = Arg(args, "--dataset")
                             ?? Environment.GetEnvironmentVariable("QH_IMPORT_DATASET")
                             ?? FindDataset();
            var dryRun = args.Contains("--dry-run");

            Console.WriteLine($"database : {database}");
            Console.WriteLine($"dataset  : {datasetDir}");
            Console.WriteLine($"mode     : {(dryRun ? "DRY RUN (rolled back)" : "commit")}");

            var catalogOptions = new DbContextOptionsBuilder<CatalogDbContext>().UseNpgsql(connection).Options;
            var inventoryOptions = new DbContextOptionsBuilder<InventoryDbContext>().UseNpgsql(connection).Options;

            await using var catalog = new CatalogDbContext(catalogOptions);
            await using var inventory = new InventoryDbContext(inventoryOptions);

            var summary = new ProductImportSummary();
            var loader = new ImportDatasetLoader(datasetDir);

            if (args.Contains("--verify-seeder"))
            {
                // Proves the revival trap is gone without restarting an API: CatalogDbSeeder is
                // exactly what runs on every API start, so running it here answers "would a
                // restart re-create the demo products?" directly.
                var before = await catalog.Products.IgnoreQueryFilters().CountAsync();
                await CatalogDbSeeder.SeedAsync(catalog);
                var after = await catalog.Products.IgnoreQueryFilters().CountAsync();
                var unsplash = await catalog.Products.IgnoreQueryFilters()
                    .CountAsync(p => p.ImageUrl != null && p.ImageUrl.ToLower().Contains("unsplash"));
                Console.WriteLine($"seeder: products {before} -> {after}, unsplash rows {unsplash}");
                return before == after && unsplash == 0 ? 0 : 1;
            }

            // Fail-closed pre-flight: the manifest is the only thing the admission rules look at,
            // so a manifest entry whose file was never published (or was swapped after
            // publication) would put a 404 into Products.ImageUrl with every check still green.
            var webroot = Arg(args, "--webroot")
                          ?? Environment.GetEnvironmentVariable("QH_IMPORT_WEBROOT")
                          ?? FindUp(RepoRelativeWebroot, loader.DatasetRoot);
            VerifyPublishedMedia(loader.LoadMediaManifest(), webroot);

            if (dryRun)
            {
                // Report what would be admitted / rejected without opening a write transaction.
                var manifest = loader.LoadMediaManifest();
                var (admitted, rejected) = loader.Partition(loader.LoadAllRecords(), manifest, loader.LoadAllowedHosts());
                Console.WriteLine($"would import {admitted.Count}, would reject {rejected.Count}");
                foreach (var (slug, reason) in rejected) Console.WriteLine($"  REJECTED {slug}: {reason}");
                return 0;
            }

            var importer = new ProductDatasetImporter(catalog, loader);
            await importer.RunAsync(summary);

            var balances = await catalog.Products
                .AsNoTracking()
                .Select(p => new { p.Id, p.Sku, p.StockQuantity, p.CostPrice })
                .ToListAsync();

            // Warehouse topology + opening balances moved to Inventory/Infrastructure/Seed by W1-4,
            // so this tool and `db seed --profile reference` run exactly the same code.
            await WarehouseSeeder.SeedAsync(inventory);
            await OpeningBalanceSeeder.SeedAsync(
                inventory, balances.Select(b => (b.Id, b.Sku, b.StockQuantity, b.CostPrice)).ToList(), summary);

            Console.WriteLine(summary);
            return summary.ProductsFailed == 0 ? 0 : 1;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("product import FAILED: " + ex);
            return 1;
        }
    }

    private static string? Arg(string[] args, string name)
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

    private static string FindDataset() => FindUp(RepoRelativeDataset, AppContext.BaseDirectory);

    /// <summary>
    /// Walk up from <paramref name="startDir"/> until the given repository-relative directory
    /// appears. The binary itself is built with <c>--artifacts-path</c> outside the repository,
    /// so the webroot is resolved from the dataset directory, which is inside it.
    /// </summary>
    private static string FindUp(string repoRelative, string startDir)
    {
        var dir = new DirectoryInfo(Path.GetFullPath(startDir));
        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, repoRelative);
            if (Directory.Exists(candidate)) return candidate;
            dir = dir.Parent;
        }
        throw new DirectoryNotFoundException(
            $"Could not locate {repoRelative} above {startDir}. Pass --webroot / --dataset explicitly.");
    }

    /// <summary>
    /// Every file the manifest claims must actually be published under the webroot, with the
    /// recorded size and sha256. Without this the import happily writes media rows for files
    /// that do not exist: the admission rules read the manifest, never the disk, so a pruned or
    /// swapped photo shows up as a broken image on the storefront and as a green assert here.
    /// </summary>
    private static void VerifyPublishedMedia(MediaManifestFile manifest, string webroot)
    {
        var problems = new List<string>();
        foreach (var file in manifest.Files)
        {
            var full = Path.Combine(webroot, file.Path.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (!File.Exists(full)) { problems.Add($"{file.Path}: not published under {webroot}"); continue; }

            var bytes = File.ReadAllBytes(full);
            if (bytes.LongLength != file.Bytes) { problems.Add($"{file.Path}: {bytes.LongLength} bytes on disk, manifest says {file.Bytes}"); continue; }

            var sha = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(bytes)).ToLowerInvariant();
            if (!string.Equals(sha, file.Sha256, StringComparison.OrdinalIgnoreCase))
                problems.Add($"{file.Path}: sha256 {sha} on disk, manifest says {file.Sha256}");
        }

        if (problems.Count == 0)
        {
            Console.WriteLine($"media     : {manifest.Files.Count} published files verified against media-manifest.json");
            return;
        }

        foreach (var p in problems.Take(10)) Console.Error.WriteLine("  MEDIA " + p);
        throw new InvalidDataException(
            $"{problems.Count} manifest entries do not match the published files. " +
            "Re-run scripts/product-media/publish-seed-media.cjs before importing.");
    }
}
