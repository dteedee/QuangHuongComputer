using System.Text.RegularExpressions;
using BuildingBlocks.Seo;
using Content.Domain;
using Content.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Content.Seo;

/// <summary>
/// `/tin-tuc`, `/tin-tuc/{slug}`. Uses `Post.PublishedPredicate` (D10) — the one predicate list/detail/sitemap all share.
/// Bài `PostType.Promotion` KHÔNG thuộc `/tin-tuc`: URL chuẩn của nó là `/khuyen-mai/{slug}`
/// (`PromotionSeoProvider`) — link cũ `/tin-tuc/{slug}` trả 301 sang đó, sitemap chỉ liệt kê một bản.
/// </summary>
public sealed class ContentPostSeoProvider : ISeoPageProvider
{
    private const string ListPath = "/tin-tuc";
    private static readonly Regex SlugPattern = new(@"^/tin-tuc/(?<slug>[a-z0-9-]+)$", RegexOptions.Compiled);
    private const int PageSize = 12;

    private readonly ContentDbContext _db;

    public ContentPostSeoProvider(ContentDbContext db) => _db = db;

    public bool TryMatch(string path) => path == ListPath || SlugPattern.IsMatch(path);

    public async Task<SeoPage?> ResolveAsync(string path, string query, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var predicate = Post.PublishedPredicate(now);

        if (path == ListPath)
        {
            var parsedQuery = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(query);
            var page = parsedQuery.TryGetValue("page", out var v) && int.TryParse(v.ToString(), out var p) && p > 1 ? p : 1;
            var total = await _db.Posts.Where(predicate).Where(p => p.Type != PostType.Promotion).CountAsync(ct);
            var canonicalPath = page > 1 ? $"{ListPath}?page={page}" : ListPath;

            return new SeoPage
            {
                Status = 200,
                Title = "Tin tức - Quang Hưởng Computer",
                Description = $"Tin tức công nghệ, khuyến mãi và hướng dẫn từ Quang Hưởng Computer. {total} bài viết.",
                CanonicalPath = canonicalPath,
                Robots = "index,follow",
                JsonLd = new object[]
                {
                    SeoJsonLdBuilders.BreadcrumbList(new[] { ("Trang chủ", (string?)"/"), ("Tin tức", (string?)null) }),
                },
            };
        }

        var slug = SlugPattern.Match(path).Groups["slug"].Value;
        var post = await _db.Posts.Where(predicate).FirstOrDefaultAsync(p => p.Slug == slug, ct);
        if (post is null) return SeoPage.NotFound(path);
        if (post.Type == PostType.Promotion) return SeoPage.RedirectPermanent($"/khuyen-mai/{post.Slug}");

        var description = Truncate(StripHtml(post.Content), 160);
        return new SeoPage
        {
            Status = 200,
            Title = $"{post.Title} - Quang Hưởng Computer",
            Description = description,
            CanonicalPath = $"/tin-tuc/{post.Slug}",
            Robots = "index,follow",
            OgType = "article",
            // No stored width/height for post thumbnails — same reasoning as product photos
            // (SeoShellHeadRenderer falls back to the verified brand default instead of guessing).
            OgImage = null,
            JsonLd = new object[]
            {
                BuildArticleJsonLd(post),
                SeoJsonLdBuilders.BreadcrumbList(new[] { ("Trang chủ", (string?)"/"), ("Tin tức", (string?)"/tin-tuc"), (post.Title, (string?)null) }),
            },
        };
    }

    public async IAsyncEnumerable<SitemapEntry> EnumerateAsync([System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var newsPosts = _db.Posts.Where(Post.PublishedPredicate(now)).Where(p => p.Type != PostType.Promotion);
        var any = await newsPosts.AnyAsync(ct);
        if (any) yield return new SitemapEntry(ListPath, null, "daily", 0.6m);

        var posts = newsPosts.Select(p => new { p.Slug, p.PublishedAt });
        await foreach (var p in posts.AsAsyncEnumerable().WithCancellation(ct))
        {
            if (string.IsNullOrEmpty(p.Slug)) continue;
            yield return new SitemapEntry($"/tin-tuc/{p.Slug}", p.PublishedAt, "monthly", 0.5m);
        }
    }

    private static object BuildArticleJsonLd(Post post) => new Dictionary<string, object?>
    {
        ["@context"] = "https://schema.org",
        ["@type"] = "Article",
        ["headline"] = post.Title,
        ["datePublished"] = post.PublishedAt?.ToString("O"),
        ["author"] = new Dictionary<string, object?> { ["@type"] = "Organization", ["name"] = "Quang Hưởng Computer" },
    };

    private static string StripHtml(string input) => Regex.Replace(input ?? string.Empty, "<[^>]+>", " ").Trim();
    private static string Truncate(string input, int max) => input.Length <= max ? input : input[..(max - 1)].TrimEnd() + "…";
}
