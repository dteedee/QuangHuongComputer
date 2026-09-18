namespace ApiGateway.Seo;

/// <summary>
/// Binds the "Seo" config section, already wired by W1-5 in every `appsettings*.json`
/// (`Seo:ShellTemplateUrl`, `Seo:CacheSeconds`) — see integration-requests-w1.md.
/// </summary>
public sealed class SeoShellOptions
{
    public const string SectionName = "Seo";

    /// <summary>Where to fetch the built SPA `index.html` from. Dev: Vite (`http://localhost:5174/index.html`, per env doc); prod: the Caddy `web` container (`http://web:8081/index.html`).</summary>
    public string ShellTemplateUrl { get; set; } = string.Empty;

    /// <summary>Output-cache TTL for `/_shell/**`, `/sitemap.xml`, `/robots.txt`.</summary>
    public int CacheSeconds { get; set; } = 120;
}
