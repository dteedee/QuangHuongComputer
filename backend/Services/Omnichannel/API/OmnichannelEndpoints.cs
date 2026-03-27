using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Omnichannel.Infrastructure;
using Omnichannel.Domain;
using Microsoft.Extensions.DependencyInjection;

namespace Omnichannel.API;

public static class OmnichannelEndpoints
{
    public static void MapOmnichannelEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/omnichannel")
            .RequireAuthorization(policy => policy.RequireRole("Admin"));

        // Connections
        group.MapGet("/connections", async (OmnichannelDbContext db) =>
        {
            var connections = await db.ChannelConnections
                .AsNoTracking()
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();
            return Results.Ok(connections);
        });

        group.MapPost("/connections", async (CreateConnectionReq req, OmnichannelDbContext db) =>
        {
            // Usually requires OAuth dance, this is a simplified manual setup
            var conn = new ChannelConnection(
                platformName: req.PlatformName,
                shopId: req.ShopId,
                shopName: req.ShopName,
                accessToken: req.AccessToken,
                refreshToken: req.RefreshToken,
                tokenExpiresAt: req.TokenExpiresAt
            );

            db.ChannelConnections.Add(conn);
            await db.SaveChangesAsync();

            return Results.Created($"/api/omnichannel/connections/{conn.Id}", conn);
        });
        
        group.MapPut("/connections/{id:guid}/sync-settings", async (Guid id, UpdateSyncSettingsReq req, OmnichannelDbContext db) =>
        {
            var conn = await db.ChannelConnections.FindAsync(id);
            if (conn == null) return Results.NotFound();
            
            conn.UpdateSyncSettings(req.SyncOrders, req.SyncInventory, req.SyncProducts);
            await db.SaveChangesAsync();
            return Results.Ok(conn);
        });

        // Trigger manual sync
        group.MapPost("/connections/{id:guid}/sync-now", async (Guid id, string type, OmnichannelDbContext db) =>
        {
            var conn = await db.ChannelConnections.FindAsync(id);
            if (conn == null) return Results.NotFound();

            // In reality, this would dispatch a MediatR command or background job
            // representing Shopee/Lazada API calls
            return Results.Accepted(new { message = $"Sync job for {type} queued." });
        });

        // Mapping Overview
        group.MapGet("/products/mapping-status", async (OmnichannelDbContext db) =>
        {
            var totalMappings = await db.ChannelProducts.CountAsync();
            var failedMappings = await db.ChannelProducts.CountAsync(p => p.LastSyncError != null);
            
            return Results.Ok(new 
            {
                TotalMappedProducts = totalMappings,
                FailedSyncProducts = failedMappings
            });
        });
        
        group.MapGet("/orders/sync-status", async (OmnichannelDbContext db) =>
        {
            var totalOrders = await db.ChannelOrders.CountAsync();
            var unsyncedOrders = await db.ChannelOrders.CountAsync(o => !o.IsSyncedToSales);
            
            return Results.Ok(new 
            {
                TotalChannelOrders = totalOrders,
                PendingProcessing = unsyncedOrders
            });
        });
    }
}

public record CreateConnectionReq(string PlatformName, string ShopId, string ShopName, string AccessToken, string RefreshToken, DateTime TokenExpiresAt);
public record UpdateSyncSettingsReq(bool SyncOrders, bool SyncInventory, bool SyncProducts);
