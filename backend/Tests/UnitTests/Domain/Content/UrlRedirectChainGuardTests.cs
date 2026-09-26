using Content.Application.Redirects;
using Content.Domain;
using FluentAssertions;
using Xunit;

namespace UnitTests.Domain.Content;

/// <summary>Bảng chuyển hướng phải PHẲNG: không tự trỏ, không vòng lặp, không chuỗi — ở lúc lưu.</summary>
public class UrlRedirectChainGuardTests
{
    private static Dictionary<string, string?> Table(params (string From, string? To)[] rows) =>
        rows.ToDictionary(r => r.From, r => r.To, StringComparer.Ordinal);

    [Fact]
    public void TuTroVeChinhNo_BiTuChoi() =>
        UrlRedirectChainGuard.Check("/a", "/a", Table()).Should().Contain("chính nó");

    [Fact]
    public void BangRong_HopLe() =>
        UrlRedirectChainGuard.Check("/a", "/b", Table()).Should().BeNull();

    [Fact]
    public void VongLap_HaiBuoc_BiTuChoi() =>
        UrlRedirectChainGuard.Check("/a", "/b", Table(("/b", "/a"))).Should().Contain("vòng lặp");

    [Fact]
    public void VongLap_NhieuBuoc_BiTuChoi() =>
        UrlRedirectChainGuard.Check("/a", "/b", Table(("/b", "/c"), ("/c", "/d"), ("/d", "/a")))
            .Should().Contain("vòng lặp");

    [Fact]
    public void VongLap_KhongChuaNguon_VanBiPhatHien() =>
        UrlRedirectChainGuard.Check("/a", "/b", Table(("/b", "/c"), ("/c", "/b"))).Should().Contain("vòng lặp");

    [Fact]
    public void ChuoiDiRa_BiTuChoi_VaChiRaDichCuoi() =>
        UrlRedirectChainGuard.Check("/a", "/b", Table(("/b", "/c"), ("/c", "/d")))
            .Should().Contain("/d");

    [Fact]
    public void ChuoiDiVao_BiTuChoi() =>
        UrlRedirectChainGuard.Check("/a", "/b", Table(("/x", "/a"))).Should().Contain("/x");

    [Fact]
    public void ChuoiQuaDaiHonMaxDepth_BiTuChoi()
    {
        var rows = Enumerable.Range(1, UrlRedirectChainGuard.MaxDepth + 2)
            .Select(i => ($"/p{i}", (string?)$"/p{i + 1}")).ToArray();
        UrlRedirectChainGuard.Check("/start", "/p1", Table(rows)).Should().Contain("dài quá");
    }

    [Fact]
    public void DichLaUrlNgoai_KhongPhaiChuoi() =>
        UrlRedirectChainGuard.Check("/a", null, Table(("/b", "/c"))).Should().BeNull();

    // ---- Luật trên snapshot toàn bảng (dùng chung cho form và nhập CSV) ----

    [Fact]
    public void Rules_TrungNguon_KhongPhanBietHoaThuong()
    {
        var existing = Guid.NewGuid();
        var rules = UrlRedirectRules.FromRows(new[] { (existing, "/laptop-cu", true, (string?)"/san-pham/moi") });

        var result = rules.Validate(new UrlRedirectInput("/LAPTOP-CU/", "/san-pham/khac", 301, null), null);

        result.Failure.Should().Be(UrlRedirectRuleFailure.Duplicate);
        result.DuplicateOfId.Should().Be(existing);
        rules.Validate(new UrlRedirectInput("/LAPTOP-CU/", "/san-pham/khac", 301, null), existing).Ok.Should().BeTrue();
    }

    [Fact]
    public void Rules_DongTatKhongTaoChuoi()
    {
        var rules = UrlRedirectRules.FromRows(new[] { (Guid.NewGuid(), "/b", false, (string?)"/c") });
        rules.Validate(new UrlRedirectInput("/a", "/b", 301, null), null).Ok.Should().BeTrue();
    }

    [Fact]
    public void Rules_Track_BatDuocChuoiTrongCungMotTep()
    {
        var rules = UrlRedirectRules.FromRows(Array.Empty<(Guid, string, bool, string?)>());
        var first = rules.Validate(new UrlRedirectInput("/a", "/b", 301, null), null);
        first.Ok.Should().BeTrue();
        rules.Track(Guid.NewGuid(), first.Value!);

        rules.Validate(new UrlRedirectInput("/b", "/c", 301, null), null).Error.Should().Contain("/a");
        rules.Validate(new UrlRedirectInput("/A", "/x", 301, null), null).Failure.Should().Be(UrlRedirectRuleFailure.Duplicate);
    }

    [Fact]
    public void Rules_MaTrangThaiLa_BiTuChoi() =>
        UrlRedirectRules.FromRows(Array.Empty<(Guid, string, bool, string?)>())
            .Validate(new UrlRedirectInput("/a", "/b", 307, null), null).Failure.Should().Be(UrlRedirectRuleFailure.Invalid);
}
