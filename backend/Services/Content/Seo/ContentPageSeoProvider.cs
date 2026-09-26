using System.Text.RegularExpressions;
using BuildingBlocks.Seo;
using Content.Domain;
using Content.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Content.Seo;

/// <summary>
/// `/gioi-thieu`, `/lien-he`, `/dieu-khoan`, `/bao-mat`, `/chinh-sach/{type}` — all backed by
/// `CMSPage`, matched by its own `Slug` field (admin-controlled, already exactly `gioi-thieu` /
/// `lien-he` / `van-chuyen` / `doi-tra` / ... in the seeded DB — verified with a read-only
/// `SELECT "Slug","Type" FROM content."Pages"` on 2026-09-18). `/dieu-khoan` and `/bao-mat` have NO
/// CMSPage row today (no Terms/Privacy page has been written yet) — resolves as a real 404 rather
/// than fabricating placeholder content; the moment content staff publish those slugs this starts
/// answering 200 with no code change.
/// </summary>
public sealed class ContentPageSeoProvider : ISeoPageProvider
{
    private static readonly Regex PolicyPattern = new(@"^/chinh-sach/(?<slug>[a-z0-9-]+)$", RegexOptions.Compiled);

    // Fixed routes -> the CMSPage.Slug that answers them (D11 §"Architecture").
    private static readonly IReadOnlyDictionary<string, string> FixedRoutes = new Dictionary<string, string>
    {
        ["/gioi-thieu"] = "gioi-thieu",
        ["/lien-he"] = "lien-he",
        ["/dieu-khoan"] = "dieu-khoan",
        ["/bao-mat"] = "bao-mat",
    };

    // Hai "chính sách" cũ thực chất là danh sách bài viết, nay có trang riêng. Giữ link cũ
    // (bookmark, menu CMS chưa sửa) bằng 301 thay vì 404 — khớp `<Navigate replace>` bên SPA
    // (`storefront-service.routes.ts`). Không có CMSPage nào mang các slug này.
    private static readonly IReadOnlyDictionary<string, string> LegacyListRedirects = new Dictionary<string, string>
    {
        ["/chinh-sach/promotions"] = "/khuyen-mai",
        ["/chinh-sach/khuyen-mai"] = "/khuyen-mai",
        ["/chinh-sach/news"] = "/tin-tuc",
        ["/chinh-sach/tin-tuc"] = "/tin-tuc",
    };

    private readonly ContentDbContext _db;

    public ContentPageSeoProvider(ContentDbContext db) => _db = db;

    public bool TryMatch(string path) => FixedRoutes.ContainsKey(path) || PolicyPattern.IsMatch(path);

    public async Task<SeoPage?> ResolveAsync(string path, string query, CancellationToken ct)
    {
        if (LegacyListRedirects.TryGetValue(path, out var target)) return SeoPage.RedirectPermanent(target);

        var slug = FixedRoutes.TryGetValue(path, out var fixedSlug) ? fixedSlug : PolicyPattern.Match(path).Groups["slug"].Value;

        var cmsPage = await _db.Pages.FirstOrDefaultAsync(p => p.Slug == slug && p.IsPublished, ct);
        if (cmsPage is null) return SeoPage.NotFound(path);

        var description = string.IsNullOrWhiteSpace(cmsPage.MetaDescription)
            ? Truncate(StripHtml(cmsPage.Content), 160)
            : cmsPage.MetaDescription!;

        return new SeoPage
        {
            Status = 200,
            Title = string.IsNullOrWhiteSpace(cmsPage.MetaTitle) ? $"{cmsPage.Title} - Quang Hưởng Computer" : cmsPage.MetaTitle!,
            Description = description,
            CanonicalPath = path,
            Robots = "index,follow",
            JsonLd = new object[]
            {
                SeoJsonLdBuilders.BreadcrumbList(new[] { ("Trang chủ", (string?)"/"), (cmsPage.Title, (string?)null) }),
            },
        };
    }

    public async IAsyncEnumerable<SitemapEntry> EnumerateAsync([System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct)
    {
        var reverseFixed = FixedRoutes.ToDictionary(kv => kv.Value, kv => kv.Key);
        var pages = _db.Pages.Where(p => p.IsPublished).Select(p => new { p.Slug, p.PublishedAt });
        await foreach (var page in pages.AsAsyncEnumerable().WithCancellation(ct))
        {
            if (string.IsNullOrEmpty(page.Slug)) continue;
            var path = reverseFixed.TryGetValue(page.Slug, out var fixedPath) ? fixedPath : $"/chinh-sach/{page.Slug}";
            if (LegacyListRedirects.ContainsKey(path)) continue; // a redirect is never a sitemap URL
            yield return new SitemapEntry(path, page.PublishedAt, "monthly", 0.4m);
        }
    }

    private static string StripHtml(string input) => Regex.Replace(input ?? string.Empty, "<[^>]+>", " ").Trim();
    private static string Truncate(string input, int max) => input.Length <= max ? input : input[..(max - 1)].TrimEnd() + "…";
}
