using System.Net.Http.Headers;
using System.Net.Http.Json;
using Identity.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace IntegrationTests.Infrastructure;

/// <summary>Một tài khoản test đã đăng nhập thật qua <c>POST /api/auth/login</c>.</summary>
public sealed record TestAccount(string UserId, string Email, string Password, string Token, string RefreshToken);

/// <summary>
/// Tạo tài khoản test và lấy JWT bằng ĐÚNG luồng đăng nhập của sản phẩm.
///
/// Không tự ký token: token tự ký sẽ bỏ qua toàn bộ phần nạp claim quyền (AuthClaimsLoader),
/// nghĩa là ma trận phân quyền sẽ kiểm tra một thứ không tồn tại trong thực tế.
/// Mỗi tài khoản có email ngẫu nhiên nên test không phụ thuộc dữ liệu seed sẵn.
/// </summary>
public static class TestAuthentication
{
    private const string Password = "Qh#Test2026!x";

    private static readonly Dictionary<string, TestAccount> Cache = new();
    private static readonly SemaphoreSlim Gate = new(1, 1);

    /// <summary>Tài khoản dùng chung cho một role (tạo một lần cho cả collection).</summary>
    public static async Task<TestAccount> SharedAccountAsync(IntegrationTestFixture fixture, string role)
    {
        await Gate.WaitAsync();
        try
        {
            if (Cache.TryGetValue(role, out var cached)) return cached;
            var account = await CreateAccountAsync(fixture, role);
            Cache[role] = account;
            return account;
        }
        finally
        {
            Gate.Release();
        }
    }

    /// <summary>Tạo tài khoản mới (email ngẫu nhiên) mang <paramref name="role"/> rồi đăng nhập.</summary>
    public static async Task<TestAccount> CreateAccountAsync(
        IntegrationTestFixture fixture, string? role, string? password = null)
    {
        var email = $"it-{Guid.NewGuid():N}@test.local";
        var effectivePassword = password ?? Password;
        string userId;

        using (var scope = fixture.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                FullName = "Tài khoản kiểm thử",
                EmailConfirmed = true,
            };

            var created = await users.CreateAsync(user, effectivePassword);
            if (!created.Succeeded)
            {
                throw new InvalidOperationException(
                    "Không tạo được tài khoản test: " + string.Join(", ", created.Errors.Select(e => e.Description)));
            }

            if (!string.IsNullOrEmpty(role))
            {
                var assigned = await users.AddToRoleAsync(user, role);
                if (!assigned.Succeeded)
                {
                    throw new InvalidOperationException(
                        $"Không gán được role '{role}': " + string.Join(", ", assigned.Errors.Select(e => e.Description)));
                }
            }

            userId = user.Id;
        }

        var (token, refreshToken) = await LoginAsync(fixture, email, effectivePassword);
        return new TestAccount(userId, email, effectivePassword, token, refreshToken);
    }

    /// <summary>Đăng nhập thật; ném lỗi kèm nội dung phản hồi nếu không lấy được token.</summary>
    public static async Task<(string Token, string RefreshToken)> LoginAsync(
        IntegrationTestFixture fixture, string email, string password)
    {
        using var client = fixture.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/login", new { Email = email, Password = password });
        var body = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Đăng nhập thất bại ({(int)response.StatusCode}): {body}");
        }

        using var json = System.Text.Json.JsonDocument.Parse(body);
        var token = json.RootElement.GetProperty("token").GetString();
        // Refresh token chỉ còn trong cookie HttpOnly `qh_rt`, không bao giờ trong body.
        var refresh = RefreshCookieRequests.TokenFrom(response);

        if (string.IsNullOrEmpty(token))
        {
            throw new InvalidOperationException($"Phản hồi đăng nhập không có token: {body}");
        }

        return (token, refresh ?? "");
    }

    /// <summary>HttpClient đã gắn Bearer token.</summary>
    public static HttpClient ClientFor(IntegrationTestFixture fixture, TestAccount account)
    {
        var client = fixture.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", account.Token);
        return client;
    }
}
