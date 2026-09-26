using BuildingBlocks.Seo;
using Content.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Content.Seo;

/// <summary>
/// Catch-all <c>/{slug}</c> cho <c>CMSPage</c> đã xuất bản (ví dụ <c>/huong-dan-mua-hang</c>) — cặp
/// với route <c>:slug</c> cuối manifest SPA (<c>storefront-cms.routes.ts</c>).
///
/// <see cref="IsFallback"/> = true: shell chỉ hỏi provider này SAU bảng chuyển hướng URL, SAU mọi
/// provider cụ thể và SAU danh sách template-only, nên nó không bao giờ che <c>/gio-hang</c>,
/// <c>/login</c>, một đường dẫn cũ đang 301, ... Slug không có trang -> 404 thật.
/// Slug có URL chuẩn khác (trang cố định / chính sách) -> 301 về đó, không nội dung trùng.
/// </summary>
public sealed class CmsPageSeoProvider : ISeoPageProvider
{
    private readonly ContentDbContext _db;

    public CmsPageSeoProvider(ContentDbContext db) => _db = db;

    public bool IsFallback => true;

    public bool TryMatch(string path) =>
        path.Length > 1 && CmsPagePaths.SlugPattern.IsMatch(path[1..]) && !CmsPagePaths.ReservedSlugs.Contains(path[1..]);

    public async Task<SeoPage?> ResolveAsync(string path, string query, CancellationToken ct)
    {
        var slug = path[1..];
        var page = await _db.Pages.AsNoTracking().FirstOrDefaultAsync(p => p.Slug == slug && p.IsPublished, ct);
        if (page is null) return SeoPage.NotFound(path);

        var canonical = CmsPagePaths.CanonicalPath(slug);
        if (canonical != path) return SeoPage.RedirectPermanent(canonical);

        return ContentPageSeoProvider.BuildPage(page, canonical);
    }

    public async IAsyncEnumerable<SitemapEntry> EnumerateAsync([System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct)
    {
        var pages = _db.Pages.Where(p => p.IsPublished).Select(p => new { p.Slug, p.PublishedAt });
        await foreach (var page in pages.AsAsyncEnumerable().WithCancellation(ct))
        {
            if (string.IsNullOrEmpty(page.Slug) || !CmsPagePaths.SlugPattern.IsMatch(page.Slug)) continue;
            if (!CmsPagePaths.IsCatchAll(page.Slug)) continue; // ContentPageSeoProvider liệt kê những trang này
            yield return new SitemapEntry("/" + page.Slug, page.PublishedAt, "monthly", 0.5m);
        }
    }
}
