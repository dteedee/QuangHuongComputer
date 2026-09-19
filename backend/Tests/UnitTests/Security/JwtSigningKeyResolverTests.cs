using FluentAssertions;
using Identity.Services;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace UnitTests.Security;

/// <summary>
/// W4-5 / M11 — khoá ký JWT không được có giá trị mặc định trong mã nguồn.
///
/// Bản cũ dùng <c>?? "super_secret_key_1234567890123456"</c> ở hai nơi: đúng 32 ký tự ASCII,
/// một khoá HS256 hợp lệ mà ai đọc repo cũng biết. Chỉ cần một môi trường không đặt Jwt:Key là
/// khoá đó được nạp IM LẶNG. Nay thiếu/yếu khoá thì ném ngay lúc khởi động.
/// </summary>
public class JwtSigningKeyResolverTests
{
    private static IConfiguration Config(string? key) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Jwt:Key"] = key })
            .Build();

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void ThieuKhoa_ThiNem(string? key)
    {
        var act = () => JwtSigningKeyResolver.Resolve(Config(key));
        act.Should().Throw<InvalidOperationException>().WithMessage("*Jwt:Key*");
    }

    [Fact]
    public void KhoaNganHonHS256_ThiNem()
    {
        var act = () => JwtSigningKeyResolver.Resolve(Config("qua_ngan_31_ky_tu_aaaaaaaaaaaaa"));
        act.Should().Throw<InvalidOperationException>().WithMessage("*quá ngắn*");
    }

    [Fact]
    public void PlaceholderChuaThay_ThiNem()
    {
        var act = () => JwtSigningKeyResolver.Resolve(Config("${JWT_SECRET_KEY}"));
        act.Should().Throw<InvalidOperationException>().WithMessage("*placeholder*");
    }

    [Fact]
    public void KhongConKhoaMacDinhTrongMaNguon()
    {
        // Không có cấu hình nào ⇒ phải NÉM, tuyệt đối không rơi về một khoá dựng sẵn.
        var empty = new ConfigurationBuilder().Build();
        var act = () => JwtSigningKeyResolver.Resolve(empty);
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void KhoaDuManh_ThiTraVeNguyenVan()
    {
        const string key = "quanghuong_secret_key_must_be_at_least_32_chars_long_for_hs256";
        JwtSigningKeyResolver.Resolve(Config(key)).Should().Be(key);
        JwtSigningKeyResolver.ResolveBytes(Config(key)).Length.Should().Be(key.Length);
    }
}
