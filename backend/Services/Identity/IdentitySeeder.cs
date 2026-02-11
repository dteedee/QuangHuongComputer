using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Identity.Infrastructure;
using Identity.Services;
using BuildingBlocks.Security;

namespace Identity;

public static class IdentitySeeder
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        string[] roles = { 
            Roles.Admin, 
            Roles.Customer, 
            Roles.Sale, 
            Roles.TechnicianInShop, 
            Roles.TechnicianOnSite, 
            Roles.Accountant, 
            Roles.Manager, 
            Roles.Marketing,
            Roles.Supplier 
        };

        // Create roles if they don't exist
        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole(role));
            }
        }

        // Seed permissions for all roles
        await RolePermissionSeeder.SeedRolePermissionsAsync(roleManager);

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
            else
            {
                // Ensure password is correct for existing users (Dev/Test convenience)
                if (!await userManager.CheckPasswordAsync(user, password))
                {
                    Console.WriteLine($"[Seeder] Resetting password for {email}...");
                    var token = await userManager.GeneratePasswordResetTokenAsync(user);
                    var resetResult = await userManager.ResetPasswordAsync(user, token, password);
                    if (resetResult.Succeeded)
                    {
                        Console.WriteLine($"[Seeder] Password reset successfully for {email}");
                    }
                    else
                    {
                        Console.WriteLine($"[Seeder] Password reset FAILED for {email}: {string.Join(", ", resetResult.Errors.Select(e => e.Description))}");
                    }
                }
                else
                {
                     Console.WriteLine($"[Seeder] Password is already correct for {email}");
                }
            }
        }

        // Seed Users based on QUICK_START.md
        await CreateUser("admin@quanghuong.com", "Hệ thống Quản trị", Roles.Admin, "Admin@123");
        await CreateUser("customer@example.com", "Khách hàng Thân thiết", Roles.Customer, "Customer@123");
        await CreateUser("technician@quanghuong.com", "Kỹ thuật viên Quang Hưởng", Roles.TechnicianInShop, "Tech@123");
        await CreateUser("manager@quanghuong.com", "Quản lý Cửa hàng", Roles.Manager, "Manager@123");
        await CreateUser("sale@quanghuong.com", "Nhân viên Bán hàng", Roles.Sale, "Sale@123");
        await CreateUser("accountant@quanghuong.com", "Kế toán", Roles.Accountant, "Accountant@123");
        await CreateUser("marketing@quanghuong.com", "Marketing", Roles.Marketing, "Marketing@123");
    }
}
