using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace BuildingBlocks.Database;

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
