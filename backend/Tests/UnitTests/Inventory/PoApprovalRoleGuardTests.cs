using System.Security.Claims;
using BuildingBlocks.Security;
using FluentAssertions;
using InventoryModule.Application.Purchasing;
using Xunit;

namespace UnitTests.Inventory;

/// <summary>
/// IR W0 #45: <see cref="PoApprovalService.EnsureApproverHasRequiredRole"/> là guard duyệt PO
/// theo role thực (claim), không tin group /api/inventory ở endpoint. D-scope: fail-closed khi
/// RequiredRole rỗng, Admin luôn được bỏ qua, người không đúng role bị chặn.
/// </summary>
public class PoApprovalRoleGuardTests
{
    private static ClaimsPrincipal PrincipalWithRole(string role)
    {
        var identity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.Role, role) }, "test");
        return new ClaimsPrincipal(identity);
    }

    [Fact]
    public void NguoiDuyetDungRole_ThiKhongNem()
    {
        var approver = PrincipalWithRole(Roles.Manager);

        var act = () => PoApprovalService.EnsureApproverHasRequiredRole(approver, Roles.Manager);

        act.Should().NotThrow();
    }

    [Fact]
    public void NguoiDuyetSaiRole_ThiTuChoi()
    {
        // InventoryStaff nằm trong group /api/inventory nhưng hạn mức PO này đòi Manager.
        var approver = PrincipalWithRole(Roles.InventoryStaff);

        var act = () => PoApprovalService.EnsureApproverHasRequiredRole(approver, Roles.Manager);

        act.Should().Throw<UnauthorizedAccessException>();
    }

    [Fact]
    public void Admin_LuonDuocBoQua_BatKeRequiredRoleLaGi()
    {
        var approver = PrincipalWithRole(Roles.Admin);

        var act = () => PoApprovalService.EnsureApproverHasRequiredRole(approver, Roles.Manager);

        act.Should().NotThrow();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void HanMucKhongKhaiBaoRequiredRole_ThiTuChoi_FailClosed(string? requiredRole)
    {
        // Không có role bắt buộc không có nghĩa là "ai cũng duyệt được" — fail-closed.
        var approver = PrincipalWithRole(Roles.Manager);

        var act = () => PoApprovalService.EnsureApproverHasRequiredRole(approver, requiredRole!);

        act.Should().Throw<UnauthorizedAccessException>();
    }
}
