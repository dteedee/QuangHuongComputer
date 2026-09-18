namespace BuildingBlocks.Email;

/// <summary>
/// Enqueue-only contract: hands a message to the background queue and returns immediately.
/// Never throws for a downstream SMTP failure - that failure happens later, on the background
/// worker, long after the caller (an HTTP request or a MassTransit consumer) has moved on. This
/// is the interface published first (phase-14 step 7) so other tracks can code against it.
/// </summary>
public interface IEmailSender
{
    ValueTask QueueAsync(EmailMessage message, CancellationToken cancellationToken = default);
}
