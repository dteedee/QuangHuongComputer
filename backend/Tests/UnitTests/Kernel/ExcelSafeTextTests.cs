using BuildingBlocks.Spreadsheet;
using FluentAssertions;
using Xunit;

namespace UnitTests.Kernel;

/// <summary>
/// Formula injection (CWE-1236). The victim is the shop's own staff opening an export, and nothing
/// about the request that STORED the text looks malicious - so the check has to live on the write
/// side, once, for every export.
/// </summary>
public class ExcelSafeTextTests
{
    [Theory]
    [InlineData("=HYPERLINK(\"http://evil\",\"click\")")]
    [InlineData("+1+1")]
    [InlineData("-2+3+cmd|'/c calc'!A0")]
    [InlineData("@SUM(A1:A9)")]
    [InlineData("=cmd|'/c calc'!A0")]
    public void ChuoiBatDauBangKyTuCongThuc_BiVoHieuHoa(string dangerous)
    {
        ExcelSafeText.IsDangerous(dangerous).Should().BeTrue();
        ExcelSafeText.Neutralize(dangerous).Should().Be("'" + dangerous);
    }

    /// <summary>
    /// Một số trình đọc bỏ qua khoảng trắng đầu ô trước khi quyết định đó có phải công thức không,
    /// nên kiểm tra "ký tự đầu tiên" một cách ngây thơ sẽ bị qua mặt bằng một dấu tab.
    /// </summary>
    [Theory]
    [InlineData("\t=cmd|'/c calc'!A0", "'=cmd|'/c calc'!A0")]
    [InlineData("  =1+1", "'=1+1")]
    public void KhoangTrangDauChuoi_KhongQuaMatDuoc(string dangerous, string expected)
    {
        ExcelSafeText.Neutralize(dangerous).Should().Be(expected);
    }

    [Theory]
    [InlineData("SSD 980 PRO 1TB")]
    [InlineData("2.490.000 ₫")]
    [InlineData("Bảo hành 36 tháng")]
    [InlineData("")]
    [InlineData(null)]
    public void VanBanBinhThuong_GiuNguyen(string? safe)
    {
        ExcelSafeText.IsDangerous(safe).Should().BeFalse();
        ExcelSafeText.Neutralize(safe).Should().Be(safe);
    }
}
