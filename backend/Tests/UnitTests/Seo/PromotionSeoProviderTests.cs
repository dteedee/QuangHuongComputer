using System.Text.Json;
using Content.Seo;
using Content.Domain;
using FluentAssertions;
using Xunit;
using static UnitTests.Seo.SeoContentTestData;

namespace UnitTests.Seo;

/// <summary>`/khuyen-mai`, `/khuyen-mai/{slug}` — bài Promotion + mã đang chạy, cùng predicate với API công khai.</summary>
public class PromotionSeoProviderTests
{
    [Theory]
    [InlineData("/khuyen-mai", true)]
    [InlineData("/khuyen-mai/giam-gia-laptop", true)]
    [InlineData("/khuyen-mai/Hoa-Hoa", false)]
    [InlineData("/khuyen-mai/a/b", false)]
    [InlineData("/tin-tuc", false)]
    public void TryMatch_ChiNhanDungDuongDanKhuyenMai(string path, bool expected)
    {
        new PromotionSeoProvider(NewDb()).TryMatch(path).Should().Be(expected);
    }

    [Fact]
    public async Task DanhSach_CoBaiVaMa_IndexVaItemListChiGomBaiKhuyenMai()
    {
        var db = NewDb();
        db.Posts.AddRange(
            PublishedPost("Back to school", "back-to-school", PostType.Promotion),
            PublishedPost("Tin công nghệ", "tin-cong-nghe", PostType.News),
            DraftPost("Nháp khuyến mãi", "nhap-km", PostType.Promotion));
        db.Promotions.Add(RunningCode("QH100"));
        await db.SaveChangesAsync();

        var page = await new PromotionSeoProvider(db).ResolveAsync("/khuyen-mai", "", CancellationToken.None);

        page!.Status.Should().Be(200);
        page.Robots.Should().Be("index,follow");
        page.CanonicalPath.Should().Be("/khuyen-mai");
        page.Description.Should().Contain("1 chương trình").And.Contain("1 mã giảm giá");
        var json = JsonSerializer.Serialize(page.JsonLd);
        json.Should().Contain("/khuyen-mai/back-to-school").And.NotContain("tin-cong-nghe").And.NotContain("nhap-km");
    }

    [Fact]
    public async Task DanhSach_Rong_Van200NhungNoindex()
    {
        var page = await new PromotionSeoProvider(NewDb()).ResolveAsync("/khuyen-mai", "", CancellationToken.None);

        page!.Status.Should().Be(200);
        page.Robots.Should().Be("noindex,follow");
    }

    [Fact]
    public async Task ChiTiet_BaiKhuyenMai_ArticleVaCanonical()
    {
        var db = NewDb();
        db.Posts.Add(PublishedPost("Giảm 2 triệu laptop", "giam-2-trieu", PostType.Promotion, "<p>Áp dụng <b>đến hết tháng</b></p>"));
        await db.SaveChangesAsync();

        var page = await new PromotionSeoProvider(db).ResolveAsync("/khuyen-mai/giam-2-trieu", "", CancellationToken.None);

        page!.Status.Should().Be(200);
        page.CanonicalPath.Should().Be("/khuyen-mai/giam-2-trieu");
        page.OgType.Should().Be("article");
        page.Description.Should().NotContain("<");
        JsonSerializer.Serialize(page.JsonLd).Should().Contain("\"Article\"").And.Contain("BreadcrumbList");
    }

    [Fact]
    public async Task ChiTiet_BaiTinThuong_301SangTinTuc()
    {
        var db = NewDb();
        db.Posts.Add(PublishedPost("Tin", "mot-tin", PostType.News));
        await db.SaveChangesAsync();

        var page = await new PromotionSeoProvider(db).ResolveAsync("/khuyen-mai/mot-tin", "", CancellationToken.None);

        page!.Status.Should().Be(301);
        page.RedirectTo.Should().Be("/tin-tuc/mot-tin");
    }

    [Fact]
    public async Task ChiTiet_BaiNhapHoacKhongTonTai_404()
    {
        var db = NewDb();
        db.Posts.Add(DraftPost("Nháp", "nhap", PostType.Promotion));
        await db.SaveChangesAsync();
        var provider = new PromotionSeoProvider(db);

        (await provider.ResolveAsync("/khuyen-mai/nhap", "", CancellationToken.None))!.Status.Should().Be(404);
        (await provider.ResolveAsync("/khuyen-mai/khong-co", "", CancellationToken.None))!.Status.Should().Be(404);
    }

    [Fact]
    public async Task Sitemap_ChiLietKeBaiKhuyenMaiDaXuatBan()
    {
        var db = NewDb();
        db.Posts.AddRange(
            PublishedPost("KM", "km-1", PostType.Promotion),
            PublishedPost("Tin", "tin-1", PostType.News),
            DraftPost("Nháp", "km-nhap", PostType.Promotion));
        await db.SaveChangesAsync();

        var entries = await ToListAsync(new PromotionSeoProvider(db).EnumerateAsync(CancellationToken.None));

        entries.Select(e => e.Path).Should().BeEquivalentTo(new[] { "/khuyen-mai", "/khuyen-mai/km-1" });
    }

    [Fact]
    public async Task Sitemap_KhongCoGi_KhongLietKeTrangDanhSach()
    {
        var entries = await ToListAsync(new PromotionSeoProvider(NewDb()).EnumerateAsync(CancellationToken.None));
        entries.Should().BeEmpty();
    }
}
