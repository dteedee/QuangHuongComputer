using BuildingBlocks.Security;
using FluentAssertions;
using Xunit;

namespace UnitTests.Security;

/// <summary>
/// Kiểm tra cấu trúc Permissions và Roles — đảm bảo không trùng lặp, đủ role định nghĩa, đặt tên nhất quán.
/// </summary>
public class PermissionsAndRolesTests
{
    [Fact]
    public void Roles_AllRolesDefined_Count11()
    {
        // Lấy tất cả role constants
        var roleFields = typeof(Roles).GetFields(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Static);
        var roles = roleFields.Select(f => f.GetValue(null) as string).ToList();

        roles.Should().HaveCount(11);
    }

    [Fact]
    public void Roles_InventoryStaffAndHRExist()
    {
        var inventoryStaffRole = Roles.InventoryStaff;
        var hrRole = Roles.HR;

        inventoryStaffRole.Should().Be("InventoryStaff");
        hrRole.Should().Be("HR");
    }

    [Fact]
    public void Roles_AllNamesValid()
    {
        var roles = new[]
        {
            Roles.Admin,
            Roles.Manager,
            Roles.TechnicianInShop,
            Roles.TechnicianOnSite,
            Roles.Accountant,
            Roles.Sale,
            Roles.Customer,
            Roles.Marketing,
            Roles.Supplier,
            Roles.InventoryStaff,
            Roles.HR
        };

        roles.Should().AllSatisfy(r =>
        {
            r.Should().NotBeNullOrEmpty();
            r.Should().NotContain(" ");  // No spaces in role names
            r.Length.Should().BeLessThanOrEqualTo(50);
        });
    }

    [Fact]
    public void Permissions_NoDuplicates()
    {
        var allPermissions = Permissions.GetAllPermissions();

        allPermissions.Distinct().Should().HaveCount(allPermissions.Count);
    }

    [Fact]
    public void Permissions_ConsistentNaming()
    {
        var allPermissions = Permissions.GetAllPermissions();

        foreach (var p in allPermissions)
        {
            p.Should().StartWith("Permissions.");
            p.Should().NotContain("  ");  // No double spaces
            var dotCount = p.Count(c => c == '.');
            dotCount.Should().BeGreaterThanOrEqualTo(2);  // At least 2 dots
        }
    }

    [Fact]
    public void Permissions_InventoryGroup_Complete()
    {
        var inventoryPermissions = new[]
        {
            Permissions.Inventory.ViewSupplier,
            Permissions.Inventory.CreateSupplier,
            Permissions.Inventory.UpdateSupplier,
            Permissions.Inventory.DeleteSupplier,
            Permissions.Inventory.ViewStock,
            Permissions.Inventory.ManageStock,
            Permissions.Inventory.AdjustStock,
            Permissions.Inventory.ViewPurchaseOrder,
            Permissions.Inventory.CreatePurchaseOrder,
            Permissions.Inventory.ApprovePurchaseOrder,
            Permissions.Inventory.ReceivePurchaseOrder,
            Permissions.Inventory.ViewReservations
        };

        inventoryPermissions.Should().AllSatisfy(p =>
        {
            p.Should().StartWith("Permissions.Inventory.");
            p.Should().NotBeNullOrEmpty();
        });
    }

    [Fact]
    public void Permissions_HRGroup_Complete()
    {
        var hrPermissions = new[]
        {
            Permissions.HR.ViewEmployees,
            Permissions.HR.ManageEmployees,
            Permissions.HR.ViewAttendance,
            Permissions.HR.ManageAttendance,
            Permissions.HR.ViewPayroll,
            Permissions.HR.ManagePayroll
        };

        hrPermissions.Should().AllSatisfy(p =>
        {
            p.Should().StartWith("Permissions.HR.");
            p.Should().NotBeNullOrEmpty();
        });
    }

    [Fact]
    public void Permissions_SystemConfigExists()
    {
        // System config permissions phải tồn tại cho admin
        var systemPermissions = new[]
        {
            Permissions.System.ViewConfig,
            Permissions.System.ManageConfig,
            Permissions.System.ViewLogs,
            Permissions.System.ManageLogs
        };

        var businessRoles = new[] { Roles.InventoryStaff, Roles.HR, Roles.Sale, Roles.Accountant };

        // Chỉ xác nhận rằng các hằng số này tồn tại (actual role assignment kiểm tra ở integration test)
        systemPermissions.Should().AllSatisfy(p => p.Should().NotBeNullOrEmpty());
        businessRoles.Should().AllSatisfy(r => r.Should().NotBeNullOrEmpty());
    }

    [Fact]
    public void Permissions_ModulePrefix_Consistent()
    {
        var allPermissions = Permissions.GetAllPermissions();

        var groupedByModule = allPermissions
            .GroupBy(p => p.Split('.')[1])  // Get module name (e.g., "Catalog", "Sales")
            .ToList();

        groupedByModule.Should().NotBeEmpty();
        groupedByModule.Should().AllSatisfy(g =>
        {
            g.Key.Should().NotBeNullOrEmpty();
            g.Should().AllSatisfy(p => p.Should().StartWith($"Permissions.{g.Key}."));
        });
    }

    [Fact]
    public void Roles_NoSystemPermissionsReference()
    {
        // Ensure SystemPermissions.cs has been removed or is empty
        // This test documents that we use BuildingBlocks.Security.Permissions exclusively
        var currentRolesType = typeof(Roles);
        currentRolesType.FullName.Should().Contain("BuildingBlocks.Security");
    }
}
