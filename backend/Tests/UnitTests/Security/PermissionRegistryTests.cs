using BuildingBlocks.Security;
using FluentAssertions;
using Xunit;

namespace UnitTests.Security;

/// <summary>
/// Danh mục quyền là NGUỒN SỰ THẬT DUY NHẤT: hằng số trong <see cref="Permissions"/>,
/// mô tả trong <see cref="PermissionRegistry"/>. Hai bên lệch nhau là màn hình phân
/// quyền của admin hiện checkbox chết — trước W1-1 có ~70 quyền lệch kiểu này.
/// </summary>
public class PermissionRegistryTests
{
    [Fact]
    public void RegistryDescribesExactlyTheCatalogue()
    {
        var catalogue = Permissions.GetAllPermissions().OrderBy(x => x, StringComparer.Ordinal).ToList();
        var registry = PermissionRegistry.GetAllKeys().OrderBy(x => x, StringComparer.Ordinal).ToList();

        registry.Except(catalogue).Should().BeEmpty("registry mô tả quyền không tồn tại trong Permissions.*");
        catalogue.Except(registry).Should().BeEmpty("hằng số quyền chưa có mô tả tiếng Việt trong registry");
    }

    [Fact]
    public void RegistryHasNoDuplicateKeys()
    {
        var keys = PermissionRegistry.GetAllKeys();
        keys.Should().OnlyHaveUniqueItems();
    }

    [Fact]
    public void EveryPermissionHasVietnameseMetadata()
    {
        PermissionRegistry.GetAll().Should().AllSatisfy(def =>
        {
            def.DisplayName.Should().NotBeNullOrWhiteSpace();
            def.ModuleDisplayName.Should().NotBeNullOrWhiteSpace();
            def.Description.Should().Contain(def.ModuleDisplayName);
            def.Module.Should().Be(Permissions.ModuleOf(def.Key));
        });
    }

    [Fact]
    public void EveryDependencyPointsAtARealPermission()
    {
        var keys = PermissionRegistry.GetAllKeys().ToHashSet(StringComparer.Ordinal);

        foreach (var def in PermissionRegistry.GetAll().Where(d => d.DependsOn != null))
        {
            keys.Should().Contain(def.DependsOn!, $"'{def.Key}' phụ thuộc quyền không tồn tại");
            def.DependsOn.Should().NotBe(def.Key, "quyền không thể phụ thuộc chính nó");
        }
    }

    [Fact]
    public void ValidatePermissions_DropsAChainWhoseRootIsMissing()
    {
        // SendCampaigns -> ManageCampaigns -> ViewCampaigns. Thiếu gốc thì rụng cả chuỗi.
        var validated = PermissionRegistry.ValidatePermissions(new List<string>
        {
            Permissions.CRM.SendCampaigns,
            Permissions.CRM.ManageCampaigns
        });

        validated.Should().BeEmpty();
    }

    [Fact]
    public void ValidatePermissions_KeepsACompleteChain()
    {
        var input = new List<string>
        {
            Permissions.CRM.ViewCampaigns,
            Permissions.CRM.ManageCampaigns,
            Permissions.CRM.SendCampaigns
        };

        PermissionRegistry.ValidatePermissions(input).Should().BeEquivalentTo(input);
    }

    [Fact]
    public void ExpandDependencies_AddsTheMissingParents()
    {
        var expanded = PermissionRegistry.ExpandDependencies(new[] { Permissions.CRM.SendCampaigns });

        expanded.Should().Contain(new[]
        {
            Permissions.CRM.SendCampaigns,
            Permissions.CRM.ManageCampaigns,
            Permissions.CRM.ViewCampaigns
        });
    }

    [Fact]
    public void DecisionUpdatePermissions_AreAllPresent()
    {
        // Danh sách bắt buộc lấy nguyên văn từ phase-10 mục "Decision updates (D01-D12)".
        Permissions.GetAllPermissions().Should().Contain(new[]
        {
            "Permissions.HR.ManageStatutoryParameters",
            "Permissions.Catalog.Import",
            "Permissions.Catalog.BulkPrice",
            "Permissions.Inventory.ImportOpening",
            "Permissions.Inventory.QuickReceive",
            "Permissions.Inventory.Approve",
            "Permissions.Sales.Quotations.View",
            "Permissions.Sales.Quotations.Create",
            "Permissions.Sales.Quotations.Edit",
            "Permissions.Sales.Quotations.Approve",
            "Permissions.Sales.SellOnCredit",
            "Permissions.Sales.TakeDeposit",
            "Permissions.Sales.ManageInstallments",
            "Permissions.Content.ManageContacts",
            "Permissions.Payments.View",
            "Permissions.Payments.Reconcile",
            "Permissions.Payments.Refund",
            "Permissions.Payments.CollectCod",
            "Permissions.Payments.Configure"
        });
    }

    [Fact]
    public void SellOnCreditIsRestrictedToAdminAndManager()
    {
        // "Decision updates (D01-D12, binding)" của phase-10: SellOnCredit mặc định CHỈ
        // Admin và Manager. Kế toán duyệt hạn mức bằng Accounting.ApproveCredit, không
        // được tự bán công nợ. Admin không nằm trong ma trận (luôn có toàn bộ quyền).
        var holders = RolePermissionMatrix.RolesHolding(Permissions.Sales.SellOnCredit);
        holders.Should().BeEquivalentTo(new[] { Roles.Manager });
    }

    [Fact]
    public void InfrastructureConstantsAreNotExposedAsPermissions()
    {
        var all = Permissions.GetAllPermissions();
        all.Should().NotContain(Permissions.PermissionType);
        all.Should().NotContain(Permissions.Prefix);
        all.Should().OnlyContain(p => p.Split('.').Length >= 3);
    }
}
