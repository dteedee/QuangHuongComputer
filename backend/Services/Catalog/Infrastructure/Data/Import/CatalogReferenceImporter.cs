using Catalog.Domain;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Infrastructure.Data.Import;

/// <summary>
/// Brands and categories are ENRICHED IN PLACE, never dropped and re-created (D03):
/// <c>content."HomepageSections"."Configuration"</c> embeds 6 categoryId + 5 brandId as raw
/// UUIDs inside JSON with no foreign key, so a new id silently breaks the homepage.
///
/// Matching is by <c>unaccent(lower(Name))</c> and then by slug. A raw string match is not
/// safe: one accent typo anywhere in the dataset would create a duplicate category
/// (D03 found exactly that in dataset v1).
/// </summary>
public sealed class CatalogReferenceImporter
{
    private readonly CatalogDbContext _db;

    public CatalogReferenceImporter(CatalogDbContext db) => _db = db;

    /// <summary>Enriches the 10 real categories in place. Never creates one - a new row would
    /// mean the dataset named a category the shop does not have, which is a data error.</summary>
    public async Task<Dictionary<string, Category>> UpsertCategoriesAsync(
        CategoryTaxonomyFile taxonomy, ProductImportSummary summary, CancellationToken ct = default)
    {
        var existing = await _db.Categories.IgnoreQueryFilters().ToListAsync(ct);
        var byFolded = new Dictionary<string, Category>(StringComparer.Ordinal);

        foreach (var entry in taxonomy.Categories)
        {
            var folded = VietnameseTextNormalizer.Fold(entry.Name);
            var row = existing.FirstOrDefault(c => VietnameseTextNormalizer.Fold(c.Name) == folded)
                      ?? existing.FirstOrDefault(c => c.Slug == entry.Slug);

            if (row is null)
                throw new InvalidOperationException(
                    $"Category '{entry.Name}' is in the taxonomy map but not in the database. " +
                    "The importer enriches categories in place and never creates one (D03).");

            var before = Snapshot(row);
            if (!row.IsActive) row.Activate();
            row.SetSlug(entry.Slug);
            row.UpdatePresentation(displayOrder: entry.DisplayOrder, metaTitle: entry.MetaTitle, metaDescription: entry.MetaDescription);
            row.UpdatePolicy(vatRate: entry.VatRate, isSerialTracked: entry.IsSerialTracked);

            if (Snapshot(row) != before) summary.CategoriesUpdated++;
            byFolded[folded] = row;
        }

        await _db.SaveChangesAsync(ct);
        return byFolded;
    }

    /// <summary>
    /// Upserts one brand per distinct <c>brand</c> string in the dataset. Existing rows keep
    /// their id (HomepageSections depends on it) and take the dataset's spelling.
    /// </summary>
    public async Task<Dictionary<string, Brand>> UpsertBrandsAsync(
        IEnumerable<ProductImportRecord> records, ProductImportSummary summary, CancellationToken ct = default)
    {
        var existing = await _db.Brands.IgnoreQueryFilters().ToListAsync(ct);
        var result = new Dictionary<string, Brand>(StringComparer.Ordinal);

        var names = records.Select(r => r.Brand.Trim())
            .Where(n => n.Length > 0)
            .GroupBy(VietnameseTextNormalizer.Fold, StringComparer.Ordinal)
            .Select(g => g.First())
            .OrderBy(n => n, StringComparer.Ordinal)
            .ToList();

        var takenSlugs = existing.Where(b => !string.IsNullOrWhiteSpace(b.Slug))
            .Select(b => b.Slug).ToHashSet(StringComparer.Ordinal);

        foreach (var name in names)
        {
            var folded = VietnameseTextNormalizer.Fold(name);
            var slug = SlugGenerator.Generate(name);
            var row = existing.FirstOrDefault(b => VietnameseTextNormalizer.Fold(b.Name) == folded)
                      ?? existing.FirstOrDefault(b => !string.IsNullOrWhiteSpace(b.Slug) && b.Slug == slug);

            if (row is null)
            {
                // SlugGenerator can collide across two different names ("ASUS" / "Asus ROG" do not,
                // but a future dataset might) - keep the unique index happy without renaming a row.
                var unique = SlugGenerator.GenerateUnique(name, s => takenSlugs.Contains(s));
                row = new Brand(name, name);
                row.SetSlug(unique);
                takenSlugs.Add(unique);
                _db.Brands.Add(row);
                existing.Add(row);
                summary.BrandsCreated++;
            }
            else
            {
                var before = $"{row.Name}|{row.Slug}|{row.IsActive}";
                if (!row.IsActive) row.Activate();
                row.UpdateDetails(name, string.IsNullOrWhiteSpace(row.Description) ? name : row.Description);
                if (string.IsNullOrWhiteSpace(row.Slug))
                {
                    var unique = SlugGenerator.GenerateUnique(name, s => takenSlugs.Contains(s));
                    row.SetSlug(unique);
                    takenSlugs.Add(unique);
                }
                if ($"{row.Name}|{row.Slug}|{row.IsActive}" != before) summary.BrandsUpdated++;
            }

            result[folded] = row;
        }

        await _db.SaveChangesAsync(ct);
        return result;
    }

    private static string Snapshot(Category c)
        => $"{c.Name}|{c.Slug}|{c.DisplayOrder}|{c.IsSerialTracked}|{c.VatRate}|{c.MetaTitle}|{c.MetaDescription}|{c.IsActive}";
}
