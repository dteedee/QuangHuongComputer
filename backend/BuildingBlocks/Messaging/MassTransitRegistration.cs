using MassTransit;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace BuildingBlocks.Messaging;

/// <summary>
/// The ONE place the RabbitMQ host gets configured (W1-5, phase-14 step 1).
///
/// Before this file: the bus config read "RabbitMQ:Host" + "RabbitMQ:VirtualHost" with the
/// username/password HARDCODED to "guest"/"guest", while the health check (ServiceRegistration.cs,
/// AddRabbitMQ) read the completely different key "ConnectionStrings:RabbitMQ". Two sources of
/// truth meant the health check could say "healthy" while the actual bus connected to the wrong
/// vhost with the wrong (hardcoded) credentials - exactly the Overview bug. There is now exactly
/// one source: "ConnectionStrings:RabbitMQ", an amqp(s):// URI carrying host/port/vhost/user/pass
/// together - MassTransit's own `cfg.Host(Uri)` overload parses all five out of it
/// (RabbitMqAddressExtensions.GetConfigurationHostSettings reads Uri.UserInfo for the credentials
/// and RabbitMqHostAddress.ParseLeft for host/port/vhost - verified against the v8.5.10 source).
/// </summary>
public static class MassTransitRegistration
{
    /// <summary>
    /// Resolves + validates "ConnectionStrings:RabbitMQ" and applies it as the bus host.
    /// Development falls back to the local broker default so `dotnet run` keeps working with an
    /// empty appsettings; Production throws instead of silently reusing that fallback (Overview:
    /// "MassTransit ignores the production RabbitMQ settings" must become a startup failure, not a
    /// silent connection to localhost/guest that nothing is listening on).
    /// </summary>
    public static void ConfigureHost(IRabbitMqBusFactoryConfigurator cfg, IConfiguration configuration, IHostEnvironment environment)
    {
        var connectionString = configuration.GetConnectionString("RabbitMQ");
        var isConfigured = !string.IsNullOrWhiteSpace(connectionString) && !LooksLikeUnexpandedPlaceholder(connectionString);

        if (!isConfigured)
        {
            if (!environment.IsDevelopment())
            {
                throw new InvalidOperationException(
                    "ConnectionStrings:RabbitMQ chưa được cấu hình (rỗng hoặc còn placeholder '${...}'). " +
                    "Từ chối khởi động thay vì âm thầm rơi về localhost/guest ở môi trường " +
                    $"'{environment.EnvironmentName}' - đây chính là lỗi D05/Overview đã ghi nhận.");
            }

            // Development only: same default the docker-compose dev stack exposes.
            connectionString = "amqp://guest:guest@localhost:5672/";
        }

        Uri hostUri;
        try
        {
            hostUri = new Uri(connectionString!);
        }
        catch (UriFormatException ex)
        {
            throw new InvalidOperationException(
                $"ConnectionStrings:RabbitMQ không phải URI amqp hợp lệ: '{connectionString}'.", ex);
        }

        // cfg.Host(Uri) parses scheme (amqp/amqps/rabbitmq/rabbitmqs), host, port, virtual host AND
        // the userinfo (username:password) from this single URI - no manual parsing, no hardcoded
        // guest/guest (verified against MassTransit.RabbitMqTransport source, v8.5.10).
        cfg.Host(hostUri, h =>
        {
            h.PublisherConfirmation = true;
        });
    }

    /// <summary>Same "not configured" rule as EmailOptions (D12): an un-expanded "${VAR}" is absence, not a value.</summary>
    static bool LooksLikeUnexpandedPlaceholder(string value) => value.Contains("${");
}
