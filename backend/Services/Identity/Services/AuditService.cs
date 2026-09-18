using System;
using System.Threading.Tasks;
using BuildingBlocks.Database;
using Identity.Infrastructure;

namespace Identity.Services;

public interface IAuditService
{
    Task LogAsync(string userId, string action, string entityName, string entityId, string details);
}

public class AuditService : IAuditService
{
    private readonly IdentityDbContext _context;

    public AuditService(IdentityDbContext context)
    {
        _context = context;
    }

    public async Task LogAsync(string userId, string action, string entityName, string entityId, string details)
    {
        var log = new AuditLog
        {
            UserId = userId,
            Action = action,
            EntityName = entityName,
            EntityId = entityId,
            // Second of the two AuditLog inserters - same last gate as AuditLogConsumer.
            Details = AuditSecretScrubber.ScrubDetails(details, entityName, entityId) ?? string.Empty,
            Timestamp = DateTime.UtcNow
        };
        _context.AuditLogs.Add(log);
        await _context.SaveChangesAsync();
    }
}
