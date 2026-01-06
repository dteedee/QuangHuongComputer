using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using SystemConfig.Infrastructure;
using SystemConfig.Domain;

namespace SystemConfig;

public static class SystemConfigEndpoints
{
    public static void MapSystemConfigEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/config").RequireAuthorization(policy => policy.RequireRole("Admin"));

        group.MapGet("/", async (SystemConfigDbContext db) =>
        {
            return await db.Configurations.ToListAsync();
        });

        group.MapGet("/{key}", async (string key, SystemConfigDbContext db) =>
        {
            var entry = await db.Configurations.FindAsync(key);
            return entry is not null ? Results.Ok(entry) : Results.NotFound();
        });

        group.MapPost("/", async (ConfigurationEntry entry, SystemConfigDbContext db) =>
        {
            entry.LastUpdated = DateTime.UtcNow;
            var existing = await db.Configurations.FindAsync(entry.Key);
            if (existing != null)
            {
                existing.Value = entry.Value;
                existing.Description = entry.Description;
                existing.Category = entry.Category;
                existing.LastUpdated = DateTime.UtcNow;
            }
            else
            {
                db.Configurations.Add(entry);
            }
            await db.SaveChangesAsync();
            return Results.Ok(entry);
        });
    }
}
