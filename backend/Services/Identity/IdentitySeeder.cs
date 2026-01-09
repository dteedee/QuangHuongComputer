using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Identity.Infrastructure;
using Identity.Permissions;
using System.Security.Claims;

namespace Identity;

public static class IdentitySeeder
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        string[] roles = { "Admin", "Customer", "Sale", "TechnicianInShop", "TechnicianOnSite", "Accountant", "Manager", "Supplier" };

        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole(role));
            }
        }

        // Helper to seed users
        async Task CreateUser(string email, string name, string role, string password = "Password@123")
        {
            var user = await userManager.FindByEmailAsync(email);
            if (user == null)
            {
                user = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    FullName = name,
                    EmailConfirmed = true
                };
                var result = await userManager.CreateAsync(user, password);
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(user, role);
                }
            }
        }

        // Seed Users based on QUICK_START.md
        await CreateUser("admin@quanghuong.com", "Hệ thống Quản trị", "Admin", "Admin@123");
        await CreateUser("customer@example.com", "Khách hàng Thân thiết", "Customer", "Customer@123");
        await CreateUser("technician@quanghuong.com", "Kỹ thuật viên Quang Hưởng", "TechnicianInShop", "Tech@123");
        await CreateUser("manager@quanghuong.com", "Quản lý Cửa hàng", "Manager", "Manager@123");
        await CreateUser("sale@quanghuong.com", "Nhân viên Bán hàng", "Sale", "Sale@123");

        // Assign all permissions to Admin role
        var adminRole = await roleManager.FindByNameAsync("Admin");
        if (adminRole != null)
        {
            var allPermissions = SystemPermissions.GetAllPermissions();
            var currentClaims = await roleManager.GetClaimsAsync(adminRole);
            foreach (var permission in allPermissions)
            {
                if (!currentClaims.Any(c => c.Type == SystemPermissions.PermissionType && c.Value == permission))
                {
                    await roleManager.AddClaimAsync(adminRole, new Claim(SystemPermissions.PermissionType, permission));
                }
            }
        }
    }
}
