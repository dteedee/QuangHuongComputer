using Catalog.Domain;
using Catalog.Infrastructure;
using Catalog.Seo;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace UnitTests.Catalog.Gallery;

/// <summary>
/// "Cấu hình mẫu": chỉ bản sao của cửa hàng mà nhân viên bật công khai mới hiện ra; build của khách
/// không bao giờ bị công khai. Cùng một predicate cho API, SEO shell và sitemap.
/// </summary>
public class PcBuildGalleryVisibilityTests
{
    private static CatalogDbContext NewDb() => new(new DbContextOptionsBuilder<CatalogDbContext>()
        .UseInMemoryDatabase("gallery-" + Guid.NewGuid()).Options);

    private static SavedPcBuild CustomerBuild()
    {
        var build = new SavedPcBuild(Guid.NewGuid(), "PC của khách");
        build.AddItem(Guid.NewGuid(), "cpu", 1, 5_000_000m);
        build.AddItem(Guid.NewGuid(), "vga", 1, 9_000_000m);
        return build;
    }

    [Fact]
    public void BuildMoiCuaKhach_KhongCongKhai_VaKhongTheBatCongKhai()
    {
        var build = CustomerBuild();

        build.IsPublic.Should().BeFalse();
        build.IsFeatured.Should().BeFalse();
        build.Invoking(b => b.UpdateGallery("Gaming", "gaming", 0, true, true))
            .Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void BanSaoGallery_GiuNguyenBanGoc_MacDinhChuaCongKhai()
    {
        var source = CustomerBuild();

        var copy = SavedPcBuild.CreateGalleryCopy(source, "PC Gaming 15 triệu", "gaming", 2);

        copy.CustomerId.Should().BeNull();
        copy.Name.Should().Be("PC Gaming 15 triệu");
        copy.Items.Should().HaveCount(2);
        copy.TotalPrice.Should().Be(14_000_000m);
        copy.IsPublic.Should().BeFalse("nhân viên phải chủ động bật công khai");
        copy.BuildCode.Should().NotBe(source.BuildCode);
        source.Name.Should().Be("PC của khách");
    }

    [Theory]
    [InlineData("")]
    [InlineData("choi-game")]
    public void NhuCauKhongHopLe_BiTuChoi(string tag)
    {
        FluentActions.Invoking(() => SavedPcBuild.CreateGalleryCopy(CustomerBuild(), "Tiêu đề", tag, 0))
            .Should().Throw<ArgumentException>();
    }

    [Fact]
    public async Task PredicateCongKhai_ChiLayBanSaoDaBatCongKhai()
    {
        var db = NewDb();
        var customer = CustomerBuild();
        var hidden = SavedPcBuild.CreateGalleryCopy(customer, "Ẩn", "van-phong", 0);
        var shown = SavedPcBuild.CreateGalleryCopy(customer, "Hiện", "gaming", 1);
        shown.UpdateGallery("Hiện", "gaming", 1, isFeatured: true, isPublic: true);
        var removed = SavedPcBuild.CreateGalleryCopy(customer, "Đã gỡ", "gaming", 2);
        removed.UpdateGallery("Đã gỡ", "gaming", 2, false, true);
        removed.IsActive = false;
        db.SavedPcBuilds.AddRange(customer, hidden, shown, removed);
        await db.SaveChangesAsync();

        var visible = await db.SavedPcBuilds.IgnoreQueryFilters().Where(SavedPcBuild.IsPubliclyVisible).ToListAsync();

        visible.Should().ContainSingle().Which.Name.Should().Be("Hiện");
    }

    [Fact]
    public async Task SeoShell_GalleryRong_Noindex_KhongVaoSitemap_CoBanGhi_Index()
    {
        var db = NewDb();
        var provider = new PcBuildGallerySeoProvider(db);
        provider.TryMatch("/cau-hinh-mau").Should().BeTrue();
        provider.TryMatch("/cau-hinh-mau/abc").Should().BeFalse();

        (await provider.ResolveAsync("/cau-hinh-mau", "", CancellationToken.None))!.Robots.Should().Be("noindex,follow");
        (await ToListAsync(provider.EnumerateAsync(CancellationToken.None))).Should().BeEmpty();

        var shown = SavedPcBuild.CreateGalleryCopy(CustomerBuild(), "PC Đồ họa", "do-hoa", 0);
        shown.UpdateGallery("PC Đồ họa", "do-hoa", 0, false, true);
        db.SavedPcBuilds.Add(shown);
        await db.SaveChangesAsync();

        var page = await provider.ResolveAsync("/cau-hinh-mau", "", CancellationToken.None);
        page!.Status.Should().Be(200);
        page.Robots.Should().Be("index,follow");
        page.Description.Should().Contain("Đồ họa");
        (await ToListAsync(provider.EnumerateAsync(CancellationToken.None))).Should().ContainSingle(e => e.Path == "/cau-hinh-mau");
    }

    private static async Task<List<T>> ToListAsync<T>(IAsyncEnumerable<T> source)
    {
        var list = new List<T>();
        await foreach (var item in source) list.Add(item);
        return list;
    }
}
