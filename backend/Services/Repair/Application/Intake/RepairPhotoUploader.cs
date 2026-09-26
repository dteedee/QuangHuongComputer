using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using BuildingBlocks.Storage;
using Microsoft.AspNetCore.Http;

namespace Repair.Application.Intake;

/// <summary>
/// Lưu ảnh tiếp nhận / trước-sau khi sửa. Dùng LẠI đúng bộ kiểm tra của thư viện media
/// (<see cref="FileValidator.ValidateImage"/>: đuôi + MIME + magic bytes, ≤ 5MB, cấm SVG) và cùng
/// <see cref="IFileStorage"/> với Content/Catalog. Kiểm tra HẾT các tệp trước khi ghi tệp nào ⇒
/// một ảnh hỏng không để lại nửa lô ảnh mồ côi trên đĩa.
/// </summary>
public static class RepairPhotoUploader
{
    public const int MaxFilesPerRequest = 10;
    public const string StorageArea = "repair";

    public static async Task<IReadOnlyList<string>> SaveAsync(IFormFileCollection? files, IFileStorage storage, CancellationToken ct)
    {
        if (files is null || files.Count == 0)
            throw new RequestValidationException("files", "Chưa chọn ảnh nào.");
        if (files.Count > MaxFilesPerRequest)
            throw new RequestValidationException("files", $"Mỗi lần tải tối đa {MaxFilesPerRequest} ảnh.");

        foreach (var file in files)
        {
            var (isValid, _) = FileValidator.ValidateImage(file);
            if (!isValid)
                throw new RequestValidationException("files",
                    $"Ảnh \"{Path.GetFileName(file.FileName)}\" không hợp lệ: chỉ nhận JPG/PNG/GIF/WebP tối đa 5MB.");
        }

        var urls = new List<string>(files.Count);
        foreach (var file in files)
        {
            var extension = Path.GetExtension(file.FileName).TrimStart('.').ToLowerInvariant();
            await using var stream = file.OpenReadStream();
            var stored = await storage.SaveAsync(stream, StorageArea, extension, file.ContentType, "phieu-sua", ct);
            urls.Add(stored.RelativeUrl);
        }

        return urls;
    }
}
