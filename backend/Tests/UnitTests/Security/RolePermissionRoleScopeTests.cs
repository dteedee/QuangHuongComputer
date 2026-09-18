using BuildingBlocks.Security;
using FluentAssertions;
using Xunit;

namespace UnitTests.Security;

/// <summary>
/// Tiêu chí nghiệm thu "Success Criteria" của phase-10 W1-1: mỗi role nhân viên phải
/// thực sự làm được việc của mình, và không chạm được việc của người khác.
/// Đây là phần hợp đồng mà các track wave-2 dựa vào.
/// </summary>
public class RolePermissionRoleScopeTests
{

    [Fact]
    public void HrRole_OwnsTheHrModule()
    {
        var hr = RolePermissionMatrix.For(Roles.HR);

        hr.Should().Contain(new[]
        {
            Permissions.HR.ViewEmployees, Permissions.HR.ManageEmployees,
            Permissions.HR.ViewAttendance, Permissions.HR.ManageAttendance,
            Permissions.HR.ApproveLeave, Permissions.HR.ViewPayroll, Permissions.HR.ManagePayroll,
            Permissions.Reporting.ViewHR
        });

        // D06: HR chỉ ĐỌC tham số lương/thuế/bảo hiểm.
        hr.Should().NotContain(Permissions.HR.ManageStatutoryParameters);
    }

    [Fact]
    public void InventoryStaff_RunsTheWarehouseButCannotApproveOrTouchMoney()
    {
        var kho = RolePermissionMatrix.For(Roles.InventoryStaff);

        kho.Should().Contain(new[]
        {
            Permissions.Inventory.ViewStock, Permissions.Inventory.ManageStock,
            Permissions.Inventory.AdjustStock, Permissions.Inventory.ReceivePurchaseOrder,
            Permissions.Inventory.CreatePurchaseOrder, Permissions.Inventory.QuickReceive,
            Permissions.Reporting.ViewInventory
        });

        kho.Should().NotContain(Permissions.Inventory.ApprovePurchaseOrder);
        kho.Should().NotContain(p => Permissions.ModuleOf(p) == "Accounting");
    }

    [Fact]
    public void Accountant_GetsAccountingAndFinancialReports()
    {
        var ketoan = RolePermissionMatrix.For(Roles.Accountant);

        ketoan.Should().Contain(new[]
        {
            Permissions.Accounting.ViewInvoices, Permissions.Accounting.ManageInvoices,
            Permissions.Accounting.ManageDebt, Permissions.Accounting.Export,
            Permissions.Reporting.ViewFinancial, Permissions.Reporting.ExportReports,
            Permissions.Payments.View, Permissions.Payments.Reconcile,
            Permissions.HR.ManageStatutoryParameters   // D06
        });
    }

    [Fact]
    public void Marketing_GetsContentAndCrmCampaigns()
    {
        var mkt = RolePermissionMatrix.For(Roles.Marketing);

        mkt.Should().Contain(new[]
        {
            Permissions.Content.ManagePosts, Permissions.Content.ManageBanners,
            Permissions.Content.ManageCoupons, Permissions.Content.ManageMedia,
            Permissions.CRM.ViewCampaigns, Permissions.CRM.ManageCampaigns,
            Permissions.CRM.SendCampaigns, Permissions.CRM.ViewSegments,
            Permissions.Sales.ViewAll   // widget thống kê ở topbar back-office (IR W0 #56)
        });

        var forbiddenModules = new[] { "HR", "Accounting" };
        mkt.Should().NotContain(p => forbiddenModules.Contains(Permissions.ModuleOf(p)));
    }

    [Fact]
    public void Sale_GetsPosOrdersAndCrmLeads()
    {
        var sale = RolePermissionMatrix.For(Roles.Sale);

        sale.Should().Contain(new[]
        {
            Permissions.Sales.Pos, Permissions.Sales.ViewAll, Permissions.Sales.ManageAll,
            Permissions.Sales.UpdateStatus, Permissions.Sales.Quotations.Create,
            Permissions.CRM.ViewLeads, Permissions.CRM.ManageLeads,
            Permissions.Payments.CollectCod
        });

        // Không được tự huỷ đơn hay bán công nợ.
        sale.Should().NotContain(Permissions.Sales.CancelOrder);
        sale.Should().NotContain(Permissions.Sales.SellOnCredit);
    }
}
