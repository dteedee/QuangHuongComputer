using System.Text;
using Microsoft.Extensions.Configuration;

namespace Identity.Services;

/// <summary>
/// W4-5 / M11 — nguồn DUY NHẤT của khoá ký JWT.
///
/// Trước đây cả <c>AddIdentityModule</c> lẫn <c>JwtTokenFactory</c> đều viết
/// <c>jwtSettings["Key"] ?? "super_secret_key_1234567890123456"</c>: đúng 32 ký tự ASCII, tức là
/// một khoá HS256 HỢP LỆ nằm trong mã nguồn. Hôm nay nó là code chết chỉ vì base appsettings đặt
/// <c>"Key": ""</c> (rỗng khác null, và khoá rỗng làm <c>SymmetricSecurityKey</c> ném lúc khởi
/// động). Xoá đúng một dòng cấu hình rỗng đó là khoá ai đọc repo cũng biết được nạp lại IM LẶNG,
/// và ai cũng ký được token admin.
///
/// Nay: không có fallback, và thiếu/yếu khoá thì API KHÔNG khởi động được — cùng triết lý
/// fail-closed với <c>WebhookSignature</c> (rỗng/placeholder ⇒ 503 chứ không bỏ qua xác thực).
/// </summary>
public static class JwtSigningKeyResolver
{
    /// <summary>HS256 cần khoá tối thiểu 256 bit = 32 byte.</summary>
    public const int MinimumKeyLength = 32;

    public static byte[] ResolveBytes(IConfiguration configuration)
        => Encoding.ASCII.GetBytes(Resolve(configuration));

    public static string Resolve(IConfiguration configuration)
    {
        var key = configuration.GetSection("Jwt")["Key"];

        if (string.IsNullOrWhiteSpace(key))
            throw new InvalidOperationException(
                "Thiếu cấu hình Jwt:Key. Đặt biến môi trường Jwt__Key (tối thiểu " +
                $"{MinimumKeyLength} ký tự) trước khi khởi động API — không có khoá mặc định.");

        // Placeholder chưa được thay (`${JWT_SECRET_KEY}`) là "chưa cấu hình", không phải khoá.
        if (key.StartsWith("${", StringComparison.Ordinal) && key.EndsWith('}'))
            throw new InvalidOperationException(
                $"Jwt:Key vẫn là placeholder chưa thay ({key}). Nạp giá trị thật từ môi trường.");

        if (key.Length < MinimumKeyLength)
            throw new InvalidOperationException(
                $"Jwt:Key quá ngắn ({key.Length} ký tự); HS256 cần tối thiểu {MinimumKeyLength}.");

        return key;
    }
}
