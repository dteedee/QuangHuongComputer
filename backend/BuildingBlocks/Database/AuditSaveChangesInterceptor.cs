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
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

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
/// Last line of defence, applied where an audit row is actually PERSISTED rather than where it is
/// produced. <see cref="AuditSaveChangesInterceptor"/> only sees EF properties, so it cannot catch:
///
///   * a secret nested inside a value - an entity column holding a serialised JSON payload
///     (<c>Payload</c>, <c>Metadata</c>, <c>RequestBody</c>, webhook envelopes), whose own keys the
///     property-name filter never looks at;
///   * a write path that does not go through the interceptor at all -
///     <c>HttpContext.LogAuditAsync(..., details, oldValues, newValues)</c> builds its strings by
///     hand. <c>SystemConfigEndpoints</c> for instance logs <c>$"Value: {entry.Value}"</c>, and the
///     configuration table is where SMTP passwords and webhook secrets live.
///
/// Both funnel into the two inserters (<c>AuditLogConsumer</c>, <c>AuditService</c>), so scrubbing
/// there closes every path at once. Property NAMES survive - "PasswordHash changed" is legitimate
/// audit information; only values go.
/// </summary>
public static class AuditSecretScrubber
{
    public const string Redacted = "***REDACTED***";

    /// <summary>ASP.NET Identity PBKDF2 hashes (v2/v3 both start with this), and JWTs.</summary>
    private static readonly Regex SecretValueShapes = new(
        @"AQAA[A-Za-z0-9+/=]{16,}|eyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}",
        RegexOptions.Compiled);

    /// <summary>
    /// Property names that IDENTIFY what a key/value row is about. A key/value table defeats every
    /// name-based filter: <c>SystemConfig.Configurations</c> stores the SMTP password in a column
    /// called <c>Value</c> under a key called <c>Email:Smtp:Password</c>, so the secret is named by
    /// its sibling, not by its own column. Verified on TEST: audit row ConfigurationEntry/Create
    /// held <c>"Key":"Email:Smtp:Password","Value":"hunter2-SuperSecret"</c>.
    /// </summary>
    private static readonly string[] IdentifierPropertyNames =
        { "Key", "Name", "Code", "Setting", "SettingKey", "ConfigKey", "PropertyName", "Field" };

    /// <summary>Payload columns to redact once a sibling identifier has named a secret.</summary>
    private static readonly string[] PayloadPropertyNames =
        { "Value", "JsonValue", "RawValue", "StringValue", "Data", "Content" };

    /// <summary><c>Password: hunter2</c>, <c>WebhookSecret=abc</c>, <c>"token": "xyz"</c> in free text.</summary>
    private static readonly Regex SecretLabelledValue = new(
        @"(?<label>password|passwordhash|secret|securitystamp|concurrencystamp|apikey|accesskey|token|codehash|salt|privatekey)(?<sep>""?\s*[:=]\s*""?)(?<value>[^\s,;}""]+)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    /// <summary>
    /// Redacts by property name at EVERY depth, including inside a string that is itself JSON.
    /// Returns the input unchanged when it is not JSON (then <see cref="ScrubText"/> applies).
    /// </summary>
    public static string? ScrubJson(string? json, bool contextNamesASecret = false)
    {
        if (string.IsNullOrWhiteSpace(json)) return json;

        JsonNode? root;
        try
        {
            root = JsonNode.Parse(json);
        }
        catch (JsonException)
        {
            return ScrubText(json);
        }
        if (root is null) return ScrubText(json);

        // An EF Modified entry serialises only the CHANGED properties, so the identifying `Key`
        // column is usually absent and the sibling rule below cannot fire. Verified leak on TEST:
        //   ConfigurationEntry|Update|{"LastUpdated":"...","Value":"hunter2-round2"}
        // The caller knows what the row is about (EntityId), so it says so.
        var changed = contextNamesASecret && root is JsonObject rootObject && RedactPayloadColumns(rootObject);

        // The node walk covers every property name at every depth AND text-scrubs every string
        // leaf, so there is nothing left for a raw-text pass to find - and running one over valid
        // JSON would only risk corrupting it (`"PasswordHash":null` -> `"PasswordHash":REDACTED`).
        if (ScrubNode(root, depth: 0)) changed = true;
        if (!changed) return json;

        try
        {
            return root.ToJsonString();
        }
        catch
        {
            return Redacted;
        }
    }

    /// <summary><c>OldValues</c>/<c>NewValues</c> for an audit row, given what the row is ABOUT.</summary>
    public static string? ScrubValues(string? json, string? entityName, string? entityId)
        => ScrubJson(json, NamesASecret(entityId) || NamesASecret(entityName));

    /// <summary>Free-text scrub for <c>Details</c> and for anything that is not valid JSON.</summary>
    public static string? ScrubText(string? text)
    {
        if (string.IsNullOrEmpty(text)) return text;

        var scrubbed = SecretValueShapes.Replace(text, Redacted);
        scrubbed = SecretLabelledValue.Replace(scrubbed, m =>
        {
            var value = m.Groups["value"].Value;
            // Already redacted, or a JSON literal that cannot be a credential.
            if (value == Redacted || value is "null" or "true" or "false") return m.Value;
            return $"{m.Groups["label"].Value}{m.Groups["sep"].Value}{Redacted}";
        });
        return scrubbed;
    }

    /// <summary>
    /// True when the object is a key/value row whose identifier names a credential, e.g.
    /// <c>{"Key":"Email:Smtp:Password","Value":"..."}</c>.
    /// </summary>
    private static bool RedactPayloadColumns(JsonObject obj)
    {
        var changed = false;
        foreach (var payloadName in PayloadPropertyNames)
        {
            var payload = obj[payloadName];
            if (payload is null || payload.GetValueKind() == JsonValueKind.Null) continue;
            if (payload.GetValueKind() == JsonValueKind.String && payload.GetValue<string>() == Redacted) continue;
            obj[payloadName] = Redacted;
            changed = true;
        }
        return changed;
    }

    private static bool DescribesASecret(JsonObject obj)
    {
        foreach (var identifierName in IdentifierPropertyNames)
        {
            var identifier = obj[identifierName];
            if (identifier is null || identifier.GetValueKind() != JsonValueKind.String) continue;
            if (AuditSaveChangesInterceptor.IsSecretProperty(identifier.GetValue<string>())) return true;
        }
        return false;
    }

    /// <summary>
    /// <c>Details</c> for an audit row, given what the row is ABOUT. When the audited thing is
    /// itself a credential, no free text about it can be published: SystemConfigEndpoints logs
    /// <c>$"Value: {entry.Value}"</c>, whose label is "Value", so no value-side rule can recognise
    /// it. The row still records Action/EntityName/EntityId - "someone changed the SMTP password"
    /// is the audit signal; the password is not.
    /// </summary>
    public static string? ScrubDetails(string? details, string? entityName, string? entityId)
        => NamesASecret(entityId) || NamesASecret(entityName) ? Redacted : ScrubText(details);

    /// <summary>True when an identifier (an entity id, a config key) names a credential.</summary>
    public static bool NamesASecret(string? identifier)
        => !string.IsNullOrWhiteSpace(identifier)
           && AuditSaveChangesInterceptor.IsSecretProperty(identifier);

    /// <summary>True when anything was redacted. Depth-capped: a cycle is impossible, a bomb is not.</summary>
    private static bool ScrubNode(JsonNode node, int depth)
    {
        if (depth > 12) return false;
        var changed = false;

        switch (node)
        {
            case JsonObject obj:
                // A key/value row whose KEY names a secret: its payload column is the secret,
                // whatever that column happens to be called.
                if (DescribesASecret(obj) && RedactPayloadColumns(obj)) changed = true;

                // Snapshot: assigning to an indexer while enumerating a JsonObject throws.
                foreach (var (name, child) in obj.ToList())
                {
                    if (AuditSaveChangesInterceptor.IsSecretProperty(name))
                    {
                        if (child is not null && child.GetValueKind() != JsonValueKind.Null)
                        {
                            obj[name] = Redacted;
                            changed = true;
                        }
                        continue;
                    }
                    if (child is null) continue;
                    if (ScrubNode(child, depth + 1)) changed = true;
                    if (child is JsonValue && TryScrubLeaf(child, out var replacement))
                    {
                        obj[name] = replacement;
                        changed = true;
                    }
                }
                return changed;

            case JsonArray arr:
                for (var i = 0; i < arr.Count; i++)
                {
                    var child = arr[i];
                    if (child is null) continue;
                    if (ScrubNode(child, depth + 1)) changed = true;
                    if (child is JsonValue && TryScrubLeaf(child, out var replacement))
                    {
                        arr[i] = replacement;
                        changed = true;
                    }
                }
                return changed;

            default:
                return false;
        }
    }

    /// <summary>
    /// A string leaf can itself be a JSON document (a serialised payload column) or free text
    /// carrying a hash. Both are handled here so no depth of nesting escapes.
    /// </summary>
    private static bool TryScrubLeaf(JsonNode leaf, out string? replacement)
    {
        replacement = null;
        if (leaf.GetValueKind() != JsonValueKind.String) return false;

        var value = leaf.GetValue<string>();
        if (string.IsNullOrEmpty(value)) return false;

        var trimmed = value.TrimStart();
        if (trimmed.StartsWith('{') || trimmed.StartsWith('['))
        {
            var inner = ScrubJson(value);
            if (inner != value) { replacement = inner; return true; }
            return false;
        }

        var scrubbed = ScrubText(value);
        if (scrubbed != value) { replacement = scrubbed; return true; }
        return false;
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
