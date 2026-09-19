using ApiGateway.Startup;
// TEntryPoint chỉ dùng để trỏ tới assembly chứa entry point (Program là top-level statement,
// lớp sinh ra là internal nên không dùng trực tiếp được).
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Testcontainers.PostgreSql;
using Xunit;

namespace IntegrationTests.Infrastructure;

/// <summary>
/// Một container PostgreSQL + một host ApiGateway dùng chung cho cả collection.
/// Dựng container tốn ~5s và ngốn RAM, nên tuyệt đối không dựng theo từng test class.
/// </summary>
public sealed class IntegrationTestFixture : IAsyncLifetime
{
    private const string DatabaseName = "qh_integration";

    private PostgreSqlContainer _postgres = default!;
    private WebApplicationFactory<ApiGateway.GatewayChatRequest> _factory = default!;

    public IServiceProvider Services => _factory.Services;

    public string PostgresConnectionString { get; private set; } = "";

    public HttpClient CreateClient() => _factory.CreateClient(new WebApplicationFactoryClientOptions
    {
        AllowAutoRedirect = false,
    });

    /// <summary>Mở scope DI mới (mỗi test tự quản DbContext của mình).</summary>
    public IServiceScope CreateScope() => Services.CreateScope();

    public async Task InitializeAsync()
    {
        // Ryuk (container dọn rác của Testcontainers) bị tắt có chủ đích: máy này đang chạy 20+
        // container của chủ máy, không cho phép bất kỳ tiến trình reaper nào lảng vảng.
        Environment.SetEnvironmentVariable("TESTCONTAINERS_RYUK_DISABLED", "true");

        _postgres = new PostgreSqlBuilder()
            .WithImage("postgres:16")
            .WithDatabase(DatabaseName)
            .WithUsername("postgres")
            .WithPassword("postgres")
            .WithCleanUp(true)
            .Build();

        await _postgres.StartAsync();

        PostgresConnectionString = _postgres.GetConnectionString() + ";Include Error Detail=true";
        DatabaseSafetyGuard.AssertIsThrowawayContainer(
            PostgresConnectionString, DatabaseName, _postgres.GetMappedPublicPort(5432));

        var overrides = IntegrationTestConfiguration.Build(PostgresConnectionString);

        // Đặt qua BIẾN MÔI TRƯỜNG chứ không chỉ ConfigureAppConfiguration: các module đọc
        // configuration.GetConnectionString(...) NGAY LÚC ĐĂNG KÝ DI (Catalog/DependencyInjection.cs:16)
        // trên builder.Configuration của chính ứng dụng — callback ConfigureAppConfiguration của
        // WebApplicationFactory chạy sau đó, nên override kiểu đó KHÔNG tới kịp (đã đo: guard bắt
        // được DbContext vẫn trỏ vào quanghuongdb). Provider biến môi trường thì có mặt ngay từ
        // WebApplication.CreateBuilder.
        foreach (var (key, value) in overrides)
        {
            Environment.SetEnvironmentVariable(key.Replace(":", "__"), value);
        }

        _factory = new WebApplicationFactory<ApiGateway.GatewayChatRequest>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseContentRoot(TestRepositoryPaths.ApiGatewayContentRoot);
                builder.UseEnvironment("Development");
                builder.ConfigureAppConfiguration(cfg => cfg.AddInMemoryCollection(overrides));
                builder.ConfigureLogging(logging => logging.SetMinimumLevel(LogLevel.Warning));
            });

        // Ép host khởi động ngay tại đây (migration chạy trong lúc khởi động).
        _ = _factory.Services;

        AssertEveryContextPointsAtTheContainer();

        // Nạp dữ liệu nền (profile reference) MỘT lần cho cả collection. Số dòng thay đổi của
        // lần nạp đầu được giữ lại để test tính idempotent so sánh với lần nạp thứ hai.
        using var scope = CreateScope();
        FirstSeedChangeCount = await DatabaseMigrationRunner.RunSeedAsync(
            scope.ServiceProvider,
            scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("seed"),
            DatabaseMigrationRunner.ReferenceProfile,
            scope.ServiceProvider.GetRequiredService<IHostEnvironment>(),
            throwOnFailure: true);
    }

    /// <summary>Số dòng lần nạp seed đầu tiên đã thay đổi (dùng cho test idempotent).</summary>
    public int FirstSeedChangeCount { get; private set; }

    /// <summary>Chạy lại seed profile reference và trả về số dòng thay đổi.</summary>
    public async Task<int> RunReferenceSeedAsync()
    {
        using var scope = CreateScope();
        return await DatabaseMigrationRunner.RunSeedAsync(
            scope.ServiceProvider,
            scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("seed"),
            DatabaseMigrationRunner.ReferenceProfile,
            scope.ServiceProvider.GetRequiredService<IHostEnvironment>(),
            throwOnFailure: true);
    }

    public async Task DisposeAsync()
    {
        _factory?.Dispose();
        if (_postgres is not null)
        {
            await _postgres.DisposeAsync();
        }
    }

    /// <summary>
    /// Sau khi host dựng xong: kiểm tra lại chuỗi kết nối THỰC TẾ của từng DbContext.
    /// Nếu một override nào đó không thắng, test phải chết ở đây chứ không phải sau khi đã ghi dữ liệu.
    /// </summary>
    private void AssertEveryContextPointsAtTheContainer()
    {
        using var scope = CreateScope();
        var port = _postgres.GetMappedPublicPort(5432);

        foreach (var context in DatabaseMigrationRunner.ResolveAllContexts(scope.ServiceProvider))
        {
            DatabaseSafetyGuard.AssertIsThrowawayContainer(
                context.Database.GetConnectionString() ?? "", DatabaseName, port);
        }
    }
}

[CollectionDefinition(IntegrationTestCollection.Name)]
public sealed class IntegrationTestCollection : ICollectionFixture<IntegrationTestFixture>
{
    public const string Name = "qh-integration";
}
