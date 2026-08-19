using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SystemConfig.Infrastructure;

namespace SystemConfig;

/// <summary>
/// Validate a JSON "attributes" blob (stored on Product/Order/Lead jsonb column) against the
/// active CustomFieldDefinition rows for that EntityType. Extensibility-first: unknown keys are
/// always allowed (no schema lock-in); only DECLARED fields get their type/required checked.
/// </summary>
public static class CustomFieldAttributeValidator
{
    /// <summary>Returns null when valid, or a human-readable error message otherwise.</summary>
    public static async Task<string?> ValidateAsync(
        CustomFieldDbContext db,
        string entityType,
        string? attributesJson,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(attributesJson))
            return null;

        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(attributesJson);
        }
        catch (JsonException)
        {
            return "attributes phải là JSON hợp lệ";
        }

        if (doc.RootElement.ValueKind != JsonValueKind.Object)
            return "attributes phải là JSON object";

        var definitions = await db.CustomFieldDefinitions
            .Where(f => f.EntityType == entityType && f.IsActive)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        if (definitions.Count == 0)
            return null; // No declared schema yet — anything goes.

        foreach (var def in definitions)
        {
            if (!doc.RootElement.TryGetProperty(def.FieldKey, out var value) || value.ValueKind == JsonValueKind.Null)
            {
                if (def.IsRequired)
                    return $"Trường '{def.Label}' ({def.FieldKey}) là bắt buộc";
                continue;
            }

            var typeError = ValidateType(def.FieldKey, def.Label, def.FieldType, value);
            if (typeError != null)
                return typeError;
        }

        return null;
    }

    private static string? ValidateType(string fieldKey, string label, string fieldType, JsonElement value)
    {
        switch (fieldType)
        {
            case "number":
                if (value.ValueKind != JsonValueKind.Number)
                    return $"Trường '{label}' ({fieldKey}) phải là số";
                break;
            case "boolean":
                if (value.ValueKind != JsonValueKind.True && value.ValueKind != JsonValueKind.False)
                    return $"Trường '{label}' ({fieldKey}) phải là true/false";
                break;
            case "date":
                if (value.ValueKind != JsonValueKind.String || !DateTime.TryParse(value.GetString(), out _))
                    return $"Trường '{label}' ({fieldKey}) phải là ngày hợp lệ";
                break;
            case "multiselect":
                if (value.ValueKind != JsonValueKind.Array)
                    return $"Trường '{label}' ({fieldKey}) phải là mảng";
                break;
            case "text":
            case "select":
            case "url":
            case "email":
            default:
                if (value.ValueKind != JsonValueKind.String)
                    return $"Trường '{label}' ({fieldKey}) phải là chuỗi";
                break;
        }
        return null;
    }
}
