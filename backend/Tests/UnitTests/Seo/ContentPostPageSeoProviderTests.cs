using Content.Domain;
using Content.Seo;
using FluentAssertions;
using Xunit;
using static UnitTests.Seo.SeoContentTestData;

namespace UnitTests.Seo;

/// <summary>
/// `/tin-tuc` không còn chứa bài Promotion (URL chuẩn của chúng là `/khuyen-mai/{slug}`), và
/// `/chinh-sach/{promotions|news|...}` cũ trả 301 về trang danh sách mới thay vì 404.
/// </summary>
public class ContentPostPageSeoProviderTests
{
    [Fact]
    public async Task TinTuc_ChiTietBaiKhuyenMai_301SangKhuyenMai()
    {
        var db = NewDb();
        db.Posts.Add(PublishedPost("KM", "km-cu", PostType.Promotion));
        await db.SaveChangesAsync();

        var page = await new ContentPostSeoProvider(db).ResolveAsync("/tin-tuc/km-cu", "", CancellationToken.None);

        page!.Status.Should().Be(301);
        page.RedirectTo.Should().Be("/khuyen-mai/km-cu");
    }

    [Fact]
    public async Task TinTuc_ChiTietBaiTin_200()
    {
        var db = NewDb();
        db.Posts.Add(PublishedPost("Tin", "tin-moi", PostType.News));
        await db.SaveChangesAsync();

        var page = await new ContentPostSeoProvider(db).ResolveAsync("/tin-tuc/tin-moi", "", CancellationToken.None);

        page!.Status.Should().Be(200);
        page.CanonicalPath.Should().Be("/tin-tuc/tin-moi");
    }

    [Fact]
    public async Task TinTuc_DanhSachVaSitemap_BoQuaBaiKhuyenMai()
    {
        var db = NewDb();
        db.Posts.AddRange(
            PublishedPost("Tin", "tin-a", PostType.News),
            PublishedPost("Bài", "bai-b", PostType.Article),
            PublishedPost("KM", "km-c", PostType.Promotion));
        await db.SaveChangesAsync();
        var provider = new ContentPostSeoProvider(db);

        var list = await provider.ResolveAsync("/tin-tuc", "", CancellationToken.None);
        var entries = await ToListAsync(provider.EnumerateAsync(CancellationToken.None));

        list!.Description.Should().Contain("2 bài viết");
        entries.Select(e => e.Path).Should().BeEquivalentTo(new[] { "/tin-tuc", "/tin-tuc/tin-a", "/tin-tuc/bai-b" });
    }

    [Theory]
    [InlineData("/chinh-sach/promotions", "/khuyen-mai")]
    [InlineData("/chinh-sach/khuyen-mai", "/khuyen-mai")]
    [InlineData("/chinh-sach/news", "/tin-tuc")]
    [InlineData("/chinh-sach/tin-tuc", "/tin-tuc")]
    public async Task ChinhSach_DuongDanDanhSachCu_301(string oldPath, string target)
    {
        var provider = new ContentPageSeoProvider(NewDb());

        provider.TryMatch(oldPath).Should().BeTrue();
        var page = await provider.ResolveAsync(oldPath, "", CancellationToken.None);

        page!.Status.Should().Be(301);
        page.RedirectTo.Should().Be(target);
    }
}
