using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Application.BulkOps;

/// <summary>
/// Implementation Steps #2: category by `unaccent(lower(name))` then slug; brand by
/// `unaccent(lower(name))`; active rows only. More than one match is a row error naming the fix,
/// never an automatic choice. Matching happens in C# against a snapshot loaded once per import -
/// cheap because the shop has a few hundred categories/brands at most, and it lets us reuse the
/// exact same fold function the rest of Catalog already uses (`VietnameseTextNormalizer`,
/// see `CatalogReferenceImporter`) instead of a second SQL-side implementation.
/// </summary>
public sealed class CategoryBrandMatcher
{
    private readonly List<Category> _categories;
    private readonly List<Brand> _brands;

    private CategoryBrandMatcher(List<Category> categories, List<Brand> brands)
    {
        _categories = categories;
        _brands = brands;
    }

    public static async Task<CategoryBrandMatcher> LoadAsync(CatalogDbContext db, CancellationToken ct)
    {
        var categories = await db.Categories.Where(c => c.IsActive).ToListAsync(ct);
        var brands = await db.Brands.Where(b => b.IsActive).ToListAsync(ct);
        return new CategoryBrandMatcher(categories, brands);
    }

    /// <summary>Resolves a category by folded name, then by exact slug. Null id + non-null error
    /// on 0 or 2+ matches (ambiguity is never auto-resolved - Key Insights).</summary>
    public (Guid? Id, string? Error) MatchCategory(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return (null, "Danh mục không được để trống.");
        var folded = VietnameseTextNormalizer.Fold(text);

        var byName = _categories.Where(c => VietnameseTextNormalizer.Fold(c.Name) == folded).ToList();
        if (byName.Count == 1) return (byName[0].Id, null);
        if (byName.Count > 1) return (null, $"Tên danh mục '{text}' khớp nhiều hơn 1 danh mục đang hoạt động - dùng slug thay vì tên.");

        var bySlug = _categories.Where(c => c.Slug == text.Trim()).ToList();
        if (bySlug.Count == 1) return (bySlug[0].Id, null);
        if (bySlug.Count > 1) return (null, $"Slug danh mục '{text}' khớp nhiều hơn 1 danh mục.");

        return (null, $"Không tìm thấy danh mục '{text}' (đang hoạt động). Xem trang DanhMuc trong tệp mẫu.");
    }

    /// <summary>Brand has no import-facing slug (Key Insights) - name only, unique because of the
    /// `UNIQUE (Name, IsActive) WHERE IsActive` constraint an active-row match relies on.</summary>
    public (Guid? Id, string? Error) MatchBrand(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return (null, "Thương hiệu không được để trống.");
        var folded = VietnameseTextNormalizer.Fold(text);

        var matches = _brands.Where(b => VietnameseTextNormalizer.Fold(b.Name) == folded).ToList();
        if (matches.Count == 1) return (matches[0].Id, null);
        if (matches.Count > 1) return (null, $"Tên thương hiệu '{text}' khớp nhiều hơn 1 thương hiệu đang hoạt động (không nên xảy ra).");

        return (null, $"Không tìm thấy thương hiệu '{text}' (đang hoạt động). Xem trang DanhMuc trong tệp mẫu.");
    }

    /// <summary>Rows for the `DanhMuc` lookup sheet (Architecture) - names the operator can pick
    /// from without guessing spelling.</summary>
    public IReadOnlyList<string> CategoryNames => _categories.Select(c => c.Name).OrderBy(n => n).ToList();
    public IReadOnlyList<string> BrandNames => _brands.Select(b => b.Name).OrderBy(n => n).ToList();
}
