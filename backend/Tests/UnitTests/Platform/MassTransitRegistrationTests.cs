using BuildingBlocks.Messaging;
using FluentAssertions;
using MassTransit;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Xunit;

namespace UnitTests.Platform;

/// <summary>
/// Overview bug this track fixes: "MassTransit ignores the production RabbitMQ settings (falls
/// back to localhost/guest) while the health check reports healthy." These prove the fallback is
/// gone in every non-Development environment - a missing/placeholder ConnectionStrings:RabbitMQ
/// is now a startup failure, not a silent connection to nothing.
/// </summary>
public class MassTransitRegistrationTests
{
    private static IConfiguration ConfigWithRabbitMq(string? value)
    {
        var data = new Dictionary<string, string?>();
        if (value is not null) data["ConnectionStrings:RabbitMQ"] = value;
        return new ConfigurationBuilder().AddInMemoryCollection(data).Build();
    }

    private sealed class FakeEnvironment(string name) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = name;
        public string ApplicationName { get; set; } = "Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } = null!;
    }

    [Fact]
    public void MissingConnectionString_InProduction_Throws()
    {
        var configuration = ConfigWithRabbitMq(null);
        var environment = new FakeEnvironment(Environments.Production);

        var act = () => MassTransitRegistration.ConfigureHost(cfg: null!, configuration, environment);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*ConnectionStrings:RabbitMQ*");
    }

    [Fact]
    public void UnexpandedPlaceholder_InProduction_Throws()
    {
        // D12: "Email:Smtp:Password is currently the literal string ${SMTP_PASSWORD}" - the same
        // failure mode applies to RabbitMQ if a deploy ever forgets to set the env var.
        var configuration = ConfigWithRabbitMq("${ConnectionStrings__RabbitMQ}");
        var environment = new FakeEnvironment(Environments.Production);

        var act = () => MassTransitRegistration.ConfigureHost(cfg: null!, configuration, environment);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*placeholder*");
    }

    [Fact]
    public void EmptyConnectionString_InStaging_Throws()
    {
        // Any non-Development environment must fail fast, not only "Production" by name.
        var configuration = ConfigWithRabbitMq("");
        var environment = new FakeEnvironment("Staging");

        var act = () => MassTransitRegistration.ConfigureHost(cfg: null!, configuration, environment);

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void MalformedUri_Throws_WithClearMessage()
    {
        var configuration = ConfigWithRabbitMq("not a uri at all");
        var environment = new FakeEnvironment(Environments.Development);

        var act = () => MassTransitRegistration.ConfigureHost(cfg: null!, configuration, environment);

        act.Should().Throw<InvalidOperationException>().WithMessage("*URI*");
    }
}
