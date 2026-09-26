using System.Text.RegularExpressions;
using BuildingBlocks.Seo;
using Content.Domain;
using Content.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Content.Seo;

/// <summary>
/// `/khuyen-mai`, `/khuyen-mai/{slug}`. Dữ liệu (Post + Promotion) đều của Content nên provider sống
/// trong Content/Seo (seo-shell.md "Adding a new page type" §1) — ApiGateway/Seo chỉ dành cho
/// provider cần module mà Content không tham chiếu.
///
/// - Chương trình khuyến mãi = bài `Post` có `Type == PostType.Promotion`, lọc bằng đúng
///   `Post.PublishedPredicate` (D10) — cùng predicate mà `GET /api/content/posts` dùng.
/// - Mã giảm giá đang chạy = `Promotion` loại `Code`, lọc bằng `Promotion.RunningPredicate`
///   — cùng predicate mà `GET /api/promotions/available` dùng. Chỉ được đếm vào mô tả,
///   không có URL riêng (Promotion không có slug).
/// - Trang danh sách rỗng vẫn trả 200 (SPA có trạng thái rỗng thật) nhưng `noindex,follow`
///   và không vào sitemap: một trang mỏng không có gì để index.
/// </summary>
public sealed class PromotionSeoProvider : ISeoPageProvider
{
    public const string ListPath = "/khuyen-mai";
    private static readonly Regex SlugPattern = new(@"^/khuyen-mai/(?<slug>[a-z0-9-]+)$", RegexOptions.Compiled);
    private const int JsonLdListLimit = 20;

    private readonly ContentDbContext _db;

    public PromotionSeoProvider(ContentDbContext db) => _db = db;

    public bool TryMatch(string path) => path == ListPath || SlugPattern.IsMatch(path);

    public async Task<SeoPage?> ResolveAsync(string path, string query, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        return path == ListPath ? await ResolveListAsync(now, ct) : await ResolveDetailAsync(path, now, ct);
    }

    private async Task<SeoPage> ResolveListAsync(DateTime now, CancellationToken ct)
    {
        var posts = await PromotionPosts(now)
            .OrderByDescending(p => p.PublishedAt)
            .Take(JsonLdListLimit)
            .Select(p => new { p.Title, p.Slug })
            .ToListAsync(ct);
        var postCount = await PromotionPosts(now).CountAsync(ct);
        var codeCount = await RunningCodes(now).CountAsync(ct);
        var hasContent = postCount > 0 || codeCount > 0;

        var jsonLd = new List<object>
        {
            SeoJsonLdBuilders.BreadcrumbList(new[] { ("Trang chủ", (string?)"/"), ("Khuyến mãi", (string?)null) }),
        };
        if (posts.Count > 0)
        {
            jsonLd.Add(new Dictionary<string, object?>
            {
                ["@context"] = "https://schema.org",
                ["@type"] = "ItemList",
                ["itemListElement"] = posts.Select((p, i) => new Dictionary<string, object?>
                {
                    ["@type"] = "ListItem",
                    ["position"] = i + 1,
                    ["url"] = $"/khuyen-mai/{p.Slug}",
                    ["name"] = p.Title,
                }).ToList(),
            });
        }

        return new SeoPage
        {
            Status = 200,
            Title = "Khuyến mãi - Quang Hưởng Computer",
            Description = hasContent
                ? $"{postCount} chương trình khuyến mãi và {codeCount} mã giảm giá đang áp dụng tại Quang Hưởng Computer."
                : "Chương trình khuyến mãi và mã giảm giá tại Quang Hưởng Computer.",
            CanonicalPath = ListPath,
            Robots = hasContent ? "index,follow" : "noindex,follow",
            JsonLd = jsonLd,
        };
    }

    private async Task<SeoPage> ResolveDetailAsync(string path, DateTime now, CancellationToken ct)
    {
        var slug = SlugPattern.Match(path).Groups["slug"].Value;
        var post = await _db.Posts.Where(Post.PublishedPredicate(now)).FirstOrDefaultAsync(p => p.Slug == slug, ct);
        if (post is null) return SeoPage.NotFound(path);
        // Bài tin thường lạc sang URL khuyến mãi -> một URL chuẩn duy nhất, không nội dung trùng.
        if (post.Type != PostType.Promotion) return SeoPage.RedirectPermanent($"/tin-tuc/{post.Slug}");

        return new SeoPage
        {
            Status = 200,
            Title = $"{post.Title} - Khuyến mãi - Quang Hưởng Computer",
            Description = Truncate(StripHtml(post.Content), 160),
            CanonicalPath = $"/khuyen-mai/{post.Slug}",
            Robots = "index,follow",
            OgType = "article",
            // Không có width/height đã đo cho ảnh bài viết -> để shell dùng ảnh OG mặc định (seo-shell.md §4).
            OgImage = null,
            JsonLd = new object[]
            {
                new Dictionary<string, object?>
                {
                    ["@context"] = "https://schema.org",
                    ["@type"] = "Article",
                    ["headline"] = post.Title,
                    ["datePublished"] = post.PublishedAt?.ToString("O"),
                    ["author"] = new Dictionary<string, object?> { ["@type"] = "Organization", ["name"] = "Quang Hưởng Computer" },
                },
                SeoJsonLdBuilders.BreadcrumbList(new[]
                {
                    ("Trang chủ", (string?)"/"), ("Khuyến mãi", (string?)ListPath), (post.Title, (string?)null),
                }),
            },
        };
    }

    public async IAsyncEnumerable<SitemapEntry> EnumerateAsync([System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var hasContent = await PromotionPosts(now).AnyAsync(ct) || await RunningCodes(now).AnyAsync(ct);
        if (hasContent) yield return new SitemapEntry(ListPath, null, "daily", 0.7m);

        var posts = PromotionPosts(now).Select(p => new { p.Slug, p.PublishedAt });
        await foreach (var p in posts.AsAsyncEnumerable().WithCancellation(ct))
        {
            if (string.IsNullOrEmpty(p.Slug)) continue;
            yield return new SitemapEntry($"/khuyen-mai/{p.Slug}", p.PublishedAt, "weekly", 0.6m);
        }
    }

    private IQueryable<Post> PromotionPosts(DateTime now) =>
        _db.Posts.Where(Post.PublishedPredicate(now)).Where(p => p.Type == PostType.Promotion);

    private IQueryable<Promotion> RunningCodes(DateTime now) =>
        _db.Promotions.Where(Promotion.RunningPredicate(now)).Where(p => p.Code != null);

    private static string StripHtml(string input) => Regex.Replace(input ?? string.Empty, "<[^>]+>", " ").Trim();
    private static string Truncate(string input, int max) => input.Length <= max ? input : input[..(max - 1)].TrimEnd() + "…";
}
