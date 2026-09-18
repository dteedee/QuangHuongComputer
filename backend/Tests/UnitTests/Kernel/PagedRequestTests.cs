using BuildingBlocks.Paging;
using FluentAssertions;
using Xunit;

namespace UnitTests.Kernel;

/// <summary>
/// The paging contract every list endpoint in wave 2 binds to. The clamping is the whole point:
/// before this, each endpoint invented its own defaults, and several passed the caller's
/// <c>pageSize</c> straight to <c>Take()</c> - so <c>?pageSize=100000</c> materialised the table.
/// </summary>
public class PagedRequestTests
{
    [Fact]
    public void KhongCoThamSo_ThiDungMacDinh_Trang1_KichThuoc20()
    {
        var request = new PagedRequest();

        request.Page.Should().Be(1);
        request.PageSize.Should().Be(PagedRequest.DefaultPageSize).And.Be(20);
        request.Skip.Should().Be(0);
        request.Take.Should().Be(20);
    }

    [Theory]
    [InlineData(null, 1)]
    [InlineData(0, 1)]
    [InlineData(-5, 1)]
    [InlineData(3, 3)]
    public void SoTrang_LuonLonHonHoacBang1(int? page, int expected)
    {
        new PagedRequest { PageNumber = page }.Page.Should().Be(expected);
    }

    [Theory]
    [InlineData(null, 20)]
    [InlineData(0, 20)]
    [InlineData(-1, 20)]
    [InlineData(1, 1)]
    [InlineData(100, 100)]
    [InlineData(101, 100)]
    [InlineData(100000, 100)]
    public void KichThuocTrang_BiChanO100(int? pageSize, int expected)
    {
        new PagedRequest { Size = pageSize }.PageSize.Should().Be(expected);
        PagedRequest.MaxPageSize.Should().Be(100);
    }

    [Fact]
    public void Skip_TinhTuTrangDaChuanHoa_KhongBaoGioAm()
    {
        new PagedRequest { PageNumber = 3, Size = 25 }.Skip.Should().Be(50);
        new PagedRequest { PageNumber = -9, Size = 25 }.Skip.Should().Be(0);
    }

    [Theory]
    [InlineData(null, false)]
    [InlineData("", false)]
    [InlineData("asc", false)]
    [InlineData("ASC", false)]
    [InlineData("linh tinh", false)]
    [InlineData("desc", true)]
    [InlineData("DESC", true)]
    [InlineData("Desc", true)]
    public void SortDir_ChiNhanDesc_ConLaiLaTangDan(string? sortDir, bool expected)
    {
        new PagedRequest { SortDir = sortDir }.Descending.Should().Be(expected);
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData("", null)]
    [InlineData("   ", null)]
    [InlineData("  ssd  ", "ssd")]
    public void Search_TrimVaCoiKhoangTrangLaRong(string? search, string? expected)
    {
        new PagedRequest { Search = search }.NormalizedSearch.Should().Be(expected);
    }
}
