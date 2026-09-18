using BuildingBlocks.Database;
using FluentAssertions;
using Xunit;

namespace UnitTests.Platform;

/// <summary>
/// W0 gate residual defect 2. The property-name filter in <see cref="AuditSaveChangesInterceptor"/>
/// only sees EF properties of the entity being saved. Two classes of leak walked past it:
///
///   * a secret nested inside a value (a column holding a serialised JSON payload);
///   * a producer that never goes through the interceptor - <c>HttpContext.LogAuditAsync</c> builds
///     its <c>Details</c>/<c>OldValues</c>/<c>NewValues</c> strings by hand, and
///     <c>SystemConfigEndpoints</c> logs <c>$"Value: {entry.Value}"</c> for a table that holds SMTP
///     passwords and webhook secrets.
///
/// <see cref="AuditSecretScrubber"/> runs at the two inserters instead, so both are closed.
/// </summary>
public class AuditSecretScrubberTests
{
    private const string Redacted = "***REDACTED***";
    private const string RealHash = "AQAAAAIAAYagAAAAEJ0kqLm9xTvW7jH3pQ8sYf2bN4cR6dE1fG5hI7jK9lM0nO2pQ4rS6tU8vW0xY2z";

    [Fact]
    public void TopLevelSecretProperty_IsRedacted()
    {
        var scrubbed = AuditSecretScrubber.ScrubJson($"{{\"Email\":\"a@b.c\",\"PasswordHash\":\"{RealHash}\"}}");

        scrubbed.Should().NotContain("AQAA").And.Contain(Redacted);
        scrubbed.Should().Contain("a@b.c", "non-secret columns are audit information and must survive");
    }

    [Fact]
    public void SecretNestedInsideASerialisedJsonColumn_IsRedacted()
    {
        // The exact gap the interceptor cannot see: "Payload" is not a secret NAME, so the property
        // filter waves it through, and the credential sits one level down inside its string value.
        var json = $"{{\"Id\":7,\"Payload\":\"{{\\\"userId\\\":\\\"u1\\\",\\\"passwordHash\\\":\\\"{RealHash}\\\"}}\"}}";

        var scrubbed = AuditSecretScrubber.ScrubJson(json);

        scrubbed.Should().NotContain("AQAA");
        scrubbed.Should().Contain(Redacted);
    }

    [Fact]
    public void SecretNestedInsideAnArrayOfObjects_IsRedacted()
    {
        var json = $"{{\"Users\":[{{\"Email\":\"a@b.c\",\"SecurityStamp\":\"5f2c9a10-1b2c-4d3e-8f90-1a2b3c4d5e6f\"}}]}}";

        var scrubbed = AuditSecretScrubber.ScrubJson(json);

        scrubbed.Should().NotContain("5f2c9a10").And.Contain(Redacted);
    }

    [Fact]
    public void AnIdentityHashOrJwtInFreeText_IsRedactedEvenWithNoSecretPropertyName()
    {
        AuditSecretScrubber.ScrubText($"Updated user: hash now {RealHash}")
            .Should().NotContain("AQAA").And.Contain(Redacted);

        AuditSecretScrubber.ScrubText("Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiJ9.abcdefghijkl")
            .Should().NotContain("eyJhbGciOiJIUzI1NiJ9").And.Contain(Redacted);
    }

    [Fact]
    public void ALabelledSecretInFreeText_IsRedacted()
    {
        // SystemConfigEndpoints shape: Details = $"Value: {entry.Value}, Module: {entry.Module}".
        var scrubbed = AuditSecretScrubber.ScrubText("BulkUpdate Email:Smtp:Password=hunter2, Module: System");

        scrubbed.Should().NotContain("hunter2").And.Contain(Redacted);
        scrubbed.Should().Contain("Module: System");
    }

    [Fact]
    public void AKeyValueRowWhoseKeyNamesASecret_HasItsValueColumnRedacted()
    {
        // Verified leak on TEST: SystemConfig stores the SMTP password in a column called "Value"
        // under key "Email:Smtp:Password", so the name filter waved the value straight through:
        //   ConfigurationEntry|Create|{"Key":"Email:Smtp:Password","Value":"hunter2-SuperSecret",...}
        var json = """{"Key":"Email:Smtp:Password","Category":"Email","Value":"hunter2-SuperSecret","JsonValue":null,"Module":"System"}""";

        var scrubbed = AuditSecretScrubber.ScrubJson(json);

        scrubbed.Should().NotContain("hunter2").And.Contain(Redacted);
        scrubbed.Should().Contain("Email:Smtp:Password", "the KEY is the audit signal and must survive");
        scrubbed.Should().Contain("\"Module\":\"System\"", "unrelated columns must survive");
    }

    [Fact]
    public void AKeyValueRowWithAnInnocentKey_IsUntouched()
    {
        var json = """{"Key":"Shop:DisplayName","Value":"Quang Huong Computer"}""";

        AuditSecretScrubber.ScrubJson(json).Should().Be(json);
        AuditSecretScrubber.ScrubValues(json, "ConfigurationEntry", "Shop:DisplayName").Should().Be(json);
    }

    [Fact]
    public void AnUpdateThatOnlyCarriesTheChangedColumns_IsRedactedFromTheEntityIdContext()
    {
        // Verified leak on TEST: an EF Modified entry serialises only the CHANGED properties, so
        // the identifying "Key" column is absent and the sibling rule cannot fire:
        //   ConfigurationEntry|Update|Email:Smtp:Password|{"LastUpdated":"...","Value":"hunter2-round2"}
        var json = """{"LastUpdated":"2026-09-18T05:06:13.0474157Z","Value":"hunter2-round2"}""";

        var scrubbed = AuditSecretScrubber.ScrubValues(json, "ConfigurationEntry", "Email:Smtp:Password");

        scrubbed.Should().NotContain("hunter2").And.Contain(Redacted);
        scrubbed.Should().Contain("LastUpdated", "when the value changed is still audit information");
    }

    [Fact]
    public void DetailsAboutASecretEntity_AreRedactedWholesale()
    {
        // SystemConfigEndpoints: Details = $"Value: {entry.Value}". The label is "Value", so no
        // value-side rule can see it - only the EntityId says what the row is about.
        AuditSecretScrubber.ScrubDetails("Value: hunter2-SuperSecret", "Configuration", "Email:Smtp:Password")
            .Should().Be(Redacted);

        AuditSecretScrubber.ScrubDetails("Value: Quang Huong", "Configuration", "Shop:DisplayName")
            .Should().Be("Value: Quang Huong");
    }

    [Theory]
    [InlineData("Email:Smtp:Password", true)]
    [InlineData("Payments:Sepay:WebhookSecret", true)]
    [InlineData("Shop:DisplayName", false)]
    [InlineData(null, false)]
    [InlineData("  ", false)]
    public void NamesASecret_LooksAtTheIdentifier(string? identifier, bool expected)
        => AuditSecretScrubber.NamesASecret(identifier).Should().Be(expected);

    [Fact]
    public void AlreadyRedactedValues_AreLeftAlone()
    {
        var input = $"{{\"PasswordHash\":\"{Redacted}\",\"Email\":\"a@b.c\"}}";

        AuditSecretScrubber.ScrubJson(input).Should().Be(input);
    }

    [Fact]
    public void NullAndPlainText_PassThrough()
    {
        AuditSecretScrubber.ScrubJson(null).Should().BeNull();
        AuditSecretScrubber.ScrubJson("").Should().Be("");
        AuditSecretScrubber.ScrubText("Created Product").Should().Be("Created Product");
        AuditSecretScrubber.ScrubJson("not json at all").Should().Be("not json at all");
    }

    [Fact]
    public void NullSecretValue_StaysNullRatherThanBecomingAString()
    {
        AuditSecretScrubber.ScrubJson("""{"PasswordHash":null,"Email":"a@b.c"}""")
            .Should().Be("""{"PasswordHash":null,"Email":"a@b.c"}""");
    }

    [Theory]
    [InlineData(typeof(string), true)]
    [InlineData(typeof(byte[]), true)]
    [InlineData(typeof(System.Guid), true)]
    [InlineData(typeof(bool), false)]          // ForcePasswordChange
    [InlineData(typeof(System.DateTime), false)] // PasswordChangedAt
    [InlineData(typeof(System.DateTime?), false)]
    [InlineData(typeof(int), false)]
    public void OnlyColumnsThatCanHoldASecretAreRedacted(System.Type clrType, bool expected)
    {
        typeof(AuditSaveChangesInterceptor)
            .GetMethod("CanCarrySecretValue", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static)!
            .Invoke(null, new object[] { clrType })
            .Should().Be(expected);
    }

    [Theory]
    [InlineData("PasswordHash", true)]
    [InlineData("SecurityStamp", true)]
    [InlineData("CodeHash", true)]
    [InlineData("WebhookSecret", true)]
    [InlineData("RefreshToken", true)]
    [InlineData("ApiKey", true)]
    [InlineData("Email", false)]
    [InlineData("FullName", false)]
    [InlineData("", false)]
    // A FACT ABOUT a credential is not the credential. Both layers must agree on these, or the
    // interceptor leaves a bool alone and the consumer's name walk redacts it anyway.
    [InlineData("ForcePasswordChange", false)]
    [InlineData("PasswordChangedAt", false)]
    [InlineData("TokenExpiresAt", false)]
    public void IsSecretProperty_CoversTheNamesTheScrubberReliesOn(string name, bool expected)
        => AuditSaveChangesInterceptor.IsSecretProperty(name).Should().Be(expected);

    [Fact]
    public void AFlagOrTimestampAboutACredential_SurvivesTheJsonWalk()
    {
        var json = """{"ForcePasswordChange":false,"PasswordChangedAt":"2026-09-18T03:14:00.0000000Z","PasswordHash":"secret"}""";

        var scrubbed = AuditSecretScrubber.ScrubJson(json);

        scrubbed.Should().Contain("\"ForcePasswordChange\":false");
        scrubbed.Should().Contain("2026-09-18T03:14:00.0000000Z");
        scrubbed.Should().Contain($"\"PasswordHash\":\"{Redacted}\"");
    }
}
