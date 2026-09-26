using System.Text.Json;
using FluentAssertions;
using Identity.DTOs;
using Identity.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Xunit;

namespace UnitTests.Identity;

/// <summary>
/// Refresh token chỉ được rời server dưới dạng cookie HttpOnly. Các test này khoá đúng những
/// thuộc tính làm nên lớp bảo vệ: HttpOnly (script không đọc được), SameSite=Strict (CSRF),
/// Path=/api/auth (không đi kèm mọi request), Secure, và body JSON KHÔNG còn chứa refresh token.
/// </summary>
public class RefreshTokenCookieTests
{
    private sealed class FakeEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Production;
        public string ApplicationName { get; set; } = "Tests";
        public string ContentRootPath { get; set; } = ".";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private static DefaultHttpContext NewContext(string environment, bool https = false)
    {
        var services = new ServiceCollection()
            .AddSingleton<IHostEnvironment>(new FakeEnvironment { EnvironmentName = environment })
            .BuildServiceProvider();
        var context = new DefaultHttpContext { RequestServices = services };
        context.Request.Scheme = https ? "https" : "http";
        return context;
    }

    private static string SetCookie(HttpContext context) =>
        context.Response.Headers.SetCookie.ToString().ToLowerInvariant();

    private static LoginResponseDto Issued() => new()
    {
        Token = "access-jwt",
        RefreshToken = "refresh-secret",
        RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(14),
        User = new UserInfoDto { Id = "u1", Email = "a@b.vn", FullName = "A" },
    };

    [Fact(DisplayName = "Đăng nhập: đặt cookie qh_rt HttpOnly, SameSite=Strict, Path=/api/auth, Secure")]
    public void SignIn_DatCookieDungThuocTinh()
    {
        var context = NewContext(Environments.Production);

        var result = RefreshTokenCookie.SignIn(context, Issued());

        result.Should().BeOfType<Ok<LoginResponseDto>>();
        var header = SetCookie(context);
        header.Should().StartWith("qh_rt=refresh-secret");
        header.Should().Contain("httponly");
        header.Should().Contain("samesite=strict");
        header.Should().Contain("path=/api/auth");
        header.Should().Contain("secure");
        header.Should().Contain("expires=");
    }

    [Fact(DisplayName = "Body đăng nhập KHÔNG chứa refresh token (chỉ còn trong cookie)")]
    public void LoginResponse_KhongSerializeRefreshToken()
    {
        var json = JsonSerializer.Serialize(Issued(), new JsonSerializerOptions(JsonSerializerDefaults.Web));

        json.Should().Contain("\"token\":\"access-jwt\"");
        json.Should().NotContain("refresh-secret");
        json.Should().NotContainEquivalentOf("refreshToken");
    }

    [Fact(DisplayName = "Development qua HTTP (LAN): cookie không Secure; HTTPS thì luôn Secure")]
    public void Secure_TheoMoiTruongVaGiaoThuc()
    {
        var devHttp = NewContext(Environments.Development);
        RefreshTokenCookie.Write(devHttp, "t", DateTime.UtcNow.AddDays(1));
        SetCookie(devHttp).Should().NotContain("secure");

        var devHttps = NewContext(Environments.Development, https: true);
        RefreshTokenCookie.Write(devHttps, "t", DateTime.UtcNow.AddDays(1));
        SetCookie(devHttps).Should().Contain("secure");
    }

    [Fact(DisplayName = "Đăng xuất: cookie bị hết hạn với cùng Path, nếu không trình duyệt vẫn giữ")]
    public void Clear_HetHanCungPath()
    {
        var context = NewContext(Environments.Production);

        RefreshTokenCookie.Clear(context);

        var header = SetCookie(context);
        header.Should().StartWith("qh_rt=;");
        header.Should().Contain("expires=thu, 01 jan 1970");
        header.Should().Contain("path=/api/auth");
        header.Should().Contain("samesite=strict");
    }

    [Theory(DisplayName = "Đọc cookie: trả giá trị, hoặc null khi thiếu/rỗng")]
    [InlineData("qh_rt=abc", "abc")]
    [InlineData("other=1", null)]
    [InlineData("qh_rt=", null)]
    public void Read_DocCookie(string cookieHeader, string? expected)
    {
        var context = NewContext(Environments.Production);
        context.Request.Headers.Cookie = cookieHeader;

        RefreshTokenCookie.Read(context).Should().Be(expected);
    }
}
