using Microsoft.Extensions.Configuration;

namespace BuildingBlocks.Storage;

/// <summary>
/// Cấu hình lưu trữ file (D02). Đọc từ section <c>Storage</c> trong appsettings — key đã được
/// W1-5 thêm (<c>Storage:RootPath</c>, <c>Storage:PublicBaseUrl</c>); mọi giá trị đều PHẢI có
/// mặc định hợp lý khi key vắng mặt (yêu cầu của phase file).
/// </summary>
public sealed class FileStorageOptions
{
    /// <summary>Thư mục vật lý gốc, tuyệt đối. Không nằm trong <c>wwwroot</c> (D02: volume runtime không được che ảnh seed trong image).</summary>
    public string RootPath { get; init; } = string.Empty;

    /// <summary>Origin dùng bởi <see cref="IMediaUrlResolver"/> để dựng URL tuyệt đối. Rỗng = không đổi được sang tuyệt đối (giữ nguyên tương đối).</summary>
    public string PublicBaseUrl { get; init; } = string.Empty;

    /// <summary>Request path mount static file thứ hai phục vụ upload runtime — cố định theo D02.</summary>
    public const string RuntimeRequestPath = "/media/u";

    /// <summary>
    /// Suy ra <see cref="RootPath"/> tuyệt đối từ config: rỗng → mặc định
    /// <c>{contentRoot}/App_Data/media</c>; tương đối → ghép với <paramref name="contentRootPath"/>;
    /// đã tuyệt đối (dev machine khác, hoặc volume prod <c>/app/data/media</c>) → giữ nguyên.
    /// </summary>
    public static FileStorageOptions Resolve(IConfiguration configuration, string contentRootPath)
    {
        var section = configuration.GetSection("Storage");
        var rootPath = section["RootPath"];
        if (string.IsNullOrWhiteSpace(rootPath))
        {
            rootPath = Path.Combine(contentRootPath, "App_Data", "media");
        }
        else if (!Path.IsPathRooted(rootPath))
        {
            rootPath = Path.Combine(contentRootPath, rootPath);
        }

        return new FileStorageOptions
        {
            RootPath = Path.GetFullPath(rootPath),
            PublicBaseUrl = section["PublicBaseUrl"] ?? string.Empty,
        };
    }
}
