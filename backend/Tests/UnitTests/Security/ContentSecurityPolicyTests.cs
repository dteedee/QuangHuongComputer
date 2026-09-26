using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;
using BuildingBlocks.Security;
using FluentAssertions;
using Xunit;

namespace UnitTests.Security;

/// <summary>
/// Một CSP cho cả site: API và Caddy phải gửi CÙNG một chuỗi, và script-src không được có
/// 'unsafe-inline' (có nó thì một lỗi chèn HTML là chạy được script, tức là cướp phiên).
/// </summary>
public class ContentSecurityPolicyTests
{
    private static string RepoRoot([CallerFilePath] string thisFile = "")
    {
        // <repo>/backend/Tests/UnitTests/Security/<file>.cs -> lùi đúng 4 cấp.
        var dir = new DirectoryInfo(Path.GetDirectoryName(thisFile)!);
        for (var i = 0; i < 4 && dir.Parent != null; i++) dir = dir.Parent;
        return dir.FullName;
    }

    private static string Directive(string policy, string name) =>
        policy.Split(';', StringSplitOptions.TrimEntries).Single(d => d.StartsWith(name + " "));

    [Fact(DisplayName = "CSP: script-src KHÔNG có 'unsafe-inline' / 'unsafe-eval'")]
    public void ScriptSrc_KhongUnsafeInline()
    {
        var scriptSrc = Directive(ContentSecurityPolicy.Build(upgradeInsecureRequests: true), "script-src");

        scriptSrc.Should().NotContain("'unsafe-inline'");
        scriptSrc.Should().NotContain("'unsafe-eval'");
        scriptSrc.Should().StartWith("script-src 'self'");
    }

    [Fact(DisplayName = "CSP: cho phép Google Sign-In, reCAPTCHA; chặn object và nhúng từ site lạ")]
    public void CacMienBenThuBaCanThiet()
    {
        var policy = ContentSecurityPolicy.Build(upgradeInsecureRequests: false);

        Directive(policy, "script-src").Should().Contain("https://accounts.google.com").And.Contain("https://www.gstatic.com");
        Directive(policy, "frame-src").Should().Contain("https://www.google.com");
        policy.Should().Contain("object-src 'none'").And.Contain("frame-ancestors 'self'");
        policy.Should().NotContain("upgrade-insecure-requests");
        ContentSecurityPolicy.Build(upgradeInsecureRequests: true).Should().EndWith("; upgrade-insecure-requests");
    }

    [Fact(DisplayName = "CSP: deploy/Caddyfile gửi đúng chuỗi của API (không trôi lệch)")]
    public void Caddyfile_TrungChuoiVoiApi()
    {
        var caddyfile = File.ReadAllText(Path.Combine(RepoRoot(), "deploy", "Caddyfile"));
        var matches = Regex.Matches(caddyfile, "^\\s*Content-Security-Policy \"([^\"]+)\"\\s*$", RegexOptions.Multiline);

        matches.Should().HaveCount(1, "Caddyfile khai báo CSP đúng một chỗ (snippet security_headers)");
        matches[0].Groups[1].Value.Should().Be(ContentSecurityPolicy.Build(upgradeInsecureRequests: false));
    }
}
