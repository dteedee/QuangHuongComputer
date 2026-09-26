using Content.Domain;
using FluentAssertions;
using Xunit;

namespace UnitTests.Domain.Content;

/// <summary>Chuẩn hoá + kiểm tra đường dẫn của bảng chuyển hướng URL (thuần, không DB).</summary>
public class UrlRedirectPathTests
{
    [Theory]
    [InlineData("/San-Pham/Laptop-Cu/", "/san-pham/laptop-cu")]
    [InlineData("/san-pham/laptop?utm_source=fb#top", "/san-pham/laptop")]
    [InlineData("//tin-tuc//bai-viet///", "/tin-tuc/bai-viet")]
    [InlineData("/m%C3%A1y-t%C3%ADnh", "/máy-tính")]
    [InlineData("https://old-shop.vn/Product.php?id=5", "/product.php")]
    [InlineData("", "/")]
    public void ToKey_ChuanHoa(string input, string expected) =>
        UrlRedirectPath.ToKey(input).Should().Be(expected);

    [Fact]
    public void Source_HopLe_DuocChuanHoa()
    {
        UrlRedirectPath.TryNormalizeSource(" /Laptop-Dell.HTML/ ", out var normalized, out var error).Should().BeTrue();
        normalized.Should().Be("/laptop-dell.html");
        error.Should().BeNull();
    }

    [Theory]
    [InlineData("san-pham/x")]           // không bắt đầu bằng /
    [InlineData("//evil.com/x")]         // protocol-relative
    [InlineData("/")]                    // trang chủ
    [InlineData("   ")]
    [InlineData("/api/catalog/products")]
    [InlineData("/api")]
    [InlineData("/_shell/abc")]
    [InlineData("/_shellx")]
    [InlineData("/hubs/chat")]
    [InlineData("/media/seed/a")]
    [InlineData("/uploads/a")]
    [InlineData("/healthz")]
    [InlineData("/backoffice/products")]
    [InlineData("/sitemap.xml")]
    [InlineData("/robots.txt")]
    [InlineData("/assets/index-abc.js")]
    [InlineData("/images/logo.png")]
    [InlineData("/style.CSS")]
    [InlineData("/a\\b")]
    public void Source_KhongHopLe_BiTuChoi(string input)
    {
        UrlRedirectPath.TryNormalizeSource(input, out _, out var error).Should().BeFalse();
        error.Should().NotBeNullOrWhiteSpace();
    }

    [Theory]
    [InlineData("/old.html")]
    [InlineData("/old.php")]
    [InlineData("/apis-la-tu-khac")]     // chỉ /api và /api/* bị chặn
    public void Source_DuongDanWebCu_DuocChap(string input) =>
        UrlRedirectPath.TryNormalizeSource(input, out _, out _).Should().BeTrue();

    [Theory]
    [InlineData("/san-pham/moi")]
    [InlineData("/danh-muc/laptop?brand=dell")]
    [InlineData("https://quanghuong.vn/khuyen-mai")]
    [InlineData("http://example.com")]
    public void Target_HopLe(string input) =>
        UrlRedirectPath.TryNormalizeTarget(input, 301, out _, out _).Should().BeTrue();

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("JaVaScRiPt:alert(1)")]
    [InlineData("data:text/html,<script>")]
    [InlineData("vbscript:msgbox")]
    [InlineData("//evil.com")]
    [InlineData("ftp://host/file")]
    [InlineData("san-pham/khong-co-gach")]
    [InlineData("/co khoang trang")]
    [InlineData("")]
    [InlineData(null)]
    public void Target_NguyHiemHoacSai_BiTuChoi(string? input)
    {
        UrlRedirectPath.TryNormalizeTarget(input, 302, out _, out var error).Should().BeFalse();
        error.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void Target_410_KhongCanDich()
    {
        UrlRedirectPath.TryNormalizeTarget("javascript:ignored", 410, out var normalized, out var error).Should().BeTrue();
        normalized.Should().BeNull();
        error.Should().BeNull();
    }

    [Fact]
    public void TargetKey_ChiChoDuongDanTuongDoi()
    {
        UrlRedirectPath.TargetKey("/San-Pham/X/?a=1").Should().Be("/san-pham/x");
        UrlRedirectPath.TargetKey("https://quanghuong.vn/x").Should().BeNull();
        UrlRedirectPath.TargetKey(null).Should().BeNull();
    }
}
