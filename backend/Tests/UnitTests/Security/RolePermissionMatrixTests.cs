using BuildingBlocks.Security;
using FluentAssertions;
using Xunit;

namespace UnitTests.Security;

/// <summary>
/// Ma trận vai trò là hợp đồng W1-1 mà hơn 40 track sau dựa vào. Các test dưới đây
/// khoá lại những tính chất mà tiêu chí nghiệm thu của phase-10 yêu cầu.
/// </summary>
public class RolePermissionMatrixTests
{
    [Fact]
    public void MatrixOnlyReferencesPermissionsInTheCatalogue()
    {
        RolePermissionMatrix.UnknownPermissions().Should().BeEmpty(
            "mọi quyền trong ma trận phải là hằng số có thật trong Permissions.*");
    }

    [Fact]
    public void EveryRoleInTheMatrixIsARealRole()
    {
        RolePermissionMatrix.RoleNames().Should().BeSubsetOf(Roles.All);
        RolePermissionMatrix.RoleNames().Should().Contain(Roles.Admin);
    }

    [Fact]
    public void AdminHoldsEveryPermission()
    {
        RolePermissionMatrix.For(Roles.Admin).Should().BeEquivalentTo(Permissions.GetAllPermissions());
    }

    /// <summary>
    /// Cấp một quyền mà thiếu quyền cha = quyền chết (UI ẩn, endpoint 403).
    /// Ma trận phải tự đóng về mặt phụ thuộc, không dựa vào việc seeder tự vá.
    /// </summary>
    [Fact]
    public void EveryRoleSetIsClosedUnderDependencies()
    {
        foreach (var role in RolePermissionMatrix.RoleNames())
        {
            var granted = RolePermissionMatrix.For(role);
            var missing = PermissionRegistry.GetMissingDependencies(granted.ToList());

            missing.Should().BeEmpty($"role '{role}' thiếu quyền cha: " +
                string.Join(", ", missing.Select(kv => $"{kv.Key} cần {kv.Value}")));
        }
    }

    [Fact]
    public void CustomerHasNoStaffPermission()
    {
        var staffOnlyModules = new[]
        {
            "HR", "Accounting", "Inventory", "Users", "Roles", "System", "CRM", "Reporting", "Payments"
        };

        var customer = RolePermissionMatrix.For(Roles.Customer);

        customer.Should().NotContain(p => staffOnlyModules.Contains(Permissions.ModuleOf(p)));

        var privilegedTypes = new[]
        {
            PermissionType.Manage, PermissionType.Approve, PermissionType.Delete, PermissionType.Export
        };
        var privileged = customer.Where(p => privilegedTypes.Contains(PermissionRegistry.Find(p)!.Type)).ToList();
        privileged.Should().BeEmpty("khách hàng chỉ được xem và tạo dữ liệu của chính mình");
    }

    [Fact]
    public void SupplierSeesOnlyPurchaseOrdersAndCatalogue()
    {
        RolePermissionMatrix.For(Roles.Supplier).Should().BeEquivalentTo(new[]
        {
            Permissions.Inventory.ViewPurchaseOrder,
            Permissions.Catalog.View
        });
    }

    /// <summary>
    /// Phần "Decision updates (D01-D12, binding)" của phase-10 ghi rõ:
    /// <c>Sales.SellOnCredit</c> mặc định CHỈ Admin và Manager. Bán công nợ là quyền
    /// đụng tiền nên khoá lại bằng test, không để một lần sửa ma trận nới ra âm thầm.
    /// </summary>
    [Fact]
    public void SellOnCredit_IsAdminAndManagerOnly()
    {
        // Ma trận không liệt kê Admin (Admin luôn có toàn bộ danh mục).
        RolePermissionMatrix.RolesHolding(Permissions.Sales.SellOnCredit)
            .Should().BeEquivalentTo(new[] { Roles.Manager });

        foreach (var role in RolePermissionMatrix.RoleNames().Where(r => r != Roles.Admin && r != Roles.Manager))
        {
            RolePermissionMatrix.For(role).Should().NotContain(Permissions.Sales.SellOnCredit,
                $"role '{role}' không được bán công nợ theo quyết định D01-D12");
        }
    }

    // ---- Seed theo phiên bản ---------------------------------------------------

    [Fact]
    public void SeedingAnUpToDateRoleGrantsNothing()
    {
        RolePermissionMatrix.GrantsSince(Roles.Sale, RolePermissionMatrix.CurrentVersion)
            .Should().BeEmpty("role đã ở phiên bản mới nhất thì seeder không được cấp lại gì");
    }

    [Fact]
    public void SeedingAFreshRoleGrantsTheWholeSet()
    {
        RolePermissionMatrix.GrantsSince(Roles.Sale, 0)
            .Should().BeEquivalentTo(RolePermissionMatrix.For(Roles.Sale));
    }

    [Fact]
    public void SeedingALegacyRoleGrantsOnlyTheNewPermissions()
    {
        var sinceV1 = RolePermissionMatrix.GrantsSince(Roles.Sale, 1);

        sinceV1.Should().Contain(Permissions.Sales.Pos);
        sinceV1.Should().NotContain(Permissions.Sales.ViewAll, "ViewAll đã có từ v1 — cấp lại sẽ ghi đè việc admin gỡ tay");
        sinceV1.Count.Should().BeLessThan(RolePermissionMatrix.For(Roles.Sale).Count);
    }

    [Fact]
    public void LegacyRevocationsOnlyTargetManager()
    {
        RolePermissionMatrix.LegacyRevocations.Keys.Should().Equal(Roles.Manager);
        RolePermissionMatrix.For(Roles.Manager).Should().NotContain(new[]
        {
            Permissions.Users.Create, Permissions.Users.ManageRoles
        });
    }
}
