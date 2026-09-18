using System.Text.Json;
using BuildingBlocks.Endpoints;
using FluentAssertions;
using Xunit;

namespace UnitTests.Platform;

/// <summary>
/// The converter is the only thing standing between the API and a visible 7 hour skew, so the risk
/// it must never realise is DOUBLE-SHIFTING a value that was already correct (phase W0-2 risk 3).
/// </summary>
public class UtcDateTimeJsonConverterTests
{
    private static readonly JsonSerializerOptions Options = BuildOptions();

    private static JsonSerializerOptions BuildOptions()
    {
        var options = new JsonSerializerOptions();
        ApiJsonOptions.Apply(options);
        return options;
    }

    private sealed record Payload(DateTime At, DateTime? MaybeAt);

    [Fact]
    public void Unspecified_IsLabelledUtc_WithoutShiftingTheClock()
    {
        // This is what EF returns for a `timestamp without time zone` column under
        // Npgsql.EnableLegacyTimestampBehavior — the instant is already UTC, only the label is missing.
        var value = new DateTime(2026, 9, 18, 10, 30, 0, DateTimeKind.Unspecified);

        var normalized = UtcDateTimeJsonConverter.Normalize(value);

        normalized.Kind.Should().Be(DateTimeKind.Utc);
        normalized.Hour.Should().Be(10, "re-kinding must not move the clock");
        normalized.Should().Be(DateTime.SpecifyKind(value, DateTimeKind.Utc));
    }

    [Fact]
    public void Utc_IsLeftAlone()
    {
        var value = new DateTime(2026, 9, 18, 10, 30, 0, DateTimeKind.Utc);

        UtcDateTimeJsonConverter.Normalize(value).Should().Be(value);
    }

    [Fact]
    public void Local_IsConvertedToUtc()
    {
        var value = new DateTime(2026, 9, 18, 17, 30, 0, DateTimeKind.Local);

        var normalized = UtcDateTimeJsonConverter.Normalize(value);

        normalized.Kind.Should().Be(DateTimeKind.Utc);
        normalized.Should().Be(value.ToUniversalTime());
    }

    [Fact]
    public void Serialized_DateTime_EndsWithZ()
    {
        var json = JsonSerializer.Serialize(
            new Payload(new DateTime(2026, 9, 18, 10, 30, 0, DateTimeKind.Unspecified), null),
            Options);

        json.Should().Contain("\"at\":\"2026-09-18T10:30:00.0000000Z\"");
        json.Should().Contain("\"maybeAt\":null");
    }

    [Fact]
    public void Serialized_NullableDateTime_EndsWithZ()
    {
        // System.Text.Json does not apply a JsonConverter<DateTime> to a DateTime? property, which is
        // why a second converter exists. Without it every nullable timestamp kept the old naive shape.
        var json = JsonSerializer.Serialize(
            new Payload(DateTime.UnixEpoch, new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Unspecified)),
            Options);

        json.Should().Contain("\"maybeAt\":\"2026-01-02T03:04:05.0000000Z\"");
    }

    [Fact]
    public void RoundTrip_KeepsTheSameInstant()
    {
        var original = new Payload(
            new DateTime(2026, 9, 18, 10, 30, 0, DateTimeKind.Unspecified),
            new DateTime(2026, 9, 18, 11, 0, 0, DateTimeKind.Utc));

        var restored = JsonSerializer.Deserialize<Payload>(JsonSerializer.Serialize(original, Options), Options);

        restored.Should().NotBeNull();
        restored!.At.Should().Be(DateTime.SpecifyKind(original.At, DateTimeKind.Utc));
        restored.At.Kind.Should().Be(DateTimeKind.Utc);
        restored.MaybeAt.Should().Be(original.MaybeAt);
    }

    [Fact]
    public void Apply_KeepsCamelCaseAndStringEnums()
    {
        var json = JsonSerializer.Serialize(new { SomeValue = 1, Day = DayOfWeek.Friday }, Options);

        json.Should().Be("{\"someValue\":1,\"day\":\"Friday\"}");
    }
}
