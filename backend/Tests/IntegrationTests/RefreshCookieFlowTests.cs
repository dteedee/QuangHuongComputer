using System.Net;
using System.Net.Http.Json;
using BuildingBlocks.Security;
using FluentAssertions;
using IntegrationTests.Infrastructure;
using Xunit;

namespace IntegrationTests;

/// <summary>
/// Hợp đồng cookie của refresh token trên ApiGateway thật: đăng nhập đặt cookie HttpOnly và
/// body không còn refresh token; refresh đọc cookie và xoay cookie; thiếu header chống CSRF thì
/// không xoay; đăng xuất xoá cookie và giết phiên.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public sealed class RefreshCookieFlowTests
{
    private readonly IntegrationTestFixture _fixture;

    public RefreshCookieFlowTests(IntegrationTestFixture fixture) => _fixture = fixture;

    [Fact(DisplayName = "Cookie: đăng nhập đặt qh_rt HttpOnly/SameSite=Strict/Path=/api/auth, body không có refresh token")]
    public async Task DangNhap_DatCookieVaBodyKhongCoRefreshToken()
    {
        var account = await TestAuthentication.CreateAccountAsync(_fixture, Roles.Customer);
        using var client = _fixture.CreateCookielessClient();

        var login = await client.PostAsJsonAsync("/api/auth/login", new { account.Email, account.Password });
        var body = await login.Content.ReadAsStringAsync();

        login.StatusCode.Should().Be(HttpStatusCode.OK, body);
        body.Should().Contain("\"token\"").And.NotContainEquivalentOf("refreshToken");

        var cookie = RefreshCookieRequests.SetCookieHeader(login)?.ToLowerInvariant();
        cookie.Should().NotBeNull("đăng nhập phải đặt cookie qh_rt");
        cookie.Should().Contain("httponly").And.Contain("samesite=strict").And.Contain("path=/api/auth");
        RefreshCookieRequests.TokenFrom(login).Should().NotBeNullOrEmpty();
    }

    [Fact(DisplayName = "Cookie: refresh đọc cookie, trả access token mới và xoay cookie")]
    public async Task Refresh_DocCookieVaXoayCookie()
    {
        var account = await TestAuthentication.CreateAccountAsync(_fixture, Roles.Customer);
        using var client = _fixture.CreateCookielessClient();

        var refreshed = await RefreshCookieRequests.RefreshAsync(client, account.RefreshToken);
        var body = await refreshed.Content.ReadAsStringAsync();

        refreshed.StatusCode.Should().Be(HttpStatusCode.OK, body);
        body.Should().Contain("\"token\"").And.Contain("\"user\"").And.NotContainEquivalentOf("refreshToken");
        var rotated = RefreshCookieRequests.TokenFrom(refreshed);
        rotated.Should().NotBeNullOrEmpty().And.NotBe(account.RefreshToken);
    }

    [Fact(DisplayName = "Cookie: refresh THIẾU header X-Requested-With bị chặn và KHÔNG xoay token (CSRF)")]
    public async Task Refresh_ThieuHeaderCsrf_BiChan()
    {
        var account = await TestAuthentication.CreateAccountAsync(_fixture, Roles.Customer);
        using var client = _fixture.CreateCookielessClient();

        var forged = await RefreshCookieRequests.RefreshAsync(client, account.RefreshToken, withCsrfHeader: false);
        forged.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        RefreshCookieRequests.SetCookieHeader(forged).Should().BeNull("request bị chặn không được đụng tới cookie");

        // Token vẫn còn nguyên: nếu request giả mạo đã xoay nó, lần này sẽ bị coi là dùng lại.
        var genuine = await RefreshCookieRequests.RefreshAsync(client, account.RefreshToken);
        genuine.StatusCode.Should().Be(HttpStatusCode.OK, await genuine.Content.ReadAsStringAsync());
    }

    [Fact(DisplayName = "Cookie: refresh không cookie -> 400; token trong body bị bỏ qua")]
    public async Task Refresh_KhongCookie_BoQuaBody()
    {
        var account = await TestAuthentication.CreateAccountAsync(_fixture, Roles.Customer);
        using var client = _fixture.CreateCookielessClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh-token")
        {
            Content = JsonContent.Create(new { refreshToken = account.RefreshToken }),
        };
        request.Headers.Add("X-Requested-With", "XMLHttpRequest");

        var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            "refresh token chỉ được nhận qua cookie HttpOnly, không qua body");
    }

    [Fact(DisplayName = "Cookie: đăng xuất xoá cookie và refresh token cũ chết hẳn")]
    public async Task DangXuat_XoaCookie()
    {
        var account = await TestAuthentication.CreateAccountAsync(_fixture, Roles.Customer);
        using var client = _fixture.CreateCookielessClient();

        var logout = await RefreshCookieRequests.LogoutAsync(client, account.RefreshToken);

        logout.StatusCode.Should().Be(HttpStatusCode.OK);
        var cleared = RefreshCookieRequests.SetCookieHeader(logout)?.ToLowerInvariant();
        cleared.Should().NotBeNull().And.StartWith("qh_rt=;").And.Contain("expires=thu, 01 jan 1970").And.Contain("path=/api/auth");

        var refresh = await RefreshCookieRequests.RefreshAsync(client, account.RefreshToken);
        refresh.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
