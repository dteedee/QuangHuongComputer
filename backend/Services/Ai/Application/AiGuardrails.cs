using System.Text.RegularExpressions;

namespace Ai.Application;

/// <summary>
/// W2-15: replaces the old flat keyword blocklist (`internal, nội bộ, employee, nhân viên,
/// salary, lương, confidential, bí mật, password, mật khẩu, admin, database`), which blocked
/// legitimate questions on nothing but substring match - "Tư vấn laptop cho NHÂN VIÊN văn
/// phòng tầm 15 triệu" (the exact phrase in this phase's Success Criteria) hit "nhân viên" and
/// was refused. The assistant has no tools and no write access (Security Considerations), so the
/// real risk is prompt injection trying to make it ignore its system prompt or claim to reveal
/// internal/credential data - not a customer mentioning an employee in a shopping question. Guard
/// narrowly on that intent; leave "stay on topic" to the system prompt itself.
/// </summary>
public static class AiGuardrails
{
    private static readonly Regex[] InjectionOrExfiltrationPatterns =
    {
        // "ignore/bypass your instructions/system prompt"
        new(@"(bỏ\s*qua|phớt\s*lờ|ignore|bypass|disregard)\s+(mọi\s+)?(chỉ\s*dẫn|hướng\s*dẫn|instructions?|system\s*prompt|quy\s*tắc|rules?)", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        // asking to role-play as an unrestricted/admin system
        new(@"(bạn\s+(bây\s*giờ\s+)?là|act\s+as|you\s+are\s+now)\s+.*(admin|quản\s*trị|không\s*giới\s*hạn|unrestricted|dan\b)", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        // asking for someone's credentials/password directly
        new(@"(mật\s*khẩu|password)\s+(của|admin|quản\s*trị|hệ\s*thống|nhân\s*viên|khách\s*hàng)", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        // asking to dump internal/db schema or API keys
        new(@"(cấu\s*trúc|schema|dump|xuất)\s+(cơ\s*sở\s*dữ\s*liệu|database|csdl|bảng)", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new(@"\bapi\s*key\b.*(nội\s*bộ|internal|hệ\s*thống|admin)", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        // asking for another employee's/customer's confidential personal data (salary, etc.)
        new(@"(lương|salary|thu\s*nhập)\s+(của|nhân\s*viên|nội\s*bộ)", RegexOptions.IgnoreCase | RegexOptions.Compiled),
    };

    /// <summary>True only for a narrow, explicit attempt to break the assistant's guardrails or
    /// extract internal/credential data - never for an ordinary product question that merely
    /// contains a word like "nhân viên" or "admin".</summary>
    public static bool IsPromptInjectionOrExfiltrationAttempt(string question)
        => InjectionOrExfiltrationPatterns.Any(p => p.IsMatch(question));

    /// <summary>
    /// True when the Gemini key looks like an actual secret rather than an empty value or an
    /// unresolved placeholder (`${AI__GEMINI__APIKEY}`, `your-api-key-here`, `changeme`, ...).
    /// Before this check, an unresolved `${...}` placeholder was treated as "configured" and every
    /// call to Gemini failed with an opaque error instead of using the graceful fallback path.
    /// </summary>
    public static bool IsConfiguredApiKey(string? apiKey)
    {
        if (string.IsNullOrWhiteSpace(apiKey)) return false;
        var trimmed = apiKey.Trim();
        if (trimmed.Contains("${") || trimmed.Contains("}")) return false;
        if (trimmed.StartsWith("your-", StringComparison.OrdinalIgnoreCase)) return false;
        if (trimmed.Equals("changeme", StringComparison.OrdinalIgnoreCase)) return false;
        if (trimmed.Equals("changeit", StringComparison.OrdinalIgnoreCase)) return false;
        if (trimmed.Length < 8) return false; // real Gemini keys are much longer; too short = placeholder/typo
        return true;
    }

    /// <summary>Hard cap on question length (chat + AI endpoints) - guards against pathological
    /// prompts inflating token cost or hammering the DB retrieval path.</summary>
    public const int MaxQuestionLength = 1000;
}
