using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Application.BulkOps;

/// <summary>
/// Key Insights: `Products.Slug` is unique and `SlugGenerator.Generate` does not de-duplicate.
/// A 5.000-row commit dies at the first collision unless slugs are allocated against BOTH the
/// database and the set already handed out within this same file - two rows in one upload can
/// generate the same base slug (e.g. "Chuột Logitech M100" appearing twice with different SKUs).
/// </summary>
public sealed class ProductSlugAllocator
{
    private readonly HashSet<string> _existingDbSlugs;
    private readonly HashSet<string> _allocatedThisFile = new(StringComparer.Ordinal);

    private ProductSlugAllocator(HashSet<string> existingDbSlugs) => _existingDbSlugs = existingDbSlugs;

    public static async Task<ProductSlugAllocator> LoadAsync(CatalogDbContext db, CancellationToken ct)
    {
        // IgnoreQueryFilters: a discontinued/inactive product still occupies its slug.
        var slugs = await db.Products.IgnoreQueryFilters().Select(p => p.Slug).ToListAsync(ct);
        return new ProductSlugAllocator(new HashSet<string>(slugs, StringComparer.Ordinal));
    }

    /// <param name="excludeExistingProductSlug">When updating an existing row (matched by SKU), its
    /// own current slug must not count as a collision against itself.</param>
    public (string Slug, bool Renamed) Allocate(string name, string? excludeExistingProductSlug = null)
    {
        var baseSlug = SlugGenerator.Generate(name);
        if (string.IsNullOrEmpty(baseSlug)) baseSlug = "san-pham";

        bool Taken(string candidate)
        {
            if (excludeExistingProductSlug is not null && candidate == excludeExistingProductSlug) return false;
            return _existingDbSlugs.Contains(candidate) || _allocatedThisFile.Contains(candidate);
        }

        if (!Taken(baseSlug))
        {
            _allocatedThisFile.Add(baseSlug);
            return (baseSlug, false);
        }

        var counter = 2;
        string candidate;
        do
        {
            candidate = $"{baseSlug}-{counter}";
            counter++;
        } while (Taken(candidate));

        _allocatedThisFile.Add(candidate);
        return (candidate, true);
    }
}
