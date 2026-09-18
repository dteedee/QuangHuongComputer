using BuildingBlocks.Email;
using FluentAssertions;
using Xunit;

namespace UnitTests.Platform;

/// <summary>
/// D12: "Email:Smtp:Password is currently the literal string ${SMTP_PASSWORD} because nothing
/// expands ${...}, so real email is almost certainly failing silently today - verify it." This
/// proves EmailOptions.IsConfigured treats that placeholder (and an empty value) as absence, the
/// same rule MassTransitRegistration applies to ConnectionStrings:RabbitMQ.
/// </summary>
public class EmailOptionsTests
{
    private static EmailOptions FullyConfigured() => new()
    {
        Host = "smtp.gmail.com",
        Port = 587,
        Username = "shop@quanghuongcomputer.com",
        Password = "a-real-app-password",
        FromEmail = "shop@quanghuongcomputer.com",
        FromName = "Quang Huong Computer"
    };

    [Fact]
    public void AllFieldsSet_IsConfigured()
    {
        FullyConfigured().IsConfigured.Should().BeTrue();
    }

    [Fact]
    public void UnexpandedPlaceholderPassword_IsNotConfigured()
    {
        var options = FullyConfigured();
        options.Password = "${SMTP_PASSWORD}";

        options.IsConfigured.Should().BeFalse("nothing in this codebase expands \"${...}\" - it is not a real password");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void EmptyOrWhitespaceHost_IsNotConfigured(string? host)
    {
        var options = FullyConfigured();
        options.Host = host!;

        options.IsConfigured.Should().BeFalse();
    }

    [Fact]
    public void DefaultOptions_AreNotConfigured()
    {
        new EmailOptions().IsConfigured.Should().BeFalse();
    }

    [Fact]
    public void PlaceholderUsername_IsNotConfigured()
    {
        var options = FullyConfigured();
        options.Username = "${SMTP_USERNAME}";

        options.IsConfigured.Should().BeFalse();
    }
}
