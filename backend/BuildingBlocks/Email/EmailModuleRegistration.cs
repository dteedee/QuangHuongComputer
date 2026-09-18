using System.Threading.Channels;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BuildingBlocks.Email;

/// <summary>Wires the whole queued-email pipeline in one call (ApiGateway/ServiceRegistration.cs).</summary>
public static class EmailModuleRegistration
{
    public static IServiceCollection AddQuangHuongEmail(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<EmailOptions>(configuration.GetSection(EmailOptions.SectionName));

        // Single reader (the background service); many writers (any request/consumer thread).
        services.AddSingleton(Channel.CreateUnbounded<EmailMessage>(new UnboundedChannelOptions { SingleReader = true }));

        services.AddSingleton<IEmailTransport, SmtpEmailSender>();
        services.AddSingleton<IEmailSender, QueuedEmailSender>();
        services.AddHostedService<QueuedEmailBackgroundService>();

        services.AddSingleton<IEmailService, EmailService>();

        return services;
    }
}
