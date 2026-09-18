using System.Threading.Channels;
using Microsoft.Extensions.Logging;

namespace BuildingBlocks.Email;

/// <summary>
/// IEmailSender implementation: writes to an in-memory Channel and returns immediately. Requests
/// and MassTransit consumers never wait on SMTP (Requirements: no fire-and-forget PUBLISHES, but a
/// queued email send is explicitly allowed to be fire-and-forget from the caller's point of view -
/// the retry/backoff/log happens on QueuedEmailBackgroundService).
/// </summary>
public class QueuedEmailSender : IEmailSender
{
    private readonly Channel<EmailMessage> _channel;
    private readonly ILogger<QueuedEmailSender> _logger;

    public QueuedEmailSender(Channel<EmailMessage> channel, ILogger<QueuedEmailSender> logger)
    {
        _channel = channel;
        _logger = logger;
    }

    public async ValueTask QueueAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        await _channel.Writer.WriteAsync(message, cancellationToken);
        _logger.LogDebug("Email queued to={ToEmail} subject={Subject}", message.ToEmail, message.Subject);
    }
}
