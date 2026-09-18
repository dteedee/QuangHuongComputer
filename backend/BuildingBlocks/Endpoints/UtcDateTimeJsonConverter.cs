using System.Text.Json;
using System.Text.Json.Serialization;

namespace BuildingBlocks.Endpoints;

/// <summary>
/// Serializes every <see cref="DateTime"/> leaving the API as ISO-8601 UTC ending in <c>Z</c>.
///
/// Why: 443 of the 493 datetime columns are PostgreSQL <c>timestamp without time zone</c> and
/// <c>Npgsql.EnableLegacyTimestampBehavior</c> is on, so EF hands back <see cref="DateTimeKind.Unspecified"/>
/// values. System.Text.Json then writes them with no offset, and every browser in
/// <c>Asia/Ho_Chi_Minh</c> reads them as local time — a visible 7 hour skew on every date in the UI.
/// The stored instants are already UTC (the write paths use <c>DateTime.UtcNow</c>), so the fix is
/// to LABEL them, not to shift them.
///
/// Rules (only these three — anything else would double-shift a value that is already correct):
///   Unspecified -> <c>SpecifyKind(Utc)</c>  (label only, no arithmetic)
///   Local       -> <c>ToUniversalTime()</c> (real conversion)
///   Utc         -> unchanged
///
/// Converting the columns themselves to <c>timestamptz</c> is a separate, later track (W1-4);
/// this converter stays correct afterwards because a <c>timestamptz</c> column already yields Utc.
/// </summary>
public sealed class UtcDateTimeJsonConverter : JsonConverter<DateTime>
{
    /// <summary>Round-trippable ISO-8601 with 7 fractional digits and the <c>Z</c> designator.</summary>
    internal const string UtcFormat = "yyyy-MM-dd'T'HH:mm:ss.fffffff'Z'";

    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => Normalize(reader.GetDateTime());

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
        => writer.WriteStringValue(Normalize(value).ToString(UtcFormat, System.Globalization.CultureInfo.InvariantCulture));

    /// <summary>Exposed for unit tests and for the nullable sibling converter.</summary>
    public static DateTime Normalize(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
    };
}

/// <summary>
/// Nullable counterpart of <see cref="UtcDateTimeJsonConverter"/>. System.Text.Json does not apply a
/// <c>JsonConverter&lt;DateTime&gt;</c> to a <c>DateTime?</c> property automatically, so both must be registered.
/// </summary>
public sealed class NullableUtcDateTimeJsonConverter : JsonConverter<DateTime?>
{
    public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => reader.TokenType == JsonTokenType.Null ? null : UtcDateTimeJsonConverter.Normalize(reader.GetDateTime());

    public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
    {
        if (value is null)
        {
            writer.WriteNullValue();
            return;
        }

        writer.WriteStringValue(UtcDateTimeJsonConverter
            .Normalize(value.Value)
            .ToString(UtcDateTimeJsonConverter.UtcFormat, System.Globalization.CultureInfo.InvariantCulture));
    }
}

/// <summary>
/// One place that knows how the whole API must serialize JSON, so the minimal-API options,
/// the MVC options and the SignalR hub protocol cannot drift apart.
/// </summary>
public static class ApiJsonOptions
{
    public static void Apply(JsonSerializerOptions options)
    {
        options.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.Converters.Add(new JsonStringEnumConverter());
        options.Converters.Add(new UtcDateTimeJsonConverter());
        options.Converters.Add(new NullableUtcDateTimeJsonConverter());
    }
}
