using System.Globalization;
using BuildingBlocks.Seo;
using Content.Domain;
using Content.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Content.Seo;

/// <summary>
/// `/flash-sale` — trang tập trung mọi flash sale đang chạy. `Promotion` không có slug nên trang
/// không có `/{slug}`: mỗi đợt là một khối trên cùng một URL (đúng hình dạng feed công khai
/// `GET /api/content/promotions/active`, cùng predicate `Promotion.RunningPredicate` + `Type=FlashSale`).
///
/// Không có đợt nào đang chạy -> vẫn 200 (SPA hiện trạng thái "chưa có flash sale" thật, không
/// phải 404 giả) nhưng `noindex,follow` và không vào sitemap — URL này chỉ đáng index khi có hàng.
/// </summary>
public sealed class FlashSaleSeoProvider : ISeoPageProvider
{
    public const string Path = "/flash-sale";
    // Việt Nam không có giờ mùa hè: UTC+7 cố định, không phụ thuộc tzdata của máy chủ.
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);
    private static readonly CultureInfo Vi = CultureInfo.GetCultureInfo("vi-VN");

    private readonly ContentDbContext _db;

    public FlashSaleSeoProvider(ContentDbContext db) => _db = db;

    public bool TryMatch(string path) => path == Path;

    public async Task<SeoPage?> ResolveAsync(string path, string query, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var sales = await RunningFlashSales(now)
            .OrderByDescending(p => p.Priority)
            .Select(p => new
            {
                p.Name,
                p.EndAt,
                ProductCount = p.Rewards.Count(r => r.ProductId != null && r.FlashPrice != null && r.FlashPrice > 0),
            })
            .ToListAsync(ct);

        var breadcrumb = SeoJsonLdBuilders.BreadcrumbList(new[] { ("Trang chủ", (string?)"/"), ("Flash sale", (string?)null) });
        var live = sales.Where(s => s.ProductCount > 0).ToList();
        if (live.Count == 0)
        {
            return new SeoPage
            {
                Status = 200,
                Title = "Flash sale - Quang Hưởng Computer",
                Description = "Hiện chưa có chương trình flash sale nào. Theo dõi Quang Hưởng Computer để không bỏ lỡ đợt giảm giá tiếp theo.",
                CanonicalPath = Path,
                Robots = "noindex,follow",
                JsonLd = new[] { breadcrumb },
            };
        }

        var first = live[0];
        var productTotal = live.Sum(s => s.ProductCount);
        var endText = first.EndAt is { } end
            ? $" Kết thúc {new DateTimeOffset(DateTime.SpecifyKind(end, DateTimeKind.Utc)).ToOffset(VietnamOffset).ToString("HH:mm 'ngày' dd/MM/yyyy", Vi)}."
            : string.Empty;

        return new SeoPage
        {
            Status = 200,
            Title = $"{first.Name} - Flash sale - Quang Hưởng Computer",
            Description = $"{productTotal} sản phẩm giá flash sale, số lượng có hạn tại Quang Hưởng Computer.{endText}",
            CanonicalPath = Path,
            Robots = "index,follow",
            JsonLd = new[] { breadcrumb },
        };
    }

    public async IAsyncEnumerable<SitemapEntry> EnumerateAsync([System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var live = await RunningFlashSales(now)
            .AnyAsync(p => p.Rewards.Any(r => r.ProductId != null && r.FlashPrice != null && r.FlashPrice > 0), ct);
        if (live) yield return new SitemapEntry(Path, null, "hourly", 0.8m);
    }

    private IQueryable<Promotion> RunningFlashSales(DateTime now) =>
        _db.Promotions.Where(Promotion.RunningPredicate(now)).Where(p => p.Type == PromotionType.FlashSale);
}
