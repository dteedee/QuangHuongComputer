namespace BuildingBlocks.Storage;

/// <inheritdoc cref="IMediaUrlResolver" />
public sealed class MediaUrlResolver : IMediaUrlResolver
{
    private readonly FileStorageOptions _options;

    public MediaUrlResolver(FileStorageOptions options)
    {
        _options = options;
    }

    public string ToAbsolute(string? relativeUrl)
    {
        if (string.IsNullOrWhiteSpace(relativeUrl)) return relativeUrl ?? string.Empty;

        if (relativeUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            relativeUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            return relativeUrl; // đã tuyệt đối (vd. nhúng YouTube) — giữ nguyên
        }

        if (string.IsNullOrWhiteSpace(_options.PublicBaseUrl))
        {
            return relativeUrl; // chưa cấu hình domain — không bịa, trả về tương đối
        }

        var baseUrl = _options.PublicBaseUrl.TrimEnd('/');
        var path = relativeUrl.StartsWith('/') ? relativeUrl : "/" + relativeUrl;
        return baseUrl + path;
    }
}
