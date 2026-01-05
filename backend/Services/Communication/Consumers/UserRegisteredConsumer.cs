using BuildingBlocks.Messaging.IntegrationEvents;
using MassTransit;

namespace Communication.Consumers;

public class UserRegisteredConsumer(IEmailService emailService) : IConsumer<UserRegisteredIntegrationEvent>
{
    public async Task Consume(ConsumeContext<UserRegisteredIntegrationEvent> context)
    {
        var user = context.Message;
        var subject = "Welcome to Quang Huong Computer";
        var body = $"<h1>Welcome, {user.FullName}!</h1><p>Thank you for registering properly.</p>";

        await emailService.SendEmailAsync(user.Email, subject, body);
    }
}
