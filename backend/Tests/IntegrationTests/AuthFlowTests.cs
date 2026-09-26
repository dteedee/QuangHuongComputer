using System.Net;
using System.Net.Http.Json;
using BuildingBlocks.Security;
using FluentAssertions;
using Identity.Infrastructure;
using IntegrationTests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace IntegrationTests;

/// <summary>
/// Vòng đời phiên đăng nhập: xoay refresh token, phát hiện dùng lại token đã xoay,
/// đăng xuất đóng cả thiết bị, và tài khoản bị vô hiệu hoá thì không đăng nhập được nữa.
///
/// Đây là những hành vi chỉ lộ ra khi chạy thật: chúng nằm ở ba lớp khác nhau
/// (endpoint, RefreshTokenService, bảng UserSessions) nên unit test từng lớp không chứng minh được.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public sealed class AuthFlowTests
{
    private readonly IntegrationTestFixture _fixture;

    public AuthFlowTests(IntegrationTestFixture fixture) => _fixture = fixture;

    [Fact(DisplayName = "Phiên: refresh sinh cặp token mới và token cũ hết hiệu lực ngay (xoay vòng)")]
    public async Task Refresh_XoayVongTokenCu()
    {
        var account = await TestAuthentication.CreateAccountAsync(_fixture, Roles.Customer);
        using var client = _fixture.CreateCookielessClient();

        var rotated = await RefreshCookieRequests.RefreshAsync(client, account.RefreshToken);
        rotated.StatusCode.Should().Be(HttpStatusCode.OK, await rotated.Content.ReadAsStringAsync());

        var newRefresh = RefreshCookieRequests.TokenFrom(rotated);
        newRefresh.Should().NotBeNullOrEmpty("refresh phải đặt cookie qh_rt mới");
        newRefresh.Should().NotBe(account.RefreshToken, "mỗi lần refresh phải sinh token mới, không trả lại token cũ");

        var reuseOld = await RefreshCookieRequests.RefreshAsync(client, account.RefreshToken);
        reuseOld.StatusCode.Should().Be(HttpStatusCode.BadRequest, "token đã xoay không được dùng lại");
    }

    [Fact(DisplayName = "Phiên: dùng lại token đã xoay sẽ giết cả họ token (token mới cũng chết)")]
    public async Task DungLaiTokenDaXoay_GietCaHoToken()
    {
        var account = await TestAuthentication.CreateAccountAsync(_fixture, Roles.Customer);
        using var client = _fixture.CreateCookielessClient();

        var rotated = await RefreshCookieRequests.RefreshAsync(client, account.RefreshToken);
        var newRefresh = RefreshCookieRequests.TokenFrom(rotated);

        // Kẻ trộm trình lại token cũ -> hệ thống phải coi cả họ token là đã lộ.
        await RefreshCookieRequests.RefreshAsync(client, account.RefreshToken);

        var afterReuse = await RefreshCookieRequests.RefreshAsync(client, newRefresh);
        afterReuse.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            "sau khi phát hiện dùng lại, token hợp lệ của cùng họ cũng phải bị thu hồi");
    }

    [Fact(DisplayName = "Phiên: đăng xuất làm refresh token hết hiệu lực")]
    public async Task DangXuat_ThuHoiRefreshToken()
    {
        var account = await TestAuthentication.CreateAccountAsync(_fixture, Roles.Customer);
        using var client = _fixture.CreateCookielessClient();

        var logout = await RefreshCookieRequests.LogoutAsync(client, account.RefreshToken);
        logout.StatusCode.Should().Be(HttpStatusCode.OK);

        var refresh = await RefreshCookieRequests.RefreshAsync(client, account.RefreshToken);
        refresh.StatusCode.Should().Be(HttpStatusCode.BadRequest, "đăng xuất rồi thì không refresh được nữa");
    }

    [Fact(DisplayName = "Phiên: tài khoản bị vô hiệu hoá không đăng nhập được và không refresh được")]
    public async Task TaiKhoanBiVoHieuHoa_KhongVaoDuoc()
    {
        var account = await TestAuthentication.CreateAccountAsync(_fixture, Roles.Customer);

        using (var scope = _fixture.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var user = await users.FindByIdAsync(account.UserId);
            user!.IsActive = false;
            (await users.UpdateAsync(user)).Succeeded.Should().BeTrue();
        }

        using var client = _fixture.CreateCookielessClient();

        var login = await client.PostAsJsonAsync("/api/auth/login",
            new { Email = account.Email, Password = account.Password });
        login.StatusCode.Should().Be(HttpStatusCode.BadRequest, "tài khoản bị khoá không được cấp token mới");

        var refresh = await RefreshCookieRequests.RefreshAsync(client, account.RefreshToken);
        refresh.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            "refresh token cũ không được kéo dài phiên của tài khoản đã bị vô hiệu hoá");
    }

    [Fact(DisplayName = "Phiên: sai mật khẩu trả lỗi chung, không lộ email có tồn tại hay không")]
    public async Task SaiMatKhau_KhongLoEmailTonTai()
    {
        var account = await TestAuthentication.CreateAccountAsync(_fixture, Roles.Customer);
        using var client = _fixture.CreateCookielessClient();

        var wrongPassword = await client.PostAsJsonAsync("/api/auth/login",
            new { Email = account.Email, Password = "Sai-Mat-Khau-9x!" });
        var unknownEmail = await client.PostAsJsonAsync("/api/auth/login",
            new { Email = $"khong-ton-tai-{Guid.NewGuid():N}@test.local", Password = "Sai-Mat-Khau-9x!" });

        wrongPassword.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        unknownEmail.StatusCode.Should().Be(wrongPassword.StatusCode,
            "email không tồn tại và sai mật khẩu phải trả cùng một mã trạng thái");
        (await wrongPassword.Content.ReadAsStringAsync())
            .Should().Be(await unknownEmail.Content.ReadAsStringAsync(),
                "hai trường hợp phải trả lời giống hệt nhau — khác nhau là để kẻ tấn công dò được email nào có thật");
    }
}
