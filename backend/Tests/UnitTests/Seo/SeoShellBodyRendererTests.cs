using BuildingBlocks.Seo;
using FluentAssertions;
using Xunit;

namespace UnitTests.Seo;

/// <summary>Renderer thân trang: encode mọi chuỗi, chỉ phát link gốc, chèn đúng giữa hai marker.</summary>
public class SeoShellBodyRendererTests
{
    [Fact]
    public void SanPham_H1GiaThongSoBreadcrumb()
    {
        var html = SeoShellBodyRenderer.Render(new SeoBodyFragment
        {
            Heading = "Laptop <b>ASUS</b> & co",
            Breadcrumbs = new[] { new SeoLink("Trang chủ", "/"), new SeoLink("Laptop", "/danh-muc/laptop"), new SeoLink("ASUS", null) },
            Facts = new[] { new SeoFact("Giá", SeoTextFormat.Vnd(12_990_000m)), new SeoFact("Tình trạng", "Còn hàng") },
            Specs = new[] { new SeoFact("CPU", "i5-13420H") },
            Summary = "Mỏng <nhẹ>",
        });

        html.Should().StartWith("<main class=\"seo-snapshot\">").And.EndWith("</main>");
        html.Should().Contain("<h1>Laptop &lt;b&gt;ASUS&lt;/b&gt; &amp; co</h1>");
        html.Should().Contain("<p><strong>Giá:</strong> 12.990.000 ₫</p>");
        html.Should().Contain("<a href=\"/danh-muc/laptop\">Laptop</a> › <span>ASUS</span>");
        html.Should().Contain("<h2>Thông số chính</h2><ul><li><strong>CPU:</strong> i5-13420H</li></ul>");
        html.Should().Contain("<p>Mỏng &lt;nhẹ&gt;</p>");
        html.Should().NotContain("<script").And.NotContain("style=");
    }

    [Fact]
    public void DanhMuc_DanhSachVaPhanTrang_BoLinkKhongPhaiDuongDanGoc()
    {
        var html = SeoShellBodyRenderer.Render(new SeoBodyFragment
        {
            Heading = "Laptop",
            Items = new[]
            {
                new SeoListItem("Máy A", "/san-pham/may-a", "10.000.000 ₫"),
                new SeoListItem("Xấu", "javascript:alert(1)", null),
                new SeoListItem("Ngoài", "//evil.com", null),
            },
            PreviousPage = new SeoLink("Trang trước", "/danh-muc/laptop"),
            NextPage = new SeoLink("Trang sau", "/danh-muc/laptop?page=3"),
        });

        html.Should().Contain("<li><a href=\"/san-pham/may-a\">Máy A</a> — 10.000.000 ₫</li>");
        html.Should().Contain("<li><span>Xấu</span></li>").And.Contain("<li><span>Ngoài</span></li>");
        html.Should().NotContain("javascript:").And.NotContain("evil.com\"");
        html.Should().Contain("<a href=\"/danh-muc/laptop\" rel=\"prev\">Trang trước</a> · <a href=\"/danh-muc/laptop?page=3\" rel=\"next\">Trang sau</a>");
    }

    [Fact]
    public void BaiViet_ChiNhanHtmlDaLoc()
    {
        var html = SeoShellBodyRenderer.Render(new SeoBodyFragment
        {
            Heading = "Tin",
            Article = SeoHtmlSanitizer.Sanitize("<p onclick=x>ok</p><script>bad()</script>"),
        });

        html.Should().Contain("<article><p>ok</p></article>").And.NotContain("bad()");
    }

    [Theory]
    [InlineData(0, "0 ₫")]
    [InlineData(990, "990 ₫")]
    [InlineData(12990000.4, "12.990.000 ₫")]
    public void DinhDangVnd(decimal amount, string expected) => SeoTextFormat.Vnd(amount).Should().Be(expected);
}
