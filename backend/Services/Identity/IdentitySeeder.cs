using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Identity.Infrastructure;
using Identity.Services;
using BuildingBlocks.Security;

namespace Identity;

/// <summary>
/// Startup seeding, split into two clearly separated concerns:
///
///   * <see cref="SeedReferenceAsync"/> - the ROLES and their permission claims.
///     Part of the application's authorization model, runs in every environment,
///     and is strictly ADDITIVE: it creates what is missing and never removes an
///     administrator's edits.
///
///   * <see cref="SeedDemoUsersAsync"/> - the documented demo accounts. DEVELOPMENT
///     ONLY, and it no longer force-resets the password of an account that already
///     exists (the old code reset every seeded user's password on every boot, which
///     silently undid any password an operator had set).
/// </summary>
public static class IdentitySeeder
{
    /// <summary>The demo accounts from QUICK_START.md. Development only.</summary>
    private static readonly (string Email, string Name, string Role, string Password)[] DemoUsers =
    {
        ("admin@quanghuong.com",      "Hệ thống Quản trị",         Roles.Admin,            "Admin@123"),
        ("customer@example.com",      "Khách hàng Thân thiết",     Roles.Customer,         "Customer@123"),
        ("technician@quanghuong.com", "Kỹ thuật viên Quang Hưởng", Roles.TechnicianInShop, "Tech@123"),
        ("manager@quanghuong.com",    "Quản lý Cửa hàng",          Roles.Manager,          "Manager@123"),
        ("sale@quanghuong.com",       "Nhân viên Bán hàng",        Roles.Sale,             "Sale@123"),
        ("accountant@quanghuong.com", "Kế toán",                   Roles.Accountant,       "Accountant@123"),
        ("marketing@quanghuong.com",  "Marketing",                 Roles.Marketing,        "Marketing@123"),
        ("kho@quanghuong.com",        "Nhân viên Kho",             Roles.InventoryStaff,   "Kho@123"),
        ("hr@quanghuong.com",         "Nhân sự",                   Roles.HR,               "Hr@123")
    };

    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        var env = serviceProvider.GetService<IHostEnvironment>();
        var logger = serviceProvider.GetService<ILoggerFactory>()?.CreateLogger("Identity.Seeder");
        var isDevelopment = env?.IsDevelopment() ?? false;

        await SeedReferenceAsync(serviceProvider, logger);
        await SeedDemoUsersAsync(serviceProvider, isDevelopment, logger);
    }

    /// <summary>
    /// Roles + role permission claims. Additive only - never deletes a role and
    /// never removes a claim, so an administrator's changes survive a restart.
    /// </summary>
    public static async Task SeedReferenceAsync(IServiceProvider serviceProvider, ILogger? logger = null)
    {
        var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();

        foreach (var role in SystemRoleGuard.SystemRoles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                var result = await roleManager.CreateAsync(new IdentityRole(role));
                if (result.Succeeded)
                    logger?.LogWarning("[Seeder] Created missing system role {Role}", role);
                else
                    logger?.LogError("[Seeder] Could not create system role {Role}: {Errors}",
                        role, string.Join(", ", result.Errors.Select(e => e.Description)));
            }
        }

        // AssignPermissionsToRole only adds claims a role does not already have.
        await RolePermissionSeeder.SeedRolePermissionsAsync(roleManager);
    }

    /// <summary>
    /// Demo accounts. Creates what is missing; for an account that already exists
    /// it leaves the password alone.
    /// </summary>
    public static async Task SeedDemoUsersAsync(IServiceProvider serviceProvider, bool isDevelopment, ILogger? logger = null)
    {
        var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        if (!isDevelopment)
        {
            // Production must never grow accounts by itself. Still check the one
            // invariant that, when it broke, locked everyone out of the system.
            await AssertAdminMembershipAsync(userManager, logger);
            return;
        }

        foreach (var (email, name, role, password) in DemoUsers)
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
                if (!result.Succeeded)
                {
                    logger?.LogError("[Seeder] Could not create demo user {Email}: {Errors}",
                        email, string.Join(", ", result.Errors.Select(e => e.Description)));
                    continue;
                }
                await userManager.AddToRoleAsync(user, role);
                continue;
            }

            // The account exists. Do NOT touch its password - the old seeder reset
            // it on every boot, which is both a surprise for the operator and a
            // back door if the documented password is ever left in a real database.
            await EnsureRoleMembershipAsync(userManager, user, role, logger);
        }

        await AssertAdminMembershipAsync(userManager, logger);
    }

    /// <summary>
    /// Development self-heal: an existing seeded account whose role membership is
    /// missing gets it back. This is what the Admin-role deletion destroyed - the
    /// cascade removed the AspNetUserRoles rows, and nothing put them back.
    /// </summary>
    private static async Task EnsureRoleMembershipAsync(
        UserManager<ApplicationUser> userManager, ApplicationUser user, string role, ILogger? logger)
    {
        if (await userManager.IsInRoleAsync(user, role)) return;

        var result = await userManager.AddToRoleAsync(user, role);
        if (result.Succeeded)
            logger?.LogWarning("[Seeder] Re-attached seeded account {Email} to role {Role} (membership was missing)", user.Email, role);
        else
            logger?.LogError("[Seeder] Could not re-attach {Email} to {Role}: {Errors}",
                user.Email, role, string.Join(", ", result.Errors.Select(e => e.Description)));
    }

    /// <summary>
    /// "Is there still at least one active Admin?" In Production a missing
    /// membership is an ALERT, never a silent self-heal: an account that
    /// re-grants itself Admin on every boot is a back door, and the operator
    /// needs to know a privilege disappeared rather than have it restored
    /// behind their back.
    /// </summary>
    private static async Task AssertAdminMembershipAsync(UserManager<ApplicationUser> userManager, ILogger? logger)
    {
        try
        {
            var adminIds = await SystemRoleGuard.GetActiveAdminIdsAsync(userManager);
            if (adminIds.Count == 0)
            {
                logger?.LogCritical(
                    "[Seeder] NO ACTIVE ACCOUNT HOLDS THE '{Role}' ROLE. Nobody can administer this system. " +
                    "Grant it manually: INSERT INTO \"AspNetUserRoles\" (\"UserId\",\"RoleId\") " +
                    "SELECT u.\"Id\", r.\"Id\" FROM \"AspNetUsers\" u, \"AspNetRoles\" r " +
                    "WHERE u.\"Email\"='<admin email>' AND r.\"Name\"='{Role}';", Roles.Admin, Roles.Admin);
            }
            else
            {
                logger?.LogInformation("[Seeder] {Count} active account(s) hold the {Role} role.", adminIds.Count, Roles.Admin);
            }
        }
        catch (Exception ex)
        {
            logger?.LogError(ex, "[Seeder] Could not verify {Role} membership", Roles.Admin);
        }
    }
}
