using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Identity.Infrastructure;
using BuildingBlocks.Endpoints;
using System.Globalization;
using System.Text;

namespace Identity;

public static class AuditLogEndpoints
{
    public static void MapAuditLogEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/audit-logs")
            .RequireAuthorization(policy => policy.RequireRole("Admin"));

        // ==================== GET AUDIT LOGS (PAGED) ====================
        group.MapGet("/", async (
            int? page,
            int? pageSize,
            string? search,
            string? action,
            string? entityName,
            string? module,
            string? userId,
            string? dateFrom,
            string? dateTo,
            string? sortBy,
            bool? sortDescending,
            IdentityDbContext db) =>
        {
            var currentPage = page ?? 1;
            var currentPageSize = Math.Min(pageSize ?? 20, 100);

            var query = db.AuditLogs.AsNoTracking().AsQueryable();

            // Filter by action
            if (!string.IsNullOrWhiteSpace(action))
            {
                query = query.Where(a => a.Action == action);
            }

            // Filter by entity name
            if (!string.IsNullOrWhiteSpace(entityName))
            {
                query = query.Where(a => a.EntityName == entityName);
            }

            // Filter by module
            if (!string.IsNullOrWhiteSpace(module))
            {
                query = query.Where(a => a.Module == module);
            }

            // Filter by user
            if (!string.IsNullOrWhiteSpace(userId))
            {
                query = query.Where(a => a.UserId == userId);
            }

            // Filter by date range
            if (!string.IsNullOrWhiteSpace(dateFrom) && DateTime.TryParse(dateFrom, out var from))
            {
                query = query.Where(a => a.Timestamp >= from);
            }
            if (!string.IsNullOrWhiteSpace(dateTo) && DateTime.TryParse(dateTo, out var to))
            {
                query = query.Where(a => a.Timestamp <= to.AddDays(1));
            }

            // Search across multiple fields
            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(a =>
                    a.Details.ToLower().Contains(searchLower) ||
                    a.EntityName.ToLower().Contains(searchLower) ||
                    a.Action.ToLower().Contains(searchLower) ||
                    (a.UserName != null && a.UserName.ToLower().Contains(searchLower)) ||
                    a.EntityId.ToLower().Contains(searchLower));
            }

            // Get total count
            var total = await query.CountAsync();

            // Sorting
            var isDesc = sortDescending ?? true;
            query = sortBy?.ToLower() switch
            {
                "action" => isDesc ? query.OrderByDescending(a => a.Action) : query.OrderBy(a => a.Action),
                "entityname" => isDesc ? query.OrderByDescending(a => a.EntityName) : query.OrderBy(a => a.EntityName),
                "module" => isDesc ? query.OrderByDescending(a => a.Module) : query.OrderBy(a => a.Module),
                "userid" => isDesc ? query.OrderByDescending(a => a.UserId) : query.OrderBy(a => a.UserId),
                _ => isDesc ? query.OrderByDescending(a => a.Timestamp) : query.OrderBy(a => a.Timestamp)
            };

            // Pagination
            var items = await query
                .Skip((currentPage - 1) * currentPageSize)
                .Take(currentPageSize)
                .ToListAsync();

            var totalPages = (int)Math.Ceiling((double)total / currentPageSize);

            return Results.Ok(new
            {
                items,
                total,
                page = currentPage,
                pageSize = currentPageSize,
                totalPages,
                hasPreviousPage = currentPage > 1,
                hasNextPage = currentPage < totalPages
            });
        }).WithName("GetAuditLogs");

        // ==================== GET AUDIT LOG DETAIL ====================
        group.MapGet("/{id:guid}", async (Guid id, IdentityDbContext db) =>
        {
            var log = await db.AuditLogs.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id);
            if (log == null) return Results.NotFound();
            return Results.Ok(log);
        }).WithName("GetAuditLogDetail");

        // ==================== GET AUDIT LOG STATS ====================
        group.MapGet("/stats", async (IdentityDbContext db) =>
        {
            var now = DateTime.UtcNow;
            var today = now.Date;
            var thisWeek = today.AddDays(-(int)today.DayOfWeek);
            var thisMonth = new DateTime(now.Year, now.Month, 1);

            var totalLogs = await db.AuditLogs.CountAsync();
            var todayLogs = await db.AuditLogs.CountAsync(a => a.Timestamp >= today);
            var weekLogs = await db.AuditLogs.CountAsync(a => a.Timestamp >= thisWeek);
            var monthLogs = await db.AuditLogs.CountAsync(a => a.Timestamp >= thisMonth);

            // Action breakdown
            var actionStats = await db.AuditLogs
                .GroupBy(a => a.Action)
                .Select(g => new { Action = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(10)
                .ToListAsync();

            // Module breakdown
            var moduleStats = await db.AuditLogs
                .Where(a => a.Module != null)
                .GroupBy(a => a.Module)
                .Select(g => new { Module = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(10)
                .ToListAsync();

            // Entity breakdown
            var entityStats = await db.AuditLogs
                .GroupBy(a => a.EntityName)
                .Select(g => new { Entity = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(10)
                .ToListAsync();

            // Top active users
            var userStats = await db.AuditLogs
                .GroupBy(a => new { a.UserId, a.UserName })
                .Select(g => new { 
                    UserId = g.Key.UserId, 
                    UserName = g.Key.UserName ?? g.Key.UserId, 
                    Count = g.Count() 
                })
                .OrderByDescending(x => x.Count)
                .Take(10)
                .ToListAsync();

            // Daily activity for the last 30 days
            var thirtyDaysAgo = today.AddDays(-30);
            var dailyActivity = await db.AuditLogs
                .Where(a => a.Timestamp >= thirtyDaysAgo)
                .GroupBy(a => a.Timestamp.Date)
                .Select(g => new { Date = g.Key, Count = g.Count() })
                .OrderBy(x => x.Date)
                .ToListAsync();

            return Results.Ok(new
            {
                totalLogs,
                todayLogs,
                weekLogs,
                monthLogs,
                actionStats,
                moduleStats,
                entityStats,
                userStats,
                dailyActivity
            });
        }).WithName("GetAuditLogStats");

        // ==================== GET DISTINCT FILTER VALUES ====================
        group.MapGet("/filters", async (IdentityDbContext db) =>
        {
            var actions = await db.AuditLogs
                .Select(a => a.Action)
                .Distinct()
                .OrderBy(x => x)
                .ToListAsync();

            var entityNames = await db.AuditLogs
                .Select(a => a.EntityName)
                .Distinct()
                .OrderBy(x => x)
                .ToListAsync();

            var modules = await db.AuditLogs
                .Where(a => a.Module != null)
                .Select(a => a.Module!)
                .Distinct()
                .OrderBy(x => x)
                .ToListAsync();

            return Results.Ok(new { actions, entityNames, modules });
        }).WithName("GetAuditLogFilters");

        // ==================== EXPORT AUDIT LOGS AS CSV ====================
        group.MapGet("/export", async (
            string? action,
            string? entityName,
            string? module,
            string? userId,
            string? dateFrom,
            string? dateTo,
            IdentityDbContext db) =>
        {
            var query = db.AuditLogs.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(action))
                query = query.Where(a => a.Action == action);
            if (!string.IsNullOrWhiteSpace(entityName))
                query = query.Where(a => a.EntityName == entityName);
            if (!string.IsNullOrWhiteSpace(module))
                query = query.Where(a => a.Module == module);
            if (!string.IsNullOrWhiteSpace(userId))
                query = query.Where(a => a.UserId == userId);
            if (!string.IsNullOrWhiteSpace(dateFrom) && DateTime.TryParse(dateFrom, out var from))
                query = query.Where(a => a.Timestamp >= from);
            if (!string.IsNullOrWhiteSpace(dateTo) && DateTime.TryParse(dateTo, out var to))
                query = query.Where(a => a.Timestamp <= to.AddDays(1));

            var logs = await query
                .OrderByDescending(a => a.Timestamp)
                .Take(10000) // Limit export to 10,000 records
                .ToListAsync();

            var csv = new StringBuilder();
            csv.AppendLine("Thời gian,Người dùng,Hành động,Module,Đối tượng,ID đối tượng,Chi tiết,IP,Đường dẫn,Phương thức");

            foreach (var log in logs)
            {
                csv.AppendLine(string.Join(",",
                    $"\"{log.Timestamp:yyyy-MM-dd HH:mm:ss}\"",
                    $"\"{log.UserName ?? log.UserId}\"",
                    $"\"{log.Action}\"",
                    $"\"{log.Module ?? ""}\"",
                    $"\"{log.EntityName}\"",
                    $"\"{log.EntityId}\"",
                    $"\"{log.Details?.Replace("\"", "'") ?? ""}\"",
                    $"\"{log.IpAddress ?? ""}\"",
                    $"\"{log.RequestPath ?? ""}\"",
                    $"\"{log.RequestMethod ?? ""}\""
                ));
            }

            var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(csv.ToString())).ToArray();
            return Results.File(bytes, "text/csv", $"audit-logs-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv");
        }).WithName("ExportAuditLogs");

        // ==================== DELETE OLD AUDIT LOGS ====================
        group.MapDelete("/cleanup", async (int? daysToKeep, IdentityDbContext db, HttpContext httpContext) =>
        {
            var keepDays = daysToKeep ?? 90; // Default: keep 90 days
            var cutoffDate = DateTime.UtcNow.AddDays(-keepDays);

            var deletedCount = await db.AuditLogs
                .Where(a => a.Timestamp < cutoffDate)
                .ExecuteDeleteAsync();

            await httpContext.LogAuditAsync("Cleanup", "AuditLog", "system",
                $"Deleted {deletedCount} audit logs older than {keepDays} days",
                module: "System");

            return Results.Ok(new { deletedCount, cutoffDate, daysKept = keepDays });
        }).WithName("CleanupAuditLogs");
    }
}
