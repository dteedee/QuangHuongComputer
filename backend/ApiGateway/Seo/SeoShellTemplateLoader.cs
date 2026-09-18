using Microsoft.Extensions.Options;

namespace ApiGateway.Seo;

/// <summary>
/// Loads the SPA `index.html` and keeps it in memory, revalidated with `ETag`/`Last-Modified` on
/// EVERY call (D11: the request is internal, ~1ms — a blind 60s TTL served `/assets/index-&lt;old
/// hash&gt;.js` for up to a minute right after a frontend-only deploy, which is a white page).
///
/// No template reachable at all (shell just started, or `Seo:ShellTemplateUrl` misconfigured) →
/// <see cref="LoadAsync"/> returns null and the caller (the shell endpoint) answers 503, which the
/// edge (`deploy/Caddyfile`) falls back to the static `index.html` for — the SPA still works.
/// </summary>
public sealed class SeoShellTemplateLoader
{
    // Deliberately NOT a typed HttpClient (`AddHttpClient<SeoShellTemplateLoader>`): this loader is
    // a process-lifetime Singleton so its in-memory cache actually survives between requests, but
    // IHttpClientFactory typed clients are Transient by design (captive-dependency rules forbid
    // injecting one straight into a Singleton). A plain named client via the factory sidesteps that
    // while still getting pooled/recycled handlers.
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly SeoShellOptions _options;
    private readonly ILogger<SeoShellTemplateLoader> _logger;
    private readonly SemaphoreSlim _gate = new(1, 1);

    /// <summary>Named client registered by `SeoServiceRegistrationExtensions.AddSeoShell`.</summary>
    public const string HttpClientName = "SeoShellTemplate";

    private string? _cachedHtml;
    private string? _etag;
    private DateTimeOffset? _lastModified;

    public SeoShellTemplateLoader(IHttpClientFactory httpClientFactory, IOptions<SeoShellOptions> options, ILogger<SeoShellTemplateLoader> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<string?> LoadAsync(CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_options.ShellTemplateUrl))
        {
            _logger.LogWarning("Seo:ShellTemplateUrl is not configured — shell will answer 503");
            return null;
        }

        await _gate.WaitAsync(ct);
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, _options.ShellTemplateUrl);
            if (_etag is not null) request.Headers.IfNoneMatch.ParseAdd(_etag);
            if (_lastModified is not null) request.Headers.IfModifiedSince = _lastModified;

            var http = _httpClientFactory.CreateClient(HttpClientName);
            using var response = await http.SendAsync(request, ct);

            if (response.StatusCode == System.Net.HttpStatusCode.NotModified)
            {
                return _cachedHtml;
            }

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Shell template fetch from {Url} returned {Status} — {Cache}",
                    _options.ShellTemplateUrl, (int)response.StatusCode,
                    _cachedHtml is null ? "no cached copy, answering 503" : "serving last known-good copy");
                return _cachedHtml; // stale-but-usable beats a hard failure when we HAD one before
            }

            _cachedHtml = await response.Content.ReadAsStringAsync(ct);
            _etag = response.Headers.ETag?.Tag;
            _lastModified = response.Content.Headers.LastModified;
            return _cachedHtml;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Shell template fetch from {Url} failed", _options.ShellTemplateUrl);
            return _cachedHtml;
        }
        finally
        {
            _gate.Release();
        }
    }
}
