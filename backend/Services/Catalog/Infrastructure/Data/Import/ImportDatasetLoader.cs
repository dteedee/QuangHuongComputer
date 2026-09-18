using System.Text.Json;

namespace Catalog.Infrastructure.Data.Import;

/// <summary>
/// Reads the versioned import dataset off disk and applies the admission rules BEFORE any
/// database work starts: <c>imageStatus == "ok"</c>, media-manifest coverage, and the
/// official-source host allowlist. A record that fails any of them is reported with a reason
/// and left out - it is never imported with a substitute picture (D02 / honest-reporting rule).
/// </summary>
public sealed class ImportDatasetLoader
{
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    public string DatasetRoot { get; }

    public ImportDatasetLoader(string datasetRoot)
    {
        DatasetRoot = Path.GetFullPath(datasetRoot);
        if (!Directory.Exists(DatasetRoot))
            throw new DirectoryNotFoundException($"Import dataset not found: {DatasetRoot}");
    }

    public CategoryTaxonomyFile LoadTaxonomy()
        => Read<CategoryTaxonomyFile>(Path.Combine(DatasetRoot, "category-taxonomy.json"));

    public MediaManifestFile LoadMediaManifest()
        => Read<MediaManifestFile>(Path.Combine(DatasetRoot, "media-manifest.json"));

    public IReadOnlyCollection<string> LoadAllowedHosts()
        => Read<OfficialSourceDomainsFile>(Path.Combine(DatasetRoot, "official-source-domains.json"))
            .AllowedHosts.Select(h => h.Trim().ToLowerInvariant()).ToHashSet();

    /// <summary>All 70 curated records, in slug order, before any admission rule is applied.</summary>
    public List<ProductImportRecord> LoadAllRecords()
    {
        var dir = Path.Combine(DatasetRoot, "products");
        if (!Directory.Exists(dir)) throw new DirectoryNotFoundException($"Missing {dir}");

        var records = new List<ProductImportRecord>();
        foreach (var file in Directory.GetFiles(dir, "*.json").OrderBy(f => f, StringComparer.Ordinal))
        {
            var record = Read<ProductImportRecord>(file);
            var expectedSlug = Path.GetFileNameWithoutExtension(file);
            if (!string.Equals(record.Slug, expectedSlug, StringComparison.Ordinal))
                throw new InvalidDataException($"{file}: slug '{record.Slug}' does not match the file name '{expectedSlug}'");
            records.Add(record);
        }
        return records;
    }

    /// <summary>
    /// Splits the dataset into what may be imported and what may not, with a reason per rejection.
    /// </summary>
    public (List<ProductImportRecord> Admitted, List<(string Slug, string Reason)> Rejected) Partition(
        IEnumerable<ProductImportRecord> records,
        MediaManifestFile manifest,
        IReadOnlyCollection<string> allowedHosts)
    {
        var bySlug = manifest.Files
            .Where(f => string.Equals(f.Rendition, "main", StringComparison.OrdinalIgnoreCase))
            .GroupBy(f => f.Slug, StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.OrderBy(f => f.Path, StringComparer.Ordinal).ToList(), StringComparer.Ordinal);

        var admitted = new List<ProductImportRecord>();
        var rejected = new List<(string, string)>();

        foreach (var r in records)
        {
            // Fail loudly on an unknown flag value rather than defaulting to import.
            if (r.ImageStatus is not ("ok" or "partial" or "failed"))
                throw new InvalidDataException($"{r.Slug}: unknown imageStatus '{r.ImageStatus}' - refusing to guess");

            if (r.ImageStatus != "ok") { rejected.Add((r.Slug, $"imageStatus=\"{r.ImageStatus}\"")); continue; }

            if (!bySlug.TryGetValue(r.Slug, out var media) || media.Count == 0)
            {
                rejected.Add((r.Slug, "no published image in media-manifest.json"));
                continue;
            }

            var offending = media
                .Select(m => HostOf(m.SourceImageUrl))
                .Where(h => h is null || !allowedHosts.Contains(h))
                .Distinct()
                .ToList();
            if (offending.Count > 0)
            {
                rejected.Add((r.Slug, "source host outside official-source-domains.json: " + string.Join(", ", offending)));
                continue;
            }

            var missingBasis = media.Where(m => string.IsNullOrWhiteSpace(m.LicenseBasis)).ToList();
            if (missingBasis.Count > 0)
            {
                rejected.Add((r.Slug, $"{missingBasis.Count} manifest entries have no licenseBasis"));
                continue;
            }

            admitted.Add(r);
        }

        return (admitted, rejected);
    }

    private static string? HostOf(string url)
        => Uri.TryCreate(url, UriKind.Absolute, out var u) ? u.Host.ToLowerInvariant() : null;

    private static T Read<T>(string path)
    {
        if (!File.Exists(path)) throw new FileNotFoundException($"Import dataset file missing: {path}", path);
        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<T>(json, Json)
               ?? throw new InvalidDataException($"{path} deserialised to null");
    }
}
