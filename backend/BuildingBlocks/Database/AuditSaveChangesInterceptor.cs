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
        "IdentityRoleClaim`1",
        "IdentityUserLogin`1",
        "IdentityUserToken`1",
        "__EFMigrationsHistory",
        "RefreshToken",
        "PasswordResetToken"
    };

    /// <summary>
    /// Identity join tables that ARE audited, despite matching the generic-marker rule below.
    ///
    /// IR W0 #20: <c>IdentityUserRole`1</c> and <c>IdentityUserClaim`1</c> were skipped twice over -
    /// once by name, once by the backtick rule - so nothing recorded a row appearing in or vanishing
    /// from <c>AspNetUserRoles</c>. That is precisely why the pre-incident <c>Admin</c> membership
    /// could not be reconstructed from <c>AuditLogs</c> after an agent deleted the role. The endpoint
    /// path was patched by W0-1, but a direct SQL grant, a seeder grant or an FK cascade still left
    /// no trace. Role and claim membership IS the authorization state of this system; it is the last
    /// thing that should change silently. Their columns are ids, not credentials, so nothing here
    /// weakens the secret deny-list.
    /// </summary>
    private static readonly HashSet<string> AuditedIdentityJoinTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "IdentityUserRole`1",
        "IdentityUserClaim`1"
    };

    /// <summary>
    /// Property names whose VALUE must never reach an audit row. A verified 51
    /// rows in the owner's `AuditLogs` carry `PasswordHash` and `SecurityStamp`
    /// of real accounts in plain `OldValues`/`NewValues` JSON, because the
    /// interceptor serialised every property of every changed entity. An audit
    /// log is widely readable by design - it is the last place a credential
    /// should sit.
    /// </summary>
    private static readonly HashSet<string> SecretPropertyNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "PasswordHash",
        "SecurityStamp",
        "ConcurrencyStamp",
        "TotpSecret",
        "BackupCodes",
        "Token",
        "CodeHash",
        "Salt",
        "RefreshToken",
        "AccessToken",
        "Password",
        "NewPassword",
        "CurrentPassword",
        "PrivateKey",
        "WebhookSecret"
    };

    /// <summary>Suffix/substring rules for names the exact list cannot enumerate.</summary>
    private static readonly string[] SecretNameFragments =
    {
        "Secret",
        "Password",
        "ApiKey",
        "AccessKey"
    };

    /// <summary>
    /// Names that match <see cref="SecretNameFragments"/> but hold a FACT ABOUT a credential rather
    /// than the credential: a flag or a timestamp. Redacting them threw away exactly the signal an
    /// audit log exists for - "the password was changed at 03:14", "this account was forced to
    /// reset". Checked before everything else, and shared by both layers (the EF interceptor and
    /// <see cref="AuditSecretScrubber"/>) so they cannot disagree about one property.
    /// </summary>
    private static readonly HashSet<string> NotSecretPropertyNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "ForcePasswordChange",
        "MustChangePassword",
        "PasswordResetRequired",
        "HasPassword",
        "PasswordChangedAt",
        "PasswordChangedBy",
        "PasswordExpiresAt",
        "SecretExpiresAt",
        "ApiKeyExpiresAt",
        "ApiKeyLastUsedAt",
        "TokenExpiresAt",
        "TokenExpiry"
    };

    private const string RedactedValue = "***REDACTED***";

    /// <summary>
    /// True when <paramref name="propertyName"/> names a credential. Checked for
    /// EVERY DbContext, not just Identity - `WebhookSecret`, `ApiKey` and friends
    /// live in the payment and integration modules.
    /// </summary>
    public static bool IsSecretProperty(string propertyName)
    {
        if (string.IsNullOrEmpty(propertyName)) return false;
        if (NotSecretPropertyNames.Contains(propertyName)) return false;
        if (SecretPropertyNames.Contains(propertyName)) return true;

        foreach (var fragment in SecretNameFragments)
        {
            if (propertyName.Contains(fragment, StringComparison.OrdinalIgnoreCase)) return true;
        }
        return false;
    }

    /// <summary>
    /// A credential can only live in a string, a blob or an opaque column. <c>PasswordChangedAt</c>
    /// (DateTime) and <c>ForcePasswordChange</c> (bool) match <see cref="IsSecretProperty"/> on their
    /// NAME but cannot hold a secret, and redacting them threw away real security signal - "the
    /// password was changed at 03:14" is exactly what an audit log exists to record. Type-driven so
    /// no name allowlist can go stale.
    /// </summary>
    internal static bool CanCarrySecretValue(Type clrType)
    {
        var type = Nullable.GetUnderlyingType(clrType) ?? clrType;
        return type == typeof(string)
            || type == typeof(byte[])
            || type == typeof(object)
            || type == typeof(Guid);
    }

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

        // D10: one summary row for a bulk import instead of one row per entity.
        var bulk = AuditScope.Current;
        if (bulk is not null)
        {
            CaptureBulkSummary(entries, module, bulk);
            return;
        }

        foreach (var entry in entries)
        {
            var entityTypeName = entry.Metadata.ClrType.Name;

            // Skip internal entity types
            if (SkipEntityTypes.Contains(entityTypeName))
                continue;

            // Skip generic EF/Identity infrastructure types, except the join tables that carry
            // authorization state (IR W0 #20).
            if (entityTypeName.Contains('`') && !AuditedIdentityJoinTypes.Contains(entityTypeName))
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

    /// <summary>
    /// Collapses one <c>SaveChanges</c> inside an <see cref="AuditScope.Bulk"/> into a single entry:
    /// who, which file, how many rows, split by Create/Update/Delete and by entity type. Values are
    /// deliberately NOT serialised - that is the whole point of the scope; the imported file is the
    /// record of what the data was.
    ///
    /// One row per <c>SaveChanges</c>, not per scope: a batched importer that saves every 500 rows
    /// produces a handful of rows instead of 5.000, which is the reduction that matters and needs no
    /// state carried across calls.
    /// </summary>
    private void CaptureBulkSummary(List<EntityEntry> entries, string module, AuditScope.BulkOperation bulk)
    {
        var counted = entries
            .Where(e =>
            {
                var name = e.Metadata.ClrType.Name;
                if (SkipEntityTypes.Contains(name)) return false;
                return !name.Contains('`') || AuditedIdentityJoinTypes.Contains(name);
            })
            .ToList();

        if (counted.Count == 0) return;

        var created = counted.Count(e => e.State == EntityState.Added);
        var updated = counted.Count(e => e.State == EntityState.Modified);
        var deleted = counted.Count(e => e.State == EntityState.Deleted);
        var entityNames = counted
            .Select(e => e.Metadata.ClrType.Name)
            .Distinct(StringComparer.Ordinal)
            .OrderBy(n => n, StringComparer.Ordinal)
            .ToList();

        _pendingAuditEntries.Add(new AuditEntry
        {
            EntityName = entityNames.Count == 1 ? entityNames[0] : "BulkOperation",
            EntityId = bulk.FileName ?? bulk.Operation,
            Action = "BulkImport",
            Module = module,
            Details = $"{bulk.Operation}: {counted.Count} bản ghi " +
                      $"(thêm {created}, sửa {updated}, xoá {deleted}) " +
                      $"trên {string.Join(", ", entityNames)}" +
                      (string.IsNullOrEmpty(bulk.FileName) ? string.Empty : $" - tệp {bulk.FileName}")
        });
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

            var propName = prop.Metadata.Name;

            // Credentials are redacted, never truncated - a truncated hash is
            // still a hash.
            if (IsSecretProperty(propName) && CanCarrySecretValue(prop.Metadata.ClrType))
            {
                values[propName] = RedactedValue;
                continue;
            }

            var value = state == EntityState.Deleted ? prop.OriginalValue : prop.CurrentValue;

            // Truncate long strings
            if (value is string s && s.Length > 200)
            {
                value = s.Substring(0, 200) + "...";
            }

            values[propName] = value;
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

            // The property name stays in changedProps ("PasswordHash was
            // changed" is legitimate audit information); only the value goes.
            if (IsSecretProperty(propName) && CanCarrySecretValue(prop.Metadata.ClrType))
            {
                oldValues[propName] = RedactedValue;
                newValues[propName] = RedactedValue;
                changedProps.Add(propName);
                continue;
            }

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
