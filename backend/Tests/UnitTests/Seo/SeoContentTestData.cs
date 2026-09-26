using Content.Domain;
using Content.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace UnitTests.Seo;

/// <summary>Dựng ContentDbContext InMemory + dữ liệu mẫu cho test các SEO provider của Content.</summary>
internal static class SeoContentTestData
{
    public static ContentDbContext NewDb() =>
        new(new DbContextOptionsBuilder<ContentDbContext>()
            .UseInMemoryDatabase("seo-content-" + Guid.NewGuid())
            .Options);

    public static Post PublishedPost(string title, string slug, PostType type, string content = "<p>Nội dung bài viết</p>")
    {
        var post = new Post(title, slug, content, type);
        post.Publish();
        return post;
    }

    public static Post DraftPost(string title, string slug, PostType type) => new(title, slug, "<p>Nháp</p>", type);

    public static Promotion RunningCode(string code, DateTime? endAt = null)
    {
        var promo = Promotion.Create(
            code, $"Mã {code}", null, PromotionType.Code,
            DateTime.UtcNow.AddDays(-1), endAt ?? DateTime.UtcNow.AddDays(7),
            PromotionDiscountType.Fixed, 100_000m, null);
        promo.Activate();
        return promo;
    }

    public static Promotion FlashSale(string name, DateTime startAt, DateTime? endAt, bool activate = true, decimal? flashPrice = 9_990_000m)
    {
        var promo = Promotion.Create(
            null, name, null, PromotionType.FlashSale, startAt, endAt,
            PromotionDiscountType.FixedPrice, 0m, null);
        promo.AddReward(Guid.NewGuid(), null, 1, 100, flashPrice: flashPrice, quantityLimit: 10);
        if (activate) promo.Activate();
        return promo;
    }

    public static async Task<List<T>> ToListAsync<T>(IAsyncEnumerable<T> source)
    {
        var list = new List<T>();
        await foreach (var item in source) list.Add(item);
        return list;
    }
}
