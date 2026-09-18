using BuildingBlocks.Database;
using FluentAssertions;
using Xunit;

namespace UnitTests.Kernel;

/// <summary>
/// D10's bulk audit scope. Without it a 5.000-row import writes 5.000 before/after JSON documents to
/// <c>AuditLogs</c> in one request.
/// </summary>
public class AuditScopeTests
{
    [Fact]
    public void MacDinh_KhongOTrongPhamViHangLoat()
    {
        AuditScope.IsBulk.Should().BeFalse();
        AuditScope.Current.Should().BeNull();
    }

    [Fact]
    public void TrongPhamVi_GhiNhanThaoTacVaTenTep()
    {
        using (AuditScope.Bulk("Nhập sản phẩm", "san-pham-2026-09.xlsx"))
        {
            AuditScope.IsBulk.Should().BeTrue();
            AuditScope.Current!.Operation.Should().Be("Nhập sản phẩm");
            AuditScope.Current.FileName.Should().Be("san-pham-2026-09.xlsx");
        }

        AuditScope.IsBulk.Should().BeFalse();
    }

    /// <summary>Phạm vi lồng nhau giữ phạm vi NGOÀI, để bản tóm tắt vẫn là một dòng duy nhất.</summary>
    [Fact]
    public void LongNhau_GiuPhamViNgoai()
    {
        using (AuditScope.Bulk("Ngoài", "ngoai.xlsx"))
        {
            using (AuditScope.Bulk("Trong", "trong.xlsx"))
            {
                AuditScope.Current!.Operation.Should().Be("Ngoài");
            }

            AuditScope.IsBulk.Should().BeTrue("phạm vi trong đóng lại không được đóng luôn phạm vi ngoài");
            AuditScope.Current!.Operation.Should().Be("Ngoài");
        }

        AuditScope.IsBulk.Should().BeFalse();
    }

    [Fact]
    public async Task ChayTiepQuaAwait()
    {
        using (AuditScope.Bulk("Nhập tồn kho"))
        {
            await Task.Yield();
            AuditScope.IsBulk.Should().BeTrue();
        }
    }

    [Fact]
    public void TenThaoTacRong_ThiDungNhanMacDinh()
    {
        using (AuditScope.Bulk("   "))
        {
            AuditScope.Current!.Operation.Should().Be("Thao tác hàng loạt");
        }
    }
}
