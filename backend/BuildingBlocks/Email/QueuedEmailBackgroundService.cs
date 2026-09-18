using System.Threading.Channels;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BuildingBlocks.Email;

/// <summary>
/// Drains the email Channel one message at a time. Transient failures retry with backoff (2s, 8s,
/// 20s - 4 attempts total); every outcome ends in one structured "EmailDeliveryLog" line with the
/// recipient and status (never the body - Security Considerations: "delivery logs store the
/// recipient and status, not the body"). This wave has no delivery-log TABLE (W1-11 owns
/// migrations) so the structured log line IS the delivery log for now.
/// </summary>
public class QueuedEmailBackgroundService : BackgroundService
{
    private static readonly TimeSpan[] RetryDelays =
    {
        TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(8), TimeSpan.FromSeconds(20)
    };

    private readonly Channel<EmailMessage> _channel;
    private readonly IEmailTransport _transport;
    private readonly ILogger<QueuedEmailBackgroundService> _logger;

    public QueuedEmailBackgroundService(Channel<EmailMessage> channel, IEmailTransport transport, ILogger<QueuedEmailBackgroundService> logger)
    {
        _channel = channel;
        _transport = transport;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await foreach (var message in _channel.Reader.ReadAllAsync(stoppingToken))
            {
                await SendWithRetryAsync(message, stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal shutdown.
        }
    }

    private async Task SendWithRetryAsync(EmailMessage message, CancellationToken stoppingToken)
    {
        for (var attempt = 0; ; attempt++)
        {
            try
            {
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
                cts.CancelAfter(TimeSpan.FromSeconds(30));
                await _transport.SendAsync(message, cts.Token);
                LogDelivery(message, "Sent", attempt);
                return;
            }
            catch (Exception ex) when (attempt < RetryDelays.Length && !stoppingToken.IsCancellationRequested)
            {
                _logger.LogWarning(ex,
                    "Gửi email thất bại (lần {Attempt}/{Max}), thử lại sau {DelaySeconds}s. to={ToEmail}",
                    attempt + 1, RetryDelays.Length + 1, RetryDelays[attempt].TotalSeconds, message.ToEmail);
                await Task.Delay(RetryDelays[attempt], stoppingToken);
            }
            catch (Exception ex)
            {
                // Never throw into the caller's path - there is none left; this runs on the
                // background worker. Log once as a permanent failure and stop retrying.
                _logger.LogError(ex,
                    "Gửi email thất bại vĩnh viễn sau {Attempts} lần. to={ToEmail} subject={Subject}",
                    attempt + 1, message.ToEmail, message.Subject);
                LogDelivery(message, "Failed", attempt);
                return;
            }
        }
    }

    private void LogDelivery(EmailMessage message, string status, int attempt)
    {
        _logger.LogInformation(
            "EmailDeliveryLog recipient={ToEmail} status={Status} attempts={Attempts}",
            message.ToEmail, status, attempt + 1);
    }
}
