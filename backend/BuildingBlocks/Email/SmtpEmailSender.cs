using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;

namespace BuildingBlocks.Email;

/// <summary>
/// The single place that ever opens an SMTP connection (MailKit). Called only by
/// QueuedEmailBackgroundService on the background worker - never from a request thread.
/// </summary>
public interface IEmailTransport
{
    Task SendAsync(EmailMessage message, CancellationToken cancellationToken);
}

/// <summary>
/// D12 "Null | Smtp" provider: Development always logs instead of sending (Key Insight - never
/// pretend to send), and any environment where EmailOptions.IsConfigured is false (empty or
/// "${...}" placeholder) does the same instead of throwing on a blank host/credentials.
/// </summary>
public class SmtpEmailSender : IEmailTransport
{
    private readonly EmailOptions _options;
    private readonly ILogger<SmtpEmailSender> _logger;
    private readonly bool _logInsteadOfSend;

    public SmtpEmailSender(IOptions<EmailOptions> options, ILogger<SmtpEmailSender> logger, IHostEnvironment environment)
    {
        _options = options.Value;
        _logger = logger;
        _logInsteadOfSend = environment.IsDevelopment() || !_options.IsConfigured;
    }

    public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        if (_logInsteadOfSend)
        {
            _logger.LogInformation(
                "[EMAIL:{Mode}] to={ToEmail} subject={Subject}\n{Body}",
                _options.IsConfigured ? "DEV" : "UNCONFIGURED", message.ToEmail, message.Subject, message.Body);
            return;
        }

        using var mime = new MimeMessage();
        mime.From.Add(new MailboxAddress(_options.FromName, _options.FromEmail));
        mime.To.Add(MailboxAddress.Parse(message.ToEmail));
        mime.Subject = message.Subject;
        mime.Body = new BodyBuilder
        {
            HtmlBody = message.IsHtml ? message.Body : null,
            TextBody = message.IsHtml ? null : message.Body
        }.ToMessageBody();

        using var client = new SmtpClient();
        // EnableSsl=true -> Auto (STARTTLS on 587/25, implicit TLS on 465); false -> None, the only
        // way to talk to a local sink (MailHog on :1025) that offers no STARTTLS at all.
        var secureOption = _options.EnableSsl ? SecureSocketOptions.Auto : SecureSocketOptions.None;

        await client.ConnectAsync(_options.Host, _options.Port, secureOption, cancellationToken);
        if (!string.IsNullOrEmpty(_options.Username))
        {
            await client.AuthenticateAsync(_options.Username, _options.Password, cancellationToken);
        }
        await client.SendAsync(mime, cancellationToken);
        await client.DisconnectAsync(true, cancellationToken);
    }
}
