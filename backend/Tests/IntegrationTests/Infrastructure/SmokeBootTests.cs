using FluentAssertions;
using IntegrationTests.Infrastructure;
using Xunit;

namespace IntegrationTests;

/// <summary>Kiểm tra bộ khung: host dựng được và /health/live trả 200.</summary>
[Collection(IntegrationTestCollection.Name)]
public sealed class SmokeBootTests
{
    private readonly IntegrationTestFixture _fixture;

    public SmokeBootTests(IntegrationTestFixture fixture) => _fixture = fixture;

    [Fact(DisplayName = "Host test khởi động được và /health/live trả 200")]
    public async Task HealthLive_TraVe200()
    {
        var client = _fixture.CreateClient();

        var response = await client.GetAsync("/health/live");

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
    }
}
