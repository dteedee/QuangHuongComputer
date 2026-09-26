using System.Text;

namespace Content.Domain;

/// <summary>
/// Pure normalisation + validation rules for redirect paths — no DB, fully unit-testable.
///
/// Key form (what <see cref="UrlRedirect.FromPath"/> stores and what the shell looks up):
/// leading "/", percent-decoded, lowercase (invariant), no query/fragment, no duplicate slashes,
/// no trailing slash. ASP.NET hands the shell an already-decoded route value, so storing the decoded
/// form is what lets "/may-tinh-%C4%91e" and "/máy-tính-đe" hit the same row.
/// </summary>
public static class UrlRedirectPath
{
    /// <summary>
    /// Prefixes the edge (deploy/Caddyfile) never rewrites to `/_shell`, plus the back office: a
    /// redirect there would either never fire or lock staff out of the admin SPA.
    /// </summary>
    private static readonly string[] ReservedPrefixes =
        { "/api", "/_shell", "/hubs", "/media", "/uploads", "/health", "/assets", "/backoffice" };

    private static readonly string[] ReservedExactPaths = { "/sitemap.xml", "/robots.txt" };

    /// <summary>The Caddyfile `@assets` matcher: these extensions are served from disk and never reach the shell.</summary>
    private static readonly string[] StaticAssetExtensions =
        { ".js", ".css", ".svg", ".woff2", ".png", ".jpg", ".webp", ".ico" };

    /// <summary>Lenient lookup key for ANY incoming path (the shell's hot path) — never throws, never validates.</summary>
    public static string ToKey(string? input)
    {
        var raw = (input ?? string.Empty).Trim();
        if (raw.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || raw.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            // Old-site exports usually carry full URLs; only the path survives a domain move.
            if (Uri.TryCreate(raw, UriKind.Absolute, out var absolute)) raw = absolute.AbsolutePath;
        }

        var cut = raw.IndexOfAny(new[] { '?', '#' });
        if (cut >= 0) raw = raw[..cut];

        raw = Uri.UnescapeDataString(raw).ToLowerInvariant();

        var sb = new StringBuilder(raw.Length + 1);
        sb.Append('/');
        foreach (var c in raw)
        {
            if (c == '/' && sb[^1] == '/') continue;
            sb.Append(c);
        }

        if (sb.Length > 1 && sb[^1] == '/') sb.Length--;
        return sb.ToString();
    }

    /// <summary>Validates and normalises a SOURCE path. Returns false with a Vietnamese reason.</summary>
    public static bool TryNormalizeSource(string? input, out string normalized, out string? error)
    {
        normalized = string.Empty;
        var raw = (input ?? string.Empty).Trim();
        if (raw.Length == 0) { error = "Đường dẫn cũ không được để trống."; return false; }

        var isAbsolute = raw.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            || raw.StartsWith("https://", StringComparison.OrdinalIgnoreCase);
        if (!isAbsolute && (!raw.StartsWith('/') || raw.StartsWith("//")))
        {
            error = "Đường dẫn cũ phải bắt đầu bằng \"/\" (ví dụ /san-pham-cu.html).";
            return false;
        }
        if (raw.Any(c => char.IsControl(c) || c == '\\')) { error = "Đường dẫn cũ chứa ký tự không hợp lệ."; return false; }

        normalized = ToKey(raw);
        if (normalized == "/") { error = "Không được chuyển hướng trang chủ \"/\"."; return false; }
        if (normalized.Length > UrlRedirect.FromPathMaxLength)
        {
            error = $"Đường dẫn cũ dài quá {UrlRedirect.FromPathMaxLength} ký tự.";
            return false;
        }

        error = ShellBlockReason(normalized);
        return error is null;
    }

    /// <summary>Why a normalised path can never be a redirect source, or null when it can.</summary>
    public static string? ShellBlockReason(string key)
    {
        foreach (var prefix in ReservedPrefixes)
        {
            if (key.Equals(prefix, StringComparison.Ordinal) || key.StartsWith(prefix + "/", StringComparison.Ordinal)
                || (prefix is "/_shell" or "/health" && key.StartsWith(prefix, StringComparison.Ordinal)))
            {
                return $"Không được chuyển hướng đường dẫn hệ thống \"{prefix}\".";
            }
        }
        if (ReservedExactPaths.Contains(key)) return $"Không được chuyển hướng \"{key}\".";

        var lastSegment = key[(key.LastIndexOf('/') + 1)..];
        var ext = StaticAssetExtensions.FirstOrDefault(e => lastSegment.EndsWith(e, StringComparison.Ordinal));
        return ext is null ? null : $"Tệp tĩnh \"{ext}\" không đi qua bộ chuyển hướng — không thể chuyển hướng.";
    }

    /// <summary>Validates a TARGET: root-relative path or absolute http(s) URL; nothing else (no javascript:, data:, //host).</summary>
    public static bool TryNormalizeTarget(string? input, int statusCode, out string? normalized, out string? error)
    {
        normalized = null;
        error = null;
        if (statusCode == 410) return true; // Gone has no target by definition.

        var raw = (input ?? string.Empty).Trim();
        if (raw.Length == 0) { error = "Chuyển hướng 301/302 phải có đường dẫn đích."; return false; }
        if (raw.Length > UrlRedirect.ToPathMaxLength) { error = $"Đường dẫn đích dài quá {UrlRedirect.ToPathMaxLength} ký tự."; return false; }
        if (raw.Any(c => char.IsControl(c) || char.IsWhiteSpace(c) || c == '\\'))
        {
            error = "Đường dẫn đích chứa khoảng trắng hoặc ký tự không hợp lệ.";
            return false;
        }

        if (raw.StartsWith('/') && !raw.StartsWith("//")) { normalized = raw; return true; }

        if (Uri.TryCreate(raw, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)
            && !string.IsNullOrEmpty(uri.Host))
        {
            normalized = raw;
            return true;
        }

        error = "Đích phải là đường dẫn bắt đầu bằng \"/\" hoặc URL http(s)://.";
        return false;
    }

    /// <summary>Lookup key of a relative target (for chain/loop checks); null for absolute URLs and 410.</summary>
    public static string? TargetKey(string? target) =>
        target is not null && target.StartsWith('/') && !target.StartsWith("//") ? ToKey(target) : null;
}
