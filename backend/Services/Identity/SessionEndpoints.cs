using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Identity.Infrastructure;
using Identity.Domain;
using System.Security.Claims;

namespace Identity;

public static class SessionEndpoints
{
    public static void MapSessionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/identity/sessions").RequireAuthorization();

        // List all active sessions for current user
        group.MapGet("/", async (ClaimsPrincipal user, IdentityDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            var sessions = await db.UserSessions
                .Where(s => s.UserId == userId && !s.IsRevoked)
                .OrderByDescending(s => s.LastActiveAt)
                .Select(s => new { s.Id, s.DeviceInfo, s.IpAddress, s.UserAgent, s.LastActiveAt, s.CreatedAt })
                .ToListAsync();
            return Results.Ok(sessions);
        });

        // Revoke a specific session by ID
        group.MapDelete("/{sessionId:guid}", async (Guid sessionId, ClaimsPrincipal user, IdentityDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            var session = await db.UserSessions.FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId);
            if (session == null) return Results.NotFound();
            session.IsRevoked = true;
            await db.SaveChangesAsync();
            return Results.Ok(new { revoked = true });
        });

        // Revoke all sessions except the one from the current IP
        group.MapDelete("/all-others", async (ClaimsPrincipal user, IdentityDbContext db, HttpContext ctx) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            var currentIp = ctx.Connection.RemoteIpAddress?.ToString() ?? "";
            var sessions = await db.UserSessions
                .Where(s => s.UserId == userId && !s.IsRevoked && s.IpAddress != currentIp)
                .ToListAsync();
            foreach (var s in sessions) s.IsRevoked = true;
            await db.SaveChangesAsync();
            return Results.Ok(new { revokedCount = sessions.Count });
        });
    }
}
