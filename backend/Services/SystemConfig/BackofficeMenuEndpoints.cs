using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using SystemConfig.Domain;
using SystemConfig.Infrastructure;

namespace SystemConfig;

public static class BackofficeMenuEndpoints
{
    public static IEndpointRouteBuilder MapBackofficeMenuEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/config");

        // Public: menu filtered by user roles (auth required)
        group.MapGet("/backoffice-menu", GetMenuForUser)
            .RequireAuthorization();

        // Admin group — all require Admin role
        var adminGroup = group.MapGroup("/admin/backoffice-menu")
            .RequireAuthorization(policy => policy.RequireRole("Admin"));

        adminGroup.MapGet("", GetAdminMenu);
        adminGroup.MapPost("/groups", CreateGroup);
        adminGroup.MapPut("/groups/{id:guid}", UpdateGroup);
        adminGroup.MapDelete("/groups/{id:guid}", DeleteGroup);
        adminGroup.MapPut("/groups/reorder", ReorderGroups);
        adminGroup.MapPost("/items", CreateItem);
        adminGroup.MapPut("/items/{id:guid}", UpdateItem);
        adminGroup.MapDelete("/items/{id:guid}", DeleteItem);
        adminGroup.MapPut("/items/reorder", ReorderItems);

        return app;
    }

    // ── Public endpoint ────────────────────────────────────────────────────────

    private static async Task<IResult> GetMenuForUser(
        HttpContext ctx,
        SystemConfigDbContext db)
    {
        var userRoles = ctx.User.Claims
            .Where(c => c.Type == ClaimTypes.Role)
            .Select(c => c.Value)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var groups = await db.BackofficeMenuGroups
            .AsNoTracking()
            .Where(g => g.IsActive)
            .Include(g => g.Items.Where(i => i.IsActive))
            .OrderBy(g => g.DisplayOrder)
            .ToListAsync();

        var result = groups
            .Select(g => new
            {
                g.Id,
                g.Title,
                g.IconName,
                g.ColorClass,
                g.DisplayOrder,
                Items = g.Items
                    .Where(i => i.AllowedRoles.Any(r => userRoles.Contains(r)))
                    .OrderBy(i => i.DisplayOrder)
                    .Select(i => new
                    {
                        i.Id,
                        i.Title,
                        i.Description,
                        i.IconName,
                        i.Path,
                        i.AllowedRoles,
                        i.DisplayOrder,
                        i.BadgeSource,
                        i.OpenInNewTab
                    })
            })
            .Where(g => g.Items.Any())
            .ToList();

        return Results.Ok(result);
    }

    // ── Admin endpoints ────────────────────────────────────────────────────────

    private static async Task<IResult> GetAdminMenu(SystemConfigDbContext db)
    {
        var groups = await db.BackofficeMenuGroups
            .AsNoTracking()
            .Include(g => g.Items.OrderBy(i => i.DisplayOrder))
            .OrderBy(g => g.DisplayOrder)
            .ToListAsync();

        var result = groups.Select(g => new
        {
            g.Id,
            g.Title,
            g.IconName,
            g.ColorClass,
            g.DisplayOrder,
            g.IsActive,
            g.CreatedAt,
            Items = g.Items.Select(i => new
            {
                i.Id,
                i.GroupId,
                i.Title,
                i.Description,
                i.IconName,
                i.Path,
                i.AllowedRoles,
                i.DisplayOrder,
                i.IsActive,
                i.BadgeSource,
                i.OpenInNewTab
            })
        });

        return Results.Ok(result);
    }

    private static async Task<IResult> CreateGroup(
        CreateMenuGroupRequest req,
        SystemConfigDbContext db)
    {
        var maxOrder = await db.BackofficeMenuGroups.MaxAsync(g => (int?)g.DisplayOrder) ?? -1;
        var group = new BackofficeMenuGroup
        {
            Title = req.Title,
            IconName = req.IconName,
            ColorClass = req.ColorClass,
            DisplayOrder = maxOrder + 1,
            IsActive = req.IsActive
        };
        db.BackofficeMenuGroups.Add(group);
        await db.SaveChangesAsync();
        return Results.Created($"/api/config/admin/backoffice-menu/groups/{group.Id}", group);
    }

    private static async Task<IResult> UpdateGroup(
        Guid id,
        UpdateMenuGroupRequest req,
        SystemConfigDbContext db)
    {
        var group = await db.BackofficeMenuGroups.FindAsync(id);
        if (group is null) return Results.NotFound();

        if (req.Title is not null) group.Title = req.Title;
        if (req.IconName is not null) group.IconName = req.IconName;
        if (req.ColorClass is not null) group.ColorClass = req.ColorClass;
        if (req.IsActive.HasValue) group.IsActive = req.IsActive.Value;
        group.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Results.Ok(group);
    }

    private static async Task<IResult> DeleteGroup(Guid id, SystemConfigDbContext db)
    {
        var group = await db.BackofficeMenuGroups.FindAsync(id);
        if (group is null) return Results.NotFound();

        db.BackofficeMenuGroups.Remove(group);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    private static async Task<IResult> ReorderGroups(
        List<ReorderRequest> items,
        SystemConfigDbContext db)
    {
        var ids = items.Select(i => i.Id).ToList();
        var groups = await db.BackofficeMenuGroups
            .Where(g => ids.Contains(g.Id))
            .ToListAsync();

        foreach (var g in groups)
        {
            var req = items.FirstOrDefault(i => i.Id == g.Id);
            if (req is not null) g.DisplayOrder = req.Order;
        }

        await db.SaveChangesAsync();
        return Results.Ok();
    }

    private static async Task<IResult> CreateItem(
        CreateMenuItemRequest req,
        SystemConfigDbContext db)
    {
        var groupExists = await db.BackofficeMenuGroups.AnyAsync(g => g.Id == req.GroupId);
        if (!groupExists) return Results.BadRequest("Group not found");

        var maxOrder = await db.BackofficeMenuItems
            .Where(i => i.GroupId == req.GroupId)
            .MaxAsync(i => (int?)i.DisplayOrder) ?? -1;

        var item = new BackofficeMenuItem
        {
            GroupId = req.GroupId,
            Title = req.Title,
            Description = req.Description,
            IconName = req.IconName,
            Path = req.Path,
            AllowedRoles = req.AllowedRoles ?? new List<string> { "Admin" },
            DisplayOrder = maxOrder + 1,
            IsActive = req.IsActive,
            BadgeSource = req.BadgeSource,
            OpenInNewTab = req.OpenInNewTab
        };
        db.BackofficeMenuItems.Add(item);
        await db.SaveChangesAsync();
        return Results.Created($"/api/config/admin/backoffice-menu/items/{item.Id}", item);
    }

    private static async Task<IResult> UpdateItem(
        Guid id,
        UpdateMenuItemRequest req,
        SystemConfigDbContext db)
    {
        var item = await db.BackofficeMenuItems.FindAsync(id);
        if (item is null) return Results.NotFound();

        if (req.Title is not null) item.Title = req.Title;
        if (req.Description is not null) item.Description = req.Description;
        if (req.IconName is not null) item.IconName = req.IconName;
        if (req.Path is not null) item.Path = req.Path;
        if (req.AllowedRoles is not null) item.AllowedRoles = req.AllowedRoles;
        if (req.IsActive.HasValue) item.IsActive = req.IsActive.Value;
        if (req.BadgeSource is not null) item.BadgeSource = req.BadgeSource;
        if (req.OpenInNewTab.HasValue) item.OpenInNewTab = req.OpenInNewTab.Value;
        item.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Results.Ok(item);
    }

    private static async Task<IResult> DeleteItem(Guid id, SystemConfigDbContext db)
    {
        var item = await db.BackofficeMenuItems.FindAsync(id);
        if (item is null) return Results.NotFound();

        db.BackofficeMenuItems.Remove(item);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    private static async Task<IResult> ReorderItems(
        List<ReorderRequest> items,
        SystemConfigDbContext db)
    {
        var ids = items.Select(i => i.Id).ToList();
        var menuItems = await db.BackofficeMenuItems
            .Where(i => ids.Contains(i.Id))
            .ToListAsync();

        foreach (var mi in menuItems)
        {
            var req = items.FirstOrDefault(i => i.Id == mi.Id);
            if (req is not null)
            {
                mi.DisplayOrder = req.Order;
                if (req.GroupId.HasValue) mi.GroupId = req.GroupId.Value;
            }
        }

        await db.SaveChangesAsync();
        return Results.Ok();
    }
}

// ── Request DTOs ───────────────────────────────────────────────────────────────

public record CreateMenuGroupRequest(
    string Title,
    string? IconName,
    string? ColorClass,
    bool IsActive = true);

public record UpdateMenuGroupRequest(
    string? Title,
    string? IconName,
    string? ColorClass,
    bool? IsActive);

public record CreateMenuItemRequest(
    Guid GroupId,
    string Title,
    string Path,
    string? Description,
    string? IconName,
    List<string>? AllowedRoles,
    bool IsActive = true,
    string? BadgeSource = null,
    bool OpenInNewTab = false);

public record UpdateMenuItemRequest(
    string? Title,
    string? Path,
    string? Description,
    string? IconName,
    List<string>? AllowedRoles,
    bool? IsActive,
    string? BadgeSource,
    bool? OpenInNewTab);

public record ReorderRequest(Guid Id, int Order, Guid? GroupId = null);
