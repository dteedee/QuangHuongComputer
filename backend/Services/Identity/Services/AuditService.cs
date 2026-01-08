using System;
using System.Threading.Tasks;
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
            Details = details,
            Timestamp = DateTime.UtcNow
        };
        _context.AuditLogs.Add(log);
        await _context.SaveChangesAsync();
    }
}
