using System.Text.Json;
using System.Text.Json.Nodes;

namespace Catalog.Infrastructure.Data.Import;

/// <summary>
/// Canonical form of a JSON string, used ONLY for change detection.
///
/// <c>Products.Specifications</c>, <c>Attributes</c> and <c>GalleryImages</c> are <c>jsonb</c>.
/// PostgreSQL re-formats jsonb on the way in: whitespace goes, duplicate keys go, and object
/// keys come back ordered by key length then bytes. So the exact string the importer wrote is
/// never the string it reads back, and a naive comparison marks all 67 products as changed on
/// every single run - which would destroy the "a second run changes nothing" guarantee the gate
/// checks. Canonicalising both sides (sorted keys, no whitespace) makes the comparison mean
/// what it is supposed to mean.
/// </summary>
public static class ImportJsonCanonicalizer
{
    public static string Canonical(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return string.Empty;
        try
        {
            var node = JsonNode.Parse(json);
            using var stream = new MemoryStream();
            using (var writer = new Utf8JsonWriter(stream))
                Write(node, writer);
            return System.Text.Encoding.UTF8.GetString(stream.ToArray());
        }
        catch (JsonException)
        {
            return json; // not JSON after all - compare it verbatim
        }
    }

    private static void Write(JsonNode? node, Utf8JsonWriter writer)
    {
        switch (node)
        {
            case null:
                writer.WriteNullValue();
                break;
            case JsonObject obj:
                writer.WriteStartObject();
                foreach (var kv in obj.OrderBy(k => k.Key, StringComparer.Ordinal))
                {
                    writer.WritePropertyName(kv.Key);
                    Write(kv.Value, writer);
                }
                writer.WriteEndObject();
                break;
            case JsonArray arr:
                writer.WriteStartArray();
                foreach (var item in arr) Write(item, writer);
                writer.WriteEndArray();
                break;
            default:
                node.WriteTo(writer);
                break;
        }
    }
}
