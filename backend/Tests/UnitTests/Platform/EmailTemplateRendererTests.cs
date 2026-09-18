using BuildingBlocks.Email;
using FluentAssertions;
using Xunit;

namespace UnitTests.Platform;

/// <summary>
/// Proves the Scriban templates embedded in BuildingBlocks/Email/Templates/*.scriban actually
/// parse and substitute - not just that the files exist on disk.
/// </summary>
public class EmailTemplateRendererTests
{
    [Fact]
    public void OrderConfirmed_SubstitutesAllPlaceholders()
    {
        var html = EmailTemplateRenderer.Render("order-confirmed", new
        {
            customer_name = "Nguyễn Văn A",
            order_number = "DH000123",
            total_amount = "15.990.000",
            orders_url = "http://localhost:5173/account/orders"
        });

        html.Should().Contain("Nguyễn Văn A")
            .And.Contain("DH000123")
            .And.Contain("15.990.000")
            .And.Contain("http://localhost:5173/account/orders")
            .And.NotContain("{{", "every placeholder must have been substituted");
    }

    [Fact]
    public void PasswordReset_SubstitutesOtpAndLink()
    {
        var html = EmailTemplateRenderer.Render("password-reset", new
        {
            reset_code = "482913",
            reset_link = "http://localhost:5173/reset-password"
        });

        html.Should().Contain("482913").And.NotContain("{{");
    }

    [Fact]
    public void TwoFactor_SubstitutesOtp()
    {
        var html = EmailTemplateRenderer.Render("two-factor", new
        {
            full_name = "Trần Thị B",
            otp_code = "051627",
            expires_minutes = 5
        });

        html.Should().Contain("051627").And.Contain("5").And.NotContain("{{");
    }

    [Fact]
    public void UnknownTemplateName_Throws()
    {
        var act = () => EmailTemplateRenderer.Render("does-not-exist", new { });

        act.Should().Throw<InvalidOperationException>();
    }
}
