using BuildingBlocks.Seo;
using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Seo;

/// <summary>
/// `/cau-hinh-mau` — gallery "Cấu hình PC mẫu" do nhân viên tuyển chọn. Cùng predicate công khai
/// với API (<see cref="SavedPcBuild.IsPubliclyVisible"/>). Bộ lọc `?tag=`/`?budget=` không phải trang
/// riêng: canonical luôn về URL sạch.
///
/// Gallery rỗng → vẫn 200 (SPA có trạng thái rỗng thật) nhưng `noindex,follow` và không vào sitemap —
/// cùng cách xử lý với `/flash-sale` (Content/Seo/FlashSaleSeoProvider).
/// </summary>
public sealed class PcBuildGallerySeoProvider : ISeoPageProvider
{
    public const string Path = "/cau-hinh-mau";

    private readonly CatalogDbContext _db;

    public PcBuildGallerySeoProvider(CatalogDbContext db) => _db = db;

    public bool TryMatch(string path) => path == Path;

    public async Task<SeoPage?> ResolveAsync(string path, string query, CancellationToken ct)
    {
        var builds = await _db.SavedPcBuilds.AsNoTracking()
            .Where(SavedPcBuild.IsPubliclyVisible)
            .OrderByDescending(b => b.IsFeatured).ThenBy(b => b.SortOrder)
            .Select(b => new { b.Name, b.BuildCode, b.UseCaseTag })
            .ToListAsync(ct);

        var breadcrumb = SeoJsonLdBuilders.BreadcrumbList(new[]
        {
            ("Trang chủ", (string?)"/"),
            ("Cấu hình PC mẫu", (string?)null),
        });

        if (builds.Count == 0)
        {
            return new SeoPage
            {
                Status = 200,
                Title = "Cấu hình PC mẫu - Quang Hưởng Computer",
                Description = "Các cấu hình PC mẫu do Quang Hưởng Computer tuyển chọn sẽ sớm được cập nhật. Tự xây dựng cấu hình của bạn ngay.",
                CanonicalPath = Path,
                Robots = "noindex,follow",
                JsonLd = new[] { breadcrumb },
            };
        }

        var tags = builds.Select(b => PcBuildUseCaseTags.LabelOf(b.UseCaseTag)).Distinct().ToList();
        var itemList = new Dictionary<string, object?>
        {
            ["@context"] = "https://schema.org",
            ["@type"] = "ItemList",
            ["name"] = "Cấu hình PC mẫu",
            ["numberOfItems"] = builds.Count,
            ["itemListElement"] = builds.Select((b, i) => new Dictionary<string, object?>
            {
                ["@type"] = "ListItem",
                ["position"] = i + 1,
                ["name"] = b.Name,
                ["url"] = $"{Path}#{b.BuildCode}", // thẻ trên gallery mang id = mã build
            }).ToList(),
        };

        return new SeoPage
        {
            Status = 200,
            Title = "Cấu hình PC mẫu theo nhu cầu - Quang Hưởng Computer",
            Description = $"{builds.Count} cấu hình PC mẫu cho {string.Join(", ", tags)}: giá cập nhật theo thời gian thực, kiểm tra tương thích sẵn, mua cả bộ hoặc tùy chỉnh.",
            CanonicalPath = Path,
            Robots = "index,follow",
            JsonLd = new object[] { breadcrumb, itemList },
        };
    }

    public async IAsyncEnumerable<SitemapEntry> EnumerateAsync([System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct)
    {
        var any = await _db.SavedPcBuilds.AsNoTracking().Where(SavedPcBuild.IsPubliclyVisible).AnyAsync(ct);
        if (any) yield return new SitemapEntry(Path, null, "weekly", 0.6m);
    }
}
