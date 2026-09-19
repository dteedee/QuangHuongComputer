using Microsoft.Extensions.Configuration;

namespace IntegrationTests.Infrastructure;

/// <summary>
/// Sinh bộ cấu hình override cho host test.
///
/// Nguyên tắc (D12): Postgres là container tạm do test tự dựng; Redis dùng database 1 với prefix
/// riêng; RabbitMQ dùng vhost qh-test; JWT là khoá ngẫu nhiên mỗi lần chạy nên token của test
/// vô giá trị với API :5000 của chủ máy; SMTP trỏ MailHog.
/// </summary>
public static class IntegrationTestConfiguration
{
    public const string RedisInstanceName = "qh-it:";
    public const string RabbitVirtualHost = "qh-test";

    /// <summary>Khoá HMAC webhook SePay dùng riêng cho test.</summary>
    public const string SePayWebhookSecret = "qh-test-sepay-webhook-secret";

    /// <summary>API key webhook SePay dùng riêng cho test.</summary>
    public const string SePayApiKey = "qh-test-sepay-api-key";

    public static Dictionary<string, string?> Build(string postgresConnectionString)
    {
        var appSettings = LoadApiGatewaySettings();
        var redis = WithRedisDatabaseOne(appSettings["Redis:ConnectionString"] ?? "localhost:6379");

        return new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = postgresConnectionString,
            ["ConnectionStrings:RabbitMQ"] = $"amqp://guest:guest@localhost:5672/{RabbitVirtualHost}",
            ["ConnectionStrings:Redis"] = redis,
            ["RabbitMQ:VirtualHost"] = RabbitVirtualHost,
            ["Redis:ConnectionString"] = redis,
            ["Redis:InstanceName"] = RedisInstanceName,
            ["Jwt:Key"] = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(48)),
            ["Jwt:Issuer"] = "QuangHuongComputer",
            ["Jwt:Audience"] = "QuangHuongComputer",
            // Host tự chạy migration khi khởi động: đó chính là bài test "cài mới từ DB rỗng".
            ["Database:AutoMigrate"] = "true",
            ["Database:AutoSeed"] = "false",
            ["Email:Smtp:Host"] = "localhost",
            ["Email:Smtp:Port"] = "1025",
            ["Email:Smtp:EnableSsl"] = "false",
            ["Email:SmtpHost"] = "localhost",
            ["Email:SmtpPort"] = "1025",
            // Test gọi liên tiếp hàng trăm request; giới hạn tốc độ của production sẽ làm nhiễu.
            ["RateLimiting:PermitLimit"] = "100000",
            ["RateLimiting:AuthenticatedPermitLimit"] = "100000",
            // Policy "auth" mặc định chỉ 10 request/phút: bộ test đăng nhập hàng chục lần.
            ["RateLimiting:Policies:auth:PermitLimit"] = "100000",
            ["RateLimiting:Policies:lookup:PermitLimit"] = "100000",
            ["RateLimiting:Policies:contact:PermitLimit"] = "100000",
            ["RateLimiting:Policies:ai:PermitLimit"] = "100000",
            // Khoá webhook SePay chỉ dùng trong test (D04): có khoá thì endpoint phải kiểm chữ ký
            // thật sự — chưa cấu hình thì nó trả 503 và không kiểm chứng được gì.
            ["Payment:SePay:WebhookSecret"] = SePayWebhookSecret,
            ["Payment:SePay:ApiKey"] = SePayApiKey,
        };
    }

    /// <summary>Đọc appsettings của ApiGateway để lấy chuỗi Redis thật (không đụng tới file .env).</summary>
    private static IConfigurationRoot LoadApiGatewaySettings() =>
        new ConfigurationBuilder()
            .SetBasePath(TestRepositoryPaths.ApiGatewayContentRoot)
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

    /// <summary>Ép mọi thao tác Redis sang database 1 — database 0 là của môi trường dev.</summary>
    private static string WithRedisDatabaseOne(string connectionString) =>
        connectionString.Contains("defaultDatabase=", StringComparison.OrdinalIgnoreCase)
            ? connectionString
            : $"{connectionString},defaultDatabase=1";
}
