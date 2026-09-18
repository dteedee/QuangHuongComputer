using BuildingBlocks.Email;
using Microsoft.Extensions.Configuration;

namespace Identity.Services;

/// <summary>
/// D12 unification: this used to open its own SmtpClient against the "Email:Smtp:*" key family
/// while BuildingBlocks/Email/EmailService.cs opened ANOTHER SmtpClient against "Email:SmtpHost|..."
/// - two duplicate SMTP clients, two config families, both defaulting to smtp.gmail.com, neither
/// reading a key that actually existed. Both are now thin facades over the one shared
/// BuildingBlocks.Email.IEmailSender (Channel-queued, retried, "Email:Smtp:*"-configured, dev logs
/// instead of sending). Public interface (Identity.Services.IEmailService) is unchanged -
/// AuthenticationEndpoints.cs / PasswordResetEndpoints.cs / Identity/DependencyInjection.cs are
/// outside this track's ownership.
///
/// NOTE for whoever owns Identity/DependencyInjection.cs next: this class + its interface are now
/// a redundant wrapper around BuildingBlocks.Email.IEmailSender. Deleting them and injecting
/// IEmailSender directly at the two call sites above needs a DependencyInjection.cs edit this
/// track does not own - see integration-requests-w1.md.
/// </summary>
public class EmailService : IEmailService
{
    private readonly IEmailSender _sender;
    private readonly string _frontendUrl;

    public EmailService(IEmailSender sender, IConfiguration configuration)
    {
        _sender = sender;
        _frontendUrl = configuration["Frontend:Url"] ?? "http://localhost:5173";
    }

    public Task SendPasswordResetEmailAsync(string toEmail, string resetCode)
    {
        var body = EmailTemplateRenderer.Render("password-reset", new
        {
            reset_code = resetCode,
            reset_link = $"{_frontendUrl}/reset-password"
        });

        return SendEmailAsync(toEmail, "Mã xác nhận đặt lại mật khẩu - Quang Hưởng Computer", body);
    }

    public Task SendWelcomeEmailAsync(string toEmail, string fullName)
    {
        var body = EmailTemplateRenderer.Render("welcome", new
        {
            full_name = fullName,
            sent_at = BuildingBlocks.Localization.VietnameseFormatter.FormatDateTime(DateTime.Now)
        });

        return SendEmailAsync(toEmail, "Chào mừng đến với Quang Hưởng Computer!", body);
    }

    public Task SendEmailAsync(string toEmail, string subject, string htmlBody) =>
        _sender.QueueAsync(new EmailMessage { ToEmail = toEmail, Subject = subject, Body = htmlBody, IsHtml = true }).AsTask();
}
