using BuildingBlocks.Seo;
using Content.Domain;
using Content.Seo;
using FluentAssertions;
using Xunit;
using static UnitTests.Seo.SeoContentTestData;

namespace UnitTests.Seo;

/// <summary>Catch-all `/{slug}` cho CMSPage: chỉ trang đã xuất bản, một URL chuẩn, không che route thật.</summary>
public class CmsPageSeoProviderTests
{
    private static CMSPage Published(string slug, string content = "<p>Bước 1</p><script>x()</script>")
    {
        var page = new CMSPage($"Trang {slug}", slug, content);
        page.Publish();
        return page;
    }

    [Theory]
    [InlineData("/huong-dan-mua-hang", true)]
    [InlineData("/gio-hang", false)]
    [InlineData("/san-pham", false)]
    [InlineData("/Huong-Dan", false)]
    [InlineData("/a/b", false)]
    [InlineData("/", false)]
    public void TryMatch(string path, bool expected) => new CmsPageSeoProvider(NewDb()).TryMatch(path).Should().Be(expected);

    [Fact]
    public async Task TrangDaXuatBan_200CoH1VaThanDaLoc()
    {
        var db = NewDb();
        db.Pages.Add(Published("huong-dan-mua-hang"));
        await db.SaveChangesAsync();

        var page = await new CmsPageSeoProvider(db).ResolveAsync("/huong-dan-mua-hang", "", CancellationToken.None);

        page!.Status.Should().Be(200);
        page.CanonicalPath.Should().Be("/huong-dan-mua-hang");
        page.Body!.Heading.Should().Be("Trang huong-dan-mua-hang");
        page.Body.Article!.Value.Should().Be("<p>Bước 1</p>");
    }

    [Fact]
    public async Task NhapHoacKhongCo_404()
    {
        var db = NewDb();
        db.Pages.Add(new CMSPage("Nháp", "nhap", "x"));
        await db.SaveChangesAsync();
        var provider = new CmsPageSeoProvider(db);

        (await provider.ResolveAsync("/nhap", "", CancellationToken.None))!.Status.Should().Be(404);
        (await provider.ResolveAsync("/khong-co", "", CancellationToken.None))!.Status.Should().Be(404);
    }

    [Fact]
    public async Task SlugChinhSachHoacCoDinh_301VeUrlChuan()
    {
        var db = NewDb();
        db.Pages.AddRange(Published("huong-dan-thanh-toan"), Published("huong-dan-mua-hang"), Published("gioi-thieu"));
        await db.SaveChangesAsync();

        var viaCatchAll = await new CmsPageSeoProvider(db).ResolveAsync("/huong-dan-thanh-toan", "", CancellationToken.None);
        viaCatchAll!.RedirectTo.Should().Be("/chinh-sach/huong-dan-thanh-toan");

        var viaPolicy = await new ContentPageSeoProvider(db).ResolveAsync("/chinh-sach/huong-dan-mua-hang", "", CancellationToken.None);
        viaPolicy!.RedirectTo.Should().Be("/huong-dan-mua-hang");

        var fixedPage = await new ContentPageSeoProvider(db).ResolveAsync("/gioi-thieu", "", CancellationToken.None);
        fixedPage!.Status.Should().Be(200);
        fixedPage.Body!.Heading.Should().Be("Trang gioi-thieu");
    }

    [Fact]
    public async Task Sitemap_MoiTrangMotUrl()
    {
        var db = NewDb();
        db.Pages.AddRange(Published("huong-dan-mua-hang"), Published("van-chuyen"), Published("gioi-thieu"), Published("khuyen-mai"));
        await db.SaveChangesAsync();

        var paths = (await ToListAsync(new CmsPageSeoProvider(db).EnumerateAsync(CancellationToken.None)))
            .Concat(await ToListAsync(new ContentPageSeoProvider(db).EnumerateAsync(CancellationToken.None)))
            .Select(e => e.Path).ToList();

        paths.Should().BeEquivalentTo(new[] { "/huong-dan-mua-hang", "/chinh-sach/van-chuyen", "/gioi-thieu" },
            "slug trùng route thật (khuyen-mai) không vào sitemap");
    }
}
