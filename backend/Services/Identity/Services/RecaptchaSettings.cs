using Microsoft.Extensions.Configuration;

namespace Identity.Services;

/// <summary>
/// Cấu hình reCAPTCHA v3 phía server (section <c>Recaptcha</c>).
///
///   Recaptcha:Enabled   — mặc định TRUE. Chỉ <c>false</c> tường minh mới tắt được kiểm tra.
///   Recaptcha:SecretKey — secret key của site (biến môi trường RECAPTCHA_SECRET_KEY).
///   Recaptcha:MinScore  — ngưỡng điểm v3, mặc định 0.5.
///
/// Không bao giờ chấp nhận secret thử nghiệm công khai của Google (luôn trả success) — nó bị coi
/// là "chưa cấu hình", giống placeholder <c>${...}</c> / <c>CHANGE_ME*</c>.
/// </summary>
public sealed record RecaptchaSettings(bool Enabled, string? SecretKey, double MinScore)
{
    public const string SectionName = "Recaptcha";

    /// <summary>Secret test công khai của Google — siteverify LUÔN trả success với nó.</summary>
    public const string GoogleTestSecretKey = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";

    public const double DefaultMinScore = 0.5;

    /// <summary>Secret dùng được thật (không rỗng, không placeholder, không phải key test).</summary>
    public bool HasUsableSecret => IsUsableSecret(SecretKey);

    public static RecaptchaSettings From(IConfiguration configuration)
    {
        var section = configuration.GetSection(SectionName);
        var enabled = !bool.TryParse(section["Enabled"], out var parsed) || parsed;
        var minScore = double.TryParse(section["MinScore"], System.Globalization.NumberStyles.Float,
            System.Globalization.CultureInfo.InvariantCulture, out var s) ? s : DefaultMinScore;
        return new RecaptchaSettings(enabled, section["SecretKey"]?.Trim(), minScore);
    }

    public static bool IsUsableSecret(string? secret)
    {
        if (string.IsNullOrWhiteSpace(secret)) return false;
        var v = secret.Trim();
        if (v.Contains("${", StringComparison.Ordinal)) return false;
        if (v.StartsWith("CHANGE_ME", StringComparison.OrdinalIgnoreCase)) return false;
        return !string.Equals(v, GoogleTestSecretKey, StringComparison.Ordinal);
    }
}
