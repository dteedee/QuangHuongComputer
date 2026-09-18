using System.Text.Json;
using Catalog.Domain;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Infrastructure.Data.Import;

/// <summary>
/// Turns the published seed files into <c>ProductMedias</c> rows.
///
/// D02: the database stores a RELATIVE path (<c>/media/seed/products/&lt;slug&gt;/01.webp</c>),
/// never an absolute URL - the host differs between the owner's box, dev and production, and an
/// absolute URL baked into 200 rows becomes a migration nobody wants. Exactly two renditions
/// exist per photo: the main file and its <c>-400</c> thumbnail; the thumbnail hangs off the
/// same row through <c>ThumbnailUrl</c>, never as a media row of its own.
///
/// Rows are UPSERTED by a deterministic id (SKU + published path), not deleted and re-created:
/// delete-then-insert of the same primary key inside one <c>SaveChanges</c> makes EF throw on
/// the duplicate tracked key, and it would churn ids on every gate run.
/// </summary>
public sealed class ProductMediaImporter
{
    private readonly CatalogDbContext _db;

    public ProductMediaImporter(CatalogDbContext db) => _db = db;

    /// <summary>
    /// Makes the product's media set equal to what the manifest published for it.
    /// Returns the primary image path (for <c>Products.ImageUrl</c>) and the gallery JSON.
    /// </summary>
    public async Task<(string? PrimaryUrl, string GalleryJson, int Written)> SyncAsync(
        Product product,
        string sku,
        IReadOnlyList<MediaManifestEntry> mains,
        IReadOnlyDictionary<string, MediaManifestEntry> thumbsByMainPath,
        CancellationToken ct = default)
    {
        var existing = await _db.ProductMedias
            .Where(m => m.ProductId == product.Id)
            .ToDictionaryAsync(m => m.Id, ct);

        var keep = new HashSet<Guid>();
        var urls = new List<string>();
        var order = 0;

        foreach (var entry in mains.OrderBy(m => m.Path, StringComparer.Ordinal))
        {
            thumbsByMainPath.TryGetValue(entry.Path, out var thumb);
            var id = DeterministicGuid.ForProductMedia(sku, entry.Path);
            var alt = string.IsNullOrWhiteSpace(entry.Alt) ? product.Name : entry.Alt;
            var isPrimary = order == 0;

            if (existing.TryGetValue(id, out var row))
            {
                row.UpdateAltText(alt);
                row.UpdateSortOrder(order);
                if (row.IsPrimary != isPrimary) row.SetPrimary(isPrimary);
                SetInfrastructureFields(row, entry.Path, thumb?.Path, entry.Bytes);
            }
            else
            {
                var media = ProductMedia.CreateImage(
                    productId: product.Id,
                    url: entry.Path,
                    thumbnailUrl: thumb?.Path,
                    altText: alt,
                    sortOrder: order,
                    isPrimary: isPrimary,
                    fileSize: entry.Bytes);
                _db.ProductMedias.Add(media);
                _db.Entry(media).Property("Id").CurrentValue = id;
            }

            keep.Add(id);
            urls.Add(entry.Path);
            order++;
        }

        foreach (var (id, row) in existing)
            if (!keep.Contains(id)) _db.ProductMedias.Remove(row);

        return (urls.FirstOrDefault(), JsonSerializer.Serialize(urls), urls.Count);
    }

    /// <summary>
    /// <c>Url</c>, <c>ThumbnailUrl</c> and <c>FileSize</c> have no domain mutator - they are
    /// storage facts, not business state - so they are written through the change tracker.
    /// </summary>
    private void SetInfrastructureFields(ProductMedia row, string url, string? thumbnailUrl, long bytes)
    {
        var entry = _db.Entry(row);
        entry.Property(nameof(ProductMedia.Url)).CurrentValue = url;
        entry.Property(nameof(ProductMedia.ThumbnailUrl)).CurrentValue = thumbnailUrl;
        entry.Property(nameof(ProductMedia.FileSize)).CurrentValue = bytes;
    }

    /// <summary>Index the manifest once: main entries per slug, thumbnails keyed by their main file.</summary>
    public static (Dictionary<string, List<MediaManifestEntry>> Mains,
                   Dictionary<string, MediaManifestEntry> ThumbsByMainPath)
        Index(MediaManifestFile manifest)
    {
        var mains = manifest.Files
            .Where(f => string.Equals(f.Rendition, "main", StringComparison.OrdinalIgnoreCase))
            .GroupBy(f => f.Slug, StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.OrderBy(f => f.Path, StringComparer.Ordinal).ToList(), StringComparer.Ordinal);

        var thumbs = new Dictionary<string, MediaManifestEntry>(StringComparer.Ordinal);
        foreach (var t in manifest.Files.Where(f => string.Equals(f.Rendition, "thumb", StringComparison.OrdinalIgnoreCase)))
        {
            // "/media/seed/products/<slug>/01-400.webp" -> "/media/seed/products/<slug>/01.webp"
            var mainPath = t.Path.Replace("-400.webp", ".webp", StringComparison.Ordinal);
            thumbs[mainPath] = t;
        }

        return (mains, thumbs);
    }
}
