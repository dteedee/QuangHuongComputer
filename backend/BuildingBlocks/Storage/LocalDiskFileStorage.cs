using System.Text.RegularExpressions;

namespace BuildingBlocks.Storage;

/// <summary>
/// Duy nhất implementation của <see cref="IFileStorage"/> hiện tại — đĩa local dưới
/// <c>Storage:RootPath</c> (D02: local disk là quyết định KISS/YAGNI cuối cùng, MinIO đã gỡ).
/// Phục vụ qua static file mount thứ hai ở <see cref="FileStorageOptions.RuntimeRequestPath"/>
/// (<c>ApiGateway/Startup/MiddlewarePipeline.cs</c>).
/// </summary>
public sealed class LocalDiskFileStorage : IFileStorage
{
    private static readonly Regex SlugSanitizer = new(@"[^a-z0-9-]+", RegexOptions.Compiled);
    private readonly FileStorageOptions _options;

    public LocalDiskFileStorage(FileStorageOptions options)
    {
        _options = options;
    }

    public async Task<StoredFile> SaveAsync(
        Stream content,
        string area,
        string extension,
        string contentType,
        string? slug = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(area))
            throw new ArgumentException("area không được rỗng", nameof(area));

        var now = DateTimeOffset.UtcNow;
        var safeArea = SanitizeSegment(area);
        var safeSlug = SanitizeSegment(slug ?? "media");
        var safeExt = SanitizeExtension(extension);
        var fileName = $"{Guid.NewGuid():N}-{safeSlug}.{safeExt}";

        // Layout xác định (phase-15): {area}/{yyyy}/{MM}/{guid}-{slug}.{ext}
        var relativeDir = Path.Combine(safeArea, now.ToString("yyyy"), now.ToString("MM"));
        var absoluteDir = Path.Combine(_options.RootPath, relativeDir);
        Directory.CreateDirectory(absoluteDir);

        var absolutePath = Path.Combine(absoluteDir, fileName);
        content.Position = 0;
        await using (var fileStream = new FileStream(absolutePath, FileMode.CreateNew, FileAccess.Write, FileShare.None))
        {
            await content.CopyToAsync(fileStream, ct);
        }

        var relativeUrl = BuildRelativeUrl(relativeDir, fileName);
        var fileSize = new FileInfo(absolutePath).Length;
        return new StoredFile(relativeUrl, fileSize, now);
    }

    public Task DeleteAsync(string relativeUrl, CancellationToken ct = default)
    {
        var absolutePath = TryMapToAbsolutePath(relativeUrl);
        if (absolutePath is null) return Task.CompletedTask; // ngoài phạm vi runtime (seed/legacy/youtube) — an toàn bỏ qua

        try
        {
            if (File.Exists(absolutePath)) File.Delete(absolutePath);
        }
        catch (IOException)
        {
            // best-effort: record DB đã xoá ở tầng gọi, không để lỗi đĩa chặn thao tác nghiệp vụ
        }
        catch (UnauthorizedAccessException)
        {
            // idem
        }
        return Task.CompletedTask;
    }

    public async IAsyncEnumerable<StoredFile> ListAsync(string? area = null, [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
    {
        var root = string.IsNullOrWhiteSpace(area)
            ? _options.RootPath
            : Path.Combine(_options.RootPath, SanitizeSegment(area));

        if (!Directory.Exists(root)) yield break;

        var files = new DirectoryInfo(root)
            .EnumerateFiles("*", SearchOption.AllDirectories)
            .OrderByDescending(f => f.LastWriteTimeUtc);

        foreach (var file in files)
        {
            ct.ThrowIfCancellationRequested();
            var relativeDir = Path.GetRelativePath(_options.RootPath, file.DirectoryName!).Replace(Path.DirectorySeparatorChar, '/');
            var relativeUrl = BuildRelativeUrl(relativeDir, file.Name);
            yield return new StoredFile(relativeUrl, file.Length, file.LastWriteTimeUtc);
            await Task.Yield();
        }
    }

    /// <summary>Ánh xạ URL tương đối (<c>/media/u/...</c>) về đường dẫn vật lý — null nếu không khớp tiền tố runtime.</summary>
    private string? TryMapToAbsolutePath(string relativeUrl)
    {
        if (string.IsNullOrWhiteSpace(relativeUrl)) return null;
        var prefix = FileStorageOptions.RuntimeRequestPath; // "/media/u"
        if (!relativeUrl.StartsWith(prefix + "/", StringComparison.OrdinalIgnoreCase)) return null;

        var tail = relativeUrl[(prefix.Length + 1)..].Replace('/', Path.DirectorySeparatorChar);
        var absolutePath = Path.GetFullPath(Path.Combine(_options.RootPath, tail));

        // Chặn path traversal: kết quả PHẢI nằm trong RootPath.
        var rootWithSeparator = _options.RootPath.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        return absolutePath.StartsWith(rootWithSeparator, StringComparison.Ordinal) ? absolutePath : null;
    }

    private static string BuildRelativeUrl(string relativeDir, string fileName)
    {
        var normalizedDir = relativeDir.Replace(Path.DirectorySeparatorChar, '/').Trim('/');
        return $"{FileStorageOptions.RuntimeRequestPath}/{normalizedDir}/{fileName}";
    }

    private static string SanitizeSegment(string value)
    {
        var lowered = value.Trim().ToLowerInvariant().Replace(' ', '-');
        var normalized = SlugSanitizer.Replace(lowered, "-").Trim('-');
        return string.IsNullOrEmpty(normalized) ? "x" : normalized;
    }

    private static string SanitizeExtension(string extension)
    {
        var ext = (extension ?? "bin").Trim().TrimStart('.').ToLowerInvariant();
        var normalized = SlugSanitizer.Replace(ext, "");
        return string.IsNullOrEmpty(normalized) ? "bin" : normalized;
    }
}
