using BuildingBlocks.Seo;
using Content.Application.Redirects;
using FluentAssertions;
using Xunit;

namespace UnitTests.Domain.Content;

/// <summary>Tra cứu lúc chạy (đường nóng của SEO shell): gộp chuỗi cũ, 410, vòng lặp.</summary>
public class UrlRedirectResolveTests
{
    private static Dictionary<string, UrlRedirectEntry> Table(params UrlRedirectEntry[] rows) =>
        rows.ToDictionary(r => r.FromPath, StringComparer.Ordinal);

    private static UrlRedirectEntry Row(string from, string? to, int status = 301) => new(Guid.NewGuid(), from, status, to);

    [Fact]
    public void KhongCoDong_TraNull() =>
        UrlRedirectTable.Resolve(Table(Row("/a", "/b")), "/khac").Should().BeNull();

    [Fact]
    public void MotBuoc_TraDich()
    {
        var row = Row("/a", "/b?x=1", 302);
        var match = UrlRedirectTable.Resolve(Table(row), "/a");
        match.Should().BeEquivalentTo(new UrlRedirectMatch(row.Id, "/a", 302, "/b?x=1", 1));
    }

    [Fact]
    public void ChuoiCu_DuocGopThanhMotBuoc()
    {
        var first = Row("/a", "/b");
        var match = UrlRedirectTable.Resolve(Table(first, Row("/b", "/c"), Row("/c", "https://x.vn/d")), "/a");
        match!.Id.Should().Be(first.Id);
        match.Target.Should().Be("https://x.vn/d");
        match.Hops.Should().Be(3);
    }

    [Fact]
    public void ChuoiKetThucBang410_Tra410() =>
        UrlRedirectTable.Resolve(Table(Row("/a", "/b"), Row("/b", null, 410)), "/a")!
            .StatusCode.Should().Be(410);

    [Fact]
    public void VongLap_TraNull_KhongChuyenHuongVoTan() =>
        UrlRedirectTable.Resolve(Table(Row("/a", "/b"), Row("/b", "/a")), "/a").Should().BeNull();
}
