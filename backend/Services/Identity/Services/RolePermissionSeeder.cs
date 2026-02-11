using Microsoft.AspNetCore.Identity;
using System.Security.Claims;
using BuildingBlocks.Security;
using Perms = BuildingBlocks.Security.Permissions;

namespace Identity.Services;

public static class RolePermissionSeeder
{
    public static async Task SeedRolePermissionsAsync(RoleManager<IdentityRole> roleManager)
    {
        // Admin - Full access to everything
        await AssignPermissionsToRole(roleManager, Roles.Admin, Perms.GetAllPermissions());

        // Manager - Can manage most things except system config
        await AssignPermissionsToRole(roleManager, Roles.Manager, new[]
        {
            // Catalog
            Perms.Catalog.View,
            Perms.Catalog.Create,
            Perms.Catalog.Edit,
            Perms.Catalog.Delete,
            Perms.Catalog.Manage,
            
            // Sales
            Perms.Sales.ViewAll,
            Perms.Sales.ManageAll,
            Perms.Sales.UpdateStatus,
            Perms.Sales.CancelOrder,
            Perms.Sales.ViewReturns,
            Perms.Sales.ManageReturns,
            
            // Repair
            Perms.Repair.ViewAll,
            Perms.Repair.UpdateStatus,
            Perms.Repair.AssignTechnician,
            Perms.Repair.CreateQuote,
            Perms.Repair.ApproveQuote,
            Perms.Repair.Complete,
            
            // Inventory
            Perms.Inventory.ViewSupplier,
            Perms.Inventory.CreateSupplier,
            Perms.Inventory.UpdateSupplier,
            Perms.Inventory.DeleteSupplier,
            Perms.Inventory.ViewStock,
            Perms.Inventory.ManageStock,
            Perms.Inventory.AdjustStock,
            Perms.Inventory.ViewPurchaseOrder,
            Perms.Inventory.CreatePurchaseOrder,
            Perms.Inventory.ApprovePurchaseOrder,
            Perms.Inventory.ReceivePurchaseOrder,
            Perms.Inventory.ViewReservations,
            
            // Accounting
            Perms.Accounting.ViewInvoices,
            Perms.Accounting.CreateInvoice,
            Perms.Accounting.EditInvoice,
            Perms.Accounting.ViewReports,
            Perms.Accounting.ManageDebt,
            
            // Warranty
            Perms.Warranty.ViewAll,
            Perms.Warranty.ReviewClaim,
            Perms.Warranty.ApproveClaim,
            
            // Content
            Perms.Content.ViewPages,
            Perms.Content.ManagePages,
            Perms.Content.ViewPosts,
            Perms.Content.ManagePosts,
            Perms.Content.ViewCoupons,
            Perms.Content.ManageCoupons,
            Perms.Content.ViewBanners,
            Perms.Content.ManageBanners,
            Perms.Content.ManageMedia,
            
            // Users & Roles
            Perms.Users.View,
            Perms.Users.Create,
            Perms.Users.Edit,
            Perms.Users.ManageRoles,
            
            // Reporting
            Perms.Reporting.ViewSales,
            Perms.Reporting.ViewInventory,
            Perms.Reporting.ViewFinancial,
            Perms.Reporting.ViewRepair,
            Perms.Reporting.ExportReports,
            
            // HR
            Perms.HR.ViewEmployees,
            Perms.HR.ManageEmployees,
            Perms.HR.ViewAttendance,
            Perms.HR.ManageAttendance,
            Perms.HR.ViewPayroll,
            Perms.HR.ManagePayroll,
            
            // System
            Perms.System.ViewConfig,
        });

        // Sale - Sales and customer management
        await AssignPermissionsToRole(roleManager, Roles.Sale, new[]
        {
            // Catalog
            Perms.Catalog.View,
            
            // Sales
            Perms.Sales.ViewAll,
            Perms.Sales.Checkout,
            Perms.Sales.UpdateStatus,
            Perms.Sales.ViewReturns,
            
            // Inventory
            Perms.Inventory.ViewStock,
            
            // Repair
            Perms.Repair.Book,
            Perms.Repair.ViewAll,
            
            // Warranty
            Perms.Warranty.SubmitClaim,
            Perms.Warranty.ViewAll,
            
            // Content
            Perms.Content.ViewPages,
            Perms.Content.ViewPosts,
            Perms.Content.ViewCoupons,
            
            // Reporting
            Perms.Reporting.ViewSales,
        });

        // TechnicianInShop - Repair work in shop
        await AssignPermissionsToRole(roleManager, Roles.TechnicianInShop, new[]
        {
            // Catalog
            Perms.Catalog.View,
            
            // Repair
            Perms.Repair.ViewOwn,
            Perms.Repair.ViewAll,
            Perms.Repair.UpdateStatus,
            Perms.Repair.CreateQuote,
            Perms.Repair.Complete,
            
            // Inventory
            Perms.Inventory.ViewStock,
            Perms.Inventory.ViewReservations,
            
            // Warranty
            Perms.Warranty.ViewAll,
            Perms.Warranty.ReviewClaim,
            
            // Reporting
            Perms.Reporting.ViewRepair,
        });

        // TechnicianOnSite - Repair work on-site
        await AssignPermissionsToRole(roleManager, Roles.TechnicianOnSite, new[]
        {
            // Catalog
            Perms.Catalog.View,
            
            // Repair
            Perms.Repair.ViewOwn,
            Perms.Repair.UpdateStatus,
            Perms.Repair.CreateQuote,
            Perms.Repair.Complete,
            
            // Inventory
            Perms.Inventory.ViewStock,
            
            // Warranty
            Perms.Warranty.ViewOwn,
            Perms.Warranty.ReviewClaim,
        });

        // Accountant - Financial management
        await AssignPermissionsToRole(roleManager, Roles.Accountant, new[]
        {
            // Sales
            Perms.Sales.ViewAll,
            
            // Accounting
            Perms.Accounting.ViewInvoices,
            Perms.Accounting.CreateInvoice,
            Perms.Accounting.EditInvoice,
            Perms.Accounting.DeleteInvoice,
            Perms.Accounting.ApproveCredit,
            Perms.Accounting.ViewReports,
            Perms.Accounting.ManageDebt,
            
            // Inventory
            Perms.Inventory.ViewStock,
            Perms.Inventory.ViewPurchaseOrder,
            Perms.Inventory.ViewSupplier,
            
            // Reporting
            Perms.Reporting.ViewSales,
            Perms.Reporting.ViewInventory,
            Perms.Reporting.ViewFinancial,
            Perms.Reporting.ExportReports,
            
            // HR
            Perms.HR.ViewEmployees,
            Perms.HR.ViewPayroll,
            Perms.HR.ManagePayroll,
        });

        // Marketing - Content and promotions
        await AssignPermissionsToRole(roleManager, Roles.Marketing, new[]
        {
            // Catalog
            Perms.Catalog.View,
            
            // Content
            Perms.Content.ViewPages,
            Perms.Content.ManagePages,
            Perms.Content.ViewPosts,
            Perms.Content.ManagePosts,
            Perms.Content.ViewCoupons,
            Perms.Content.ManageCoupons,
            Perms.Content.ViewBanners,
            Perms.Content.ManageBanners,
            Perms.Content.ManageMedia,
            
            // Sales
            Perms.Sales.ViewAll,
            
            // Reporting
            Perms.Reporting.ViewSales,
        });

        // Customer - Basic customer permissions
        await AssignPermissionsToRole(roleManager, Roles.Customer, new[]
        {
            // Catalog
            Perms.Catalog.View,
            
            // Sales
            Perms.Sales.ViewOwn,
            Perms.Sales.Checkout,
            
            // Repair
            Perms.Repair.Book,
            Perms.Repair.ViewOwn,
            
            // Warranty
            Perms.Warranty.SubmitClaim,
            Perms.Warranty.ViewOwn,
            
            // Content
            Perms.Content.ViewPages,
            Perms.Content.ViewPosts,
        });

        // Supplier - Limited access for suppliers
        await AssignPermissionsToRole(roleManager, Roles.Supplier, new[]
        {
            // Inventory
            Perms.Inventory.ViewPurchaseOrder,
            
            // Catalog
            Perms.Catalog.View,
        });
    }

    private static async Task AssignPermissionsToRole(
        RoleManager<IdentityRole> roleManager,
        string roleName,
        IEnumerable<string> permissions)
    {
        var role = await roleManager.FindByNameAsync(roleName);
        if (role == null) return;

        var currentClaims = await roleManager.GetClaimsAsync(role);
        
        foreach (var permission in permissions)
        {
            if (!currentClaims.Any(c => c.Type == Perms.PermissionType && c.Value == permission))
            {
                await roleManager.AddClaimAsync(role, new Claim(Perms.PermissionType, permission));
            }
        }
    }
}
