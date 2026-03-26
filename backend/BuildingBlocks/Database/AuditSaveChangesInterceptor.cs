using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using MassTransit;
using BuildingBlocks.Messaging.IntegrationEvents;
using BuildingBlocks.SharedKernel;
using System.Security.Claims;
using System.Text.Json;

namespace BuildingBlocks.Database;

/// <summary>
/// EF Core SaveChanges Interceptor that automatically publishes audit events
/// for all entity changes (Add, Update, Delete) across all DbContexts.
/// This ensures comprehensive audit trail without manual LogAuditAsync calls.
/// </summary>
public class AuditSaveChangesInterceptor : SaveChangesInterceptor
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private List<AuditEntry> _pendingAuditEntries = new();

    // Entity types to skip auditing (internal EF/Identity tables)
    private static readonly HashSet<string> SkipEntityTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "AuditLog",
        "IdentityRole",
        "IdentityUserRole`1",
        "IdentityRoleClaim`1",
        "IdentityUserClaim`1",
        "IdentityUserLogin`1",
        "IdentityUserToken`1",
        "__EFMigrationsHistory",
        "RefreshToken",
        "PasswordResetToken"
    };

    public AuditSaveChangesInterceptor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        if (eventData.Context != null)
        {
            CaptureChanges(eventData.Context);
        }
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        if (eventData.Context != null)
        {
            CaptureChanges(eventData.Context);
        }
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    public override int SavedChanges(SaveChangesCompletedEventData eventData, int result)
    {
        _ = PublishAuditEventsAsync();
        return base.SavedChanges(eventData, result);
    }

    public override async ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData,
        int result,
        CancellationToken cancellationToken = default)
    {
        await PublishAuditEventsAsync();
        return await base.SavedChangesAsync(eventData, result, cancellationToken);
    }

    private void CaptureChanges(DbContext context)
    {
        _pendingAuditEntries.Clear();

        var entries = context.ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Added ||
                       e.State == EntityState.Modified ||
                       e.State == EntityState.Deleted)
            .ToList();

        // Determine module from the DbContext type name
        var contextName = context.GetType().Name;
        var module = contextName.Replace("DbContext", "");

        foreach (var entry in entries)
        {
            var entityTypeName = entry.Metadata.ClrType.Name;

            // Skip internal entity types
            if (SkipEntityTypes.Contains(entityTypeName))
                continue;

            // Skip if entity type contains generic markers
            if (entityTypeName.Contains('`'))
                continue;

            var auditEntry = new AuditEntry
            {
                EntityName = entityTypeName,
                Module = module,
                Action = entry.State switch
                {
                    EntityState.Added => "Create",
                    EntityState.Modified => "Update",
                    EntityState.Deleted => "Delete",
                    _ => "Unknown"
                }
            };

            // Get entity ID
            auditEntry.EntityId = GetEntityId(entry);

            // Get old/new values
            switch (entry.State)
            {
                case EntityState.Added:
                    auditEntry.NewValues = GetPropertyValues(entry, EntityState.Added);
                    auditEntry.Details = $"Created {entityTypeName}";
                    break;

                case EntityState.Modified:
                    var (oldValues, newValues, changedProps) = GetModifiedValues(entry);
                    auditEntry.OldValues = oldValues;
                    auditEntry.NewValues = newValues;
                    auditEntry.Details = $"Updated {entityTypeName}: {string.Join(", ", changedProps)}";
                    break;

                case EntityState.Deleted:
                    auditEntry.OldValues = GetPropertyValues(entry, EntityState.Deleted);
                    auditEntry.Details = $"Deleted {entityTypeName}";
                    break;
            }

            _pendingAuditEntries.Add(auditEntry);
        }
    }

    private async Task PublishAuditEventsAsync()
    {
        if (_pendingAuditEntries.Count == 0) return;

        try
        {
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext == null) return;

            var publishEndpoint = httpContext.RequestServices.GetService<IPublishEndpoint>();
            if (publishEndpoint == null) return;

            var userId = httpContext.User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
            var userName = httpContext.User?.FindFirstValue(ClaimTypes.Name)
                ?? httpContext.User?.FindFirstValue("FullName")
                ?? httpContext.User?.FindFirstValue(ClaimTypes.Email)
                ?? "system";
            var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = httpContext.Request.Headers["User-Agent"].ToString();

            foreach (var entry in _pendingAuditEntries)
            {
                await publishEndpoint.Publish(new AuditLogIntegrationEvent(
                    UserId: userId,
                    Action: entry.Action,
                    EntityName: entry.EntityName,
                    EntityId: entry.EntityId,
                    Details: entry.Details,
                    Module: entry.Module,
                    UserName: userName,
                    OldValues: entry.OldValues,
                    NewValues: entry.NewValues,
                    IpAddress: ipAddress,
                    UserAgent: userAgent,
                    RequestPath: httpContext.Request.Path,
                    RequestMethod: httpContext.Request.Method
                ));
            }
        }
        catch (Exception)
        {
            // Silently ignore audit failures to not affect the main operation
        }
        finally
        {
            _pendingAuditEntries.Clear();
        }
    }

    private static string GetEntityId(EntityEntry entry)
    {
        // Try to get Id from primary key
        var keyProperties = entry.Properties
            .Where(p => p.Metadata.IsPrimaryKey())
            .ToList();

        if (keyProperties.Count == 1)
        {
            return keyProperties[0].CurrentValue?.ToString() ?? "unknown";
        }

        if (keyProperties.Count > 1)
        {
            return string.Join("-", keyProperties.Select(p => p.CurrentValue?.ToString() ?? "?"));
        }

        // Fallback: try property named "Id"
        var idProp = entry.Properties.FirstOrDefault(p =>
            p.Metadata.Name.Equals("Id", StringComparison.OrdinalIgnoreCase));
        return idProp?.CurrentValue?.ToString() ?? "unknown";
    }

    private static string GetPropertyValues(EntityEntry entry, EntityState state)
    {
        var values = new Dictionary<string, object?>();
        foreach (var prop in entry.Properties)
        {
            // Skip large binary/navigation properties
            if (prop.Metadata.ClrType == typeof(byte[]))
                continue;

            var value = state == EntityState.Deleted ? prop.OriginalValue : prop.CurrentValue;

            // Truncate long strings
            if (value is string s && s.Length > 200)
            {
                value = s.Substring(0, 200) + "...";
            }

            values[prop.Metadata.Name] = value;
        }

        try
        {
            return JsonSerializer.Serialize(values, new JsonSerializerOptions
            {
                WriteIndented = false,
                MaxDepth = 3
            });
        }
        catch
        {
            return "{}";
        }
    }

    private static (string oldValues, string newValues, List<string> changedProps) GetModifiedValues(EntityEntry entry)
    {
        var oldValues = new Dictionary<string, object?>();
        var newValues = new Dictionary<string, object?>();
        var changedProps = new List<string>();

        foreach (var prop in entry.Properties)
        {
            if (!prop.IsModified) continue;

            // Skip large binary properties
            if (prop.Metadata.ClrType == typeof(byte[]))
                continue;

            var propName = prop.Metadata.Name;
            var originalValue = prop.OriginalValue;
            var currentValue = prop.CurrentValue;

            // Truncate long strings for readability
            if (originalValue is string os && os.Length > 200)
                originalValue = os.Substring(0, 200) + "...";
            if (currentValue is string cs && cs.Length > 200)
                currentValue = cs.Substring(0, 200) + "...";

            oldValues[propName] = originalValue;
            newValues[propName] = currentValue;
            changedProps.Add(propName);
        }

        string oldJson, newJson;
        try
        {
            oldJson = JsonSerializer.Serialize(oldValues, new JsonSerializerOptions { WriteIndented = false, MaxDepth = 3 });
            newJson = JsonSerializer.Serialize(newValues, new JsonSerializerOptions { WriteIndented = false, MaxDepth = 3 });
        }
        catch
        {
            oldJson = "{}";
            newJson = "{}";
        }

        return (oldJson, newJson, changedProps);
    }
}

/// <summary>
/// Internal class to hold audit entry data before publishing
/// </summary>
internal class AuditEntry
{
    public string EntityName { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty;
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
}
