using BuildingBlocks.Seo;

namespace Content.Seo;

/// <summary>
/// Thân trang SEO shell cho nội dung soạn bằng trình soạn thảo (bài tin, bài khuyến mãi, trang CMS):
/// H1 + breadcrumb + thân bài đã lọc allow-list (<see cref="SeoHtmlSanitizer"/>). HTML gốc do admin
/// soạn không bao giờ đi thẳng ra trang.
/// </summary>
internal static class ContentSeoBodyBuilder
{
    /// <param name="parent">Mục giữa breadcrumb (ví dụ ("Tin tức", "/tin-tuc")); null = chỉ Trang chủ › tiêu đề.</param>
    public static SeoBodyFragment Article(string title, string? html, (string Name, string Href)? parent = null)
    {
        var crumbs = new List<SeoLink> { new("Trang chủ", "/") };
        if (parent is { } p) crumbs.Add(new SeoLink(p.Name, p.Href));
        crumbs.Add(new SeoLink(title, null));

        return new SeoBodyFragment
        {
            Heading = title,
            Breadcrumbs = crumbs,
            Article = string.IsNullOrWhiteSpace(html) ? null : SeoHtmlSanitizer.Sanitize(html),
        };
    }
}
