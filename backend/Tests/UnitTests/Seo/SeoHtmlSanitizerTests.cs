using BuildingBlocks.Seo;
using FluentAssertions;
using Xunit;

namespace UnitTests.Seo;

/// <summary>Bộ lọc allow-list cho thân bài trong SEO shell: dựng lại markup, không bao giờ để lọt script/thuộc tính.</summary>
public class SeoHtmlSanitizerTests
{
    private static string Clean(string html) => SeoHtmlSanitizer.Sanitize(html).Value;

    [Fact]
    public void GiuThePhoBien_BoMoiThuocTinh()
    {
        Clean("<p class=\"x\" style=\"color:red\" onclick=\"alert(1)\">Xin <strong>chào</strong></p>")
            .Should().Be("<p>Xin <strong>chào</strong></p>");
    }

    [Theory]
    [InlineData("<script>alert(1)</script>ok", "ok")]
    [InlineData("<STYLE>p{}</STYLE><p>a</p>", "<p>a</p>")]
    [InlineData("<iframe src=\"//x\">nội dung</iframe>b", "b")]
    [InlineData("<img src=x onerror=alert(1)>c", "c")]
    [InlineData("<svg><script>alert(1)</script></svg>d", "d")]
    [InlineData("<!-- <script>x</script> -->e", "e")]
    public void XoaTheNguyHiemCaNoiDung(string input, string expected) => Clean(input).Should().Be(expected);

    [Theory]
    [InlineData("<a href=\"javascript:alert(1)\">x</a>", "<a>x</a>")]
    [InlineData("<a href=\" JaVaScRiPt:alert(1)\">x</a>", "<a>x</a>")]
    [InlineData("<a href=\"&#106;avascript:alert(1)\">x</a>", "<a>x</a>")]
    [InlineData("<a href=\"data:text/html,x\">x</a>", "<a>x</a>")]
    [InlineData("<a href=\"//evil.com\">x</a>", "<a>x</a>")]
    [InlineData("<a href=\"/san-pham/a?b=1&amp;c=2\">x</a>", "<a href=\"/san-pham/a?b=1&amp;c=2\">x</a>")]
    [InlineData("<a href='https://hacom.vn' target=_blank>x</a>", "<a href=\"https://hacom.vn\" rel=\"nofollow noopener\">x</a>")]
    public void HrefChiChoPhepDuongDanAnToan(string input, string expected) => Clean(input).Should().Be(expected);

    [Fact]
    public void ChuDuocEncode_TheKhongCanDuocDong()
    {
        Clean("a < b & \"c\" <ul><li>một<li>hai</ul></p><em>mở")
            .Should().Be("a &lt; b &amp; &quot;c&quot; <ul><li>một<li>hai</li></li></ul><em>mở</em>");
    }

    [Fact]
    public void H1TrongBaiHaXuongH2()
    {
        Clean("<h1>Tiêu đề</h1><h6>nhỏ</h6>").Should().Be("<h2>Tiêu đề</h2><h4>nhỏ</h4>");
    }

    [Fact]
    public void ThuocTinhChuaDauLon_KhongVoTag()
    {
        Clean("<p title=\"a>b\">x</p>").Should().Be("<p>x</p>");
    }

    [Fact]
    public void ToPlainText_BoTheVaGopKhoangTrang()
    {
        SeoHtmlSanitizer.ToPlainText("<p>Laptop&nbsp;<b>mỏng</b></p>\n\n<p>nhẹ</p>").Should().Be("Laptop mỏng nhẹ");
    }
}
