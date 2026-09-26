using BuildingBlocks.Seo;
using BuildingBlocks.Storage;
using Catalog.Domain;
using Catalog.Infrastructure;
using Catalog.Seo;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace UnitTests.Seo;

/// <summary>Thân trang SEO shell của trang sản phẩm và danh mục (H1, giá, tồn kho, thông số, danh sách, phân trang).</summary>
public class CatalogSeoBodyTests
{
    private sealed class RelativeMedia : IMediaUrlResolver
    {
        public string ToAbsolute(string? relativeUrl) => relativeUrl ?? string.Empty;
    }

    private static CatalogDbContext NewDb() =>
        new(new DbContextOptionsBuilder<CatalogDbContext>().UseInMemoryDatabase("seo-catalog-" + Guid.NewGuid()).Options);

    private static async Task<(CatalogDbContext Db, Category Category)> SeedAsync(int productCount)
    {
        var db = NewDb();
        var category = new Category("Laptop", "<p>Laptop <b>chính hãng</b></p>");
        category.SetSlug("laptop");
        var brand = new Brand("ASUS", "");
        db.Categories.Add(category);
        db.Brands.Add(brand);
        for (var i = 1; i <= productCount; i++)
        {
            const string specs = "[{\"group\":\"CPU\",\"label\":\"Bộ xử lý\",\"value\":\"i5-13420H\"},{\"group\":\"RAM\",\"label\":\"RAM\",\"value\":\"16GB\"}]";
            var product = new Product($"Laptop ASUS số {i}", 10_000_000m + i, 1m, "<p>Mô tả <script>x()</script>ngắn</p>",
                category.Id, brand.Id, stockQuantity: i == 1 ? 0 : 20, specifications: specs);
            product.SetSlug($"laptop-asus-{i}");
            product.Publish();
            db.Products.Add(product);
        }
        await db.SaveChangesAsync();
        return (db, category);
    }

    [Fact]
    public async Task SanPham_BodyCoH1GiaTinhTrangThongSoBreadcrumb()
    {
        var (db, _) = await SeedAsync(2);
        var provider = new CatalogProductDetailSeoProvider(db, new CatalogJsonLdBuilder(new RelativeMedia()));

        var page = await provider.ResolveAsync("/san-pham/laptop-asus-2", "", CancellationToken.None);

        var body = page!.Body!;
        body.Heading.Should().Be("Laptop ASUS số 2");
        body.Facts.Should().Contain(new SeoFact("Giá", "10.000.002 ₫")).And.Contain(new SeoFact("Tình trạng", "Còn hàng"));
        body.Specs.Should().Equal(new SeoFact("Bộ xử lý", "i5-13420H"), new SeoFact("RAM", "16GB"));
        body.Breadcrumbs.Select(c => c.Href).Should().Equal("/", "/danh-muc/laptop", null);
        body.Summary.Should().Be("Mô tả ngắn", "mô tả là văn bản thuần, script bị bỏ");
    }

    [Fact]
    public async Task SanPham_HetHang()
    {
        var (db, _) = await SeedAsync(1);
        var provider = new CatalogProductDetailSeoProvider(db, new CatalogJsonLdBuilder(new RelativeMedia()));

        var page = await provider.ResolveAsync("/san-pham/laptop-asus-1", "", CancellationToken.None);

        page!.Body!.Facts.Should().Contain(new SeoFact("Tình trạng", "Hết hàng"));
    }

    [Fact]
    public async Task DanhMuc_Trang1_24LinkCoGiaVaLinkTrangSau()
    {
        var (db, _) = await SeedAsync(30);
        var provider = new CatalogCategorySeoProvider(db, new CatalogJsonLdBuilder(new RelativeMedia()));

        var body = (await provider.ResolveAsync("/danh-muc/laptop", "", CancellationToken.None))!.Body!;

        body.Heading.Should().Be("Laptop");
        body.Summary.Should().Be("Laptop chính hãng");
        body.Items.Should().HaveCount(24);
        body.Items.Should().OnlyContain(i => i.Href.StartsWith("/san-pham/laptop-asus-") && i.Detail!.EndsWith(" ₫"));
        body.PreviousPage.Should().BeNull();
        body.NextPage!.Href.Should().Be("/danh-muc/laptop?page=2");
    }

    [Fact]
    public async Task DanhMuc_Trang2_LinkTrangTruocVeUrlSach()
    {
        var (db, _) = await SeedAsync(30);
        var provider = new CatalogCategorySeoProvider(db, new CatalogJsonLdBuilder(new RelativeMedia()));

        var body = (await provider.ResolveAsync("/danh-muc/laptop", "?page=2", CancellationToken.None))!.Body!;

        body.Items.Should().HaveCount(6);
        body.PreviousPage!.Href.Should().Be("/danh-muc/laptop");
        body.NextPage.Should().BeNull();
    }
}
