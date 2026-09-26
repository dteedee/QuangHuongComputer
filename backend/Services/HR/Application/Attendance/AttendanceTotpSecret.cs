using Microsoft.Extensions.Configuration;

namespace HR.Application.Attendance;

/// <summary>
/// Nguồn DUY NHẤT của secret TOTP chấm công QR (<c>Hr:AttendanceTotpSecret</c>, biến môi trường
/// <c>Hr__AttendanceTotpSecret</c> ← <c>ATTENDANCE_TOTP_SECRET</c>).
///
/// Trước đây validator rơi về một hằng số nằm trong mã nguồn (và vẫn còn trong git history) khi
/// thiếu cấu hình — ai đọc repo cũng sinh được mã QR hợp lệ cho mọi chi nhánh, tức chấm công hộ
/// từ nhà. Nay KHÔNG có fallback: thiếu / placeholder / quá ngắn / trùng hằng số cũ đã lộ ⇒ coi như
/// chưa cấu hình, và chấm công QR bị TỪ CHỐI (fail-closed) thay vì chạy bằng khoá ai cũng biết.
/// </summary>
public static class AttendanceTotpSecret
{
    public const string ConfigKey = "Hr:AttendanceTotpSecret";

    /// <summary>Đủ entropy cho HMAC-SHA1; gen-secrets.sh sinh 48 ký tự.</summary>
    public const int MinimumLength = 32;

    /// <summary>
    /// Hằng số fallback cũ — đã công khai trong git history nên KHÔNG BAO GIỜ được chấp nhận làm
    /// secret nữa, kể cả khi ai đó chép nó vào cấu hình.
    /// </summary>
    private const string LeakedLegacySecret = "QuangHuongComputer2026-TOTP-Secret-DoNotShare";

    /// <summary>Secret hợp lệ, hoặc null khi chưa cấu hình đúng. Không bao giờ ném lỗi.</summary>
    public static string? Resolve(IConfiguration? configuration)
    {
        var raw = configuration?[ConfigKey];
        return Describe(raw) is null ? raw!.Trim() : null;
    }

    /// <summary>
    /// Lý do giá trị không dùng được (để log — KHÔNG chứa giá trị secret), hoặc null nếu hợp lệ.
    /// </summary>
    public static string? Describe(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return $"thiếu {ConfigKey}";

        var v = raw.Trim();
        if (v.Contains("${", StringComparison.Ordinal) || v.StartsWith("CHANGE_ME", StringComparison.OrdinalIgnoreCase))
            return $"{ConfigKey} vẫn là placeholder chưa thay";
        if (string.Equals(v, LeakedLegacySecret, StringComparison.Ordinal))
            return $"{ConfigKey} là hằng số cũ đã lộ trong mã nguồn — phải sinh giá trị mới";
        if (v.Length < MinimumLength)
            return $"{ConfigKey} quá ngắn ({v.Length} ký tự, cần tối thiểu {MinimumLength})";

        return null;
    }
}
