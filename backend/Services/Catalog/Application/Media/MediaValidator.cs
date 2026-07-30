namespace Catalog.Application.Media;

/// <summary>
/// Validate file media dựa trên MAGIC BYTES (không tin Content-Type client gửi).
///
/// Ràng buộc:
/// - Ảnh: jpg/png/webp — ≤ 5MB
/// - Video: mp4/webm — ≤ 100MB
/// - CẤM SVG (chứa được &lt;script&gt; → XSS lưu trữ)
/// - Tên file gốc bị bỏ qua (endpoint sinh UUID)
/// </summary>
public sealed class MediaValidator
{
    public const long MaxImageBytes = 5L * 1024 * 1024;      // 5 MB
    public const long MaxVideoBytes = 100L * 1024 * 1024;    // 100 MB

    public MediaValidationResult ValidateImage(Stream stream, string? clientContentType, string? fileNameHint)
    {
        if (stream == null || stream.Length == 0)
            return MediaValidationResult.Invalid("File rỗng");

        if (stream.Length > MaxImageBytes)
            return MediaValidationResult.Invalid($"Ảnh vượt quá {MaxImageBytes / (1024 * 1024)}MB");

        // Chặn SVG dù client báo bất cứ MIME nào — nội dung XML dễ chèn script.
        if (!string.IsNullOrWhiteSpace(clientContentType) &&
            clientContentType.Contains("svg", StringComparison.OrdinalIgnoreCase))
            return MediaValidationResult.Invalid("Định dạng SVG không được phép");
        if (!string.IsNullOrWhiteSpace(fileNameHint) &&
            fileNameHint.EndsWith(".svg", StringComparison.OrdinalIgnoreCase))
            return MediaValidationResult.Invalid("Định dạng SVG không được phép");

        var header = ReadHeader(stream, 16);
        var detected = DetectImageType(header);
        if (detected == null)
            return MediaValidationResult.Invalid("Không nhận diện được định dạng ảnh (chỉ chấp nhận JPG/PNG/WebP)");

        return MediaValidationResult.Ok(detected.Value.MimeType, detected.Value.Extension);
    }

    public MediaValidationResult ValidateVideo(Stream stream, string? clientContentType, string? fileNameHint)
    {
        if (stream == null || stream.Length == 0)
            return MediaValidationResult.Invalid("File rỗng");

        if (stream.Length > MaxVideoBytes)
            return MediaValidationResult.Invalid($"Video vượt quá {MaxVideoBytes / (1024 * 1024)}MB");

        var header = ReadHeader(stream, 16);
        var detected = DetectVideoType(header);
        if (detected == null)
            return MediaValidationResult.Invalid("Không nhận diện được định dạng video (chỉ chấp nhận MP4/WebM)");

        return MediaValidationResult.Ok(detected.Value.MimeType, detected.Value.Extension);
    }

    private static byte[] ReadHeader(Stream stream, int size)
    {
        var buf = new byte[size];
        var pos = stream.Position;
        stream.Position = 0;
        var read = stream.Read(buf, 0, size);
        stream.Position = pos;
        if (read < size) Array.Resize(ref buf, read);
        return buf;
    }

    /// <summary>Phát hiện JPG (FF D8 FF), PNG (89 50 4E 47), WebP (RIFF....WEBP).</summary>
    private static (string MimeType, string Extension)? DetectImageType(byte[] h)
    {
        if (h.Length >= 3 && h[0] == 0xFF && h[1] == 0xD8 && h[2] == 0xFF)
            return ("image/jpeg", "jpg");
        if (h.Length >= 4 && h[0] == 0x89 && h[1] == 0x50 && h[2] == 0x4E && h[3] == 0x47)
            return ("image/png", "png");
        if (h.Length >= 12 &&
            h[0] == (byte)'R' && h[1] == (byte)'I' && h[2] == (byte)'F' && h[3] == (byte)'F' &&
            h[8] == (byte)'W' && h[9] == (byte)'E' && h[10] == (byte)'B' && h[11] == (byte)'P')
            return ("image/webp", "webp");
        return null;
    }

    /// <summary>Phát hiện MP4 (box "ftyp" ở offset 4) và WebM (1A 45 DF A3).</summary>
    private static (string MimeType, string Extension)? DetectVideoType(byte[] h)
    {
        if (h.Length >= 8 &&
            h[4] == (byte)'f' && h[5] == (byte)'t' && h[6] == (byte)'y' && h[7] == (byte)'p')
            return ("video/mp4", "mp4");
        if (h.Length >= 4 && h[0] == 0x1A && h[1] == 0x45 && h[2] == 0xDF && h[3] == 0xA3)
            return ("video/webm", "webm");
        return null;
    }
}

public readonly record struct MediaValidationResult(bool IsValid, string? MimeType, string? Extension, string? ErrorMessage)
{
    public static MediaValidationResult Ok(string mimeType, string extension) => new(true, mimeType, extension, null);
    public static MediaValidationResult Invalid(string error) => new(false, null, null, error);
}
