using Content.Seo;
using FluentAssertions;
using Xunit;
using static UnitTests.Seo.SeoContentTestData;

namespace UnitTests.Seo;

/// <summary>`/flash-sale` — chỉ index/sitemap khi thật sự có đợt đang chạy (Promotion.RunningPredicate + FlashSale).</summary>
public class FlashSaleSeoProviderTests
{
    [Theory]
    [InlineData("/flash-sale", true)]
    [InlineData("/flash-sale/abc", false)]
    [InlineData("/khuyen-mai", false)]
    public void TryMatch_ChiNhanDungFlashSale(string path, bool expected)
    {
        new FlashSaleSeoProvider(NewDb()).TryMatch(path).Should().Be(expected);
    }

    [Fact]
    public async Task DangChay_IndexVaTieuDeTheoTenDot_MoTaCoGioVietNam()
    {
        var db = NewDb();
        // 2026-10-01 05:00 UTC = 12:00 giờ Việt Nam.
        var end = new DateTime(2099, 10, 1, 5, 0, 0, DateTimeKind.Utc);
        db.Promotions.Add(FlashSale("Giờ vàng laptop", DateTime.UtcNow.AddHours(-1), end));
        await db.SaveChangesAsync();

        var page = await new FlashSaleSeoProvider(db).ResolveAsync("/flash-sale", "", CancellationToken.None);

        page!.Status.Should().Be(200);
        page.Robots.Should().Be("index,follow");
        page.Title.Should().StartWith("Giờ vàng laptop");
        page.Description.Should().Contain("1 sản phẩm").And.Contain("12:00 ngày 01/10/2099");
        page.CanonicalPath.Should().Be("/flash-sale");
    }

    [Fact]
    public async Task KhongCoDot_HoacDaHetHan_HoacChuaKichHoat_200Noindex()
    {
        var db = NewDb();
        db.Promotions.AddRange(
            FlashSale("Đã hết", DateTime.UtcNow.AddDays(-3), DateTime.UtcNow.AddDays(-1)),
            FlashSale("Sắp tới", DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(2)),
            FlashSale("Nháp", DateTime.UtcNow.AddHours(-1), DateTime.UtcNow.AddHours(5), activate: false));
        await db.SaveChangesAsync();

        var page = await new FlashSaleSeoProvider(db).ResolveAsync("/flash-sale", "", CancellationToken.None);

        page!.Status.Should().Be(200);
        page.Robots.Should().Be("noindex,follow");
        (await ToListAsync(new FlashSaleSeoProvider(db).EnumerateAsync(CancellationToken.None))).Should().BeEmpty();
    }

    [Fact]
    public async Task DotKhongCoGiaFlash_KhongTinhLaDangChay()
    {
        var db = NewDb();
        db.Promotions.Add(FlashSale("Không giá", DateTime.UtcNow.AddHours(-1), DateTime.UtcNow.AddHours(5), flashPrice: 0m));
        await db.SaveChangesAsync();

        var page = await new FlashSaleSeoProvider(db).ResolveAsync("/flash-sale", "", CancellationToken.None);

        page!.Robots.Should().Be("noindex,follow");
    }

    [Fact]
    public async Task Sitemap_CoDotDangChay_LietKeFlashSale()
    {
        var db = NewDb();
        db.Promotions.Add(FlashSale("Đang chạy", DateTime.UtcNow.AddHours(-1), null));
        await db.SaveChangesAsync();

        var entries = await ToListAsync(new FlashSaleSeoProvider(db).EnumerateAsync(CancellationToken.None));

        entries.Should().ContainSingle().Which.Path.Should().Be("/flash-sale");
    }
}
