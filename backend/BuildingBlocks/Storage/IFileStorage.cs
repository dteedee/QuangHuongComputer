namespace BuildingBlocks.Storage;

/// <summary>
/// Một điểm truy cập duy nhất cho MỌI đường ghi file runtime của hệ thống (W1-6 / D02).
/// Local disk là backend duy nhất (KISS/YAGNI — MinIO đã bị gỡ, xem D02); nếu sau này cần
/// S3/R2 (nhiều node hoặc seed &gt;150MB) chỉ cần thêm một implementation mới của interface này.
///
/// D02 (binding): mọi URL trả về là ĐƯỜNG DẪN TƯƠNG ĐỐI dạng <c>/media/u/...</c> — KHÔNG BAO GIỜ
/// tuyệt đối. Muốn URL tuyệt đối (email, sitemap, OG/JSON-LD, PDF) thì dùng
/// <see cref="IMediaUrlResolver"/> ở đúng những nơi đó, không phải ở đây.
/// </summary>
public interface IFileStorage
{
    /// <summary>
    /// Ghi <paramref name="content"/> xuống đĩa theo layout xác định
    /// <c>{area}/{yyyy}/{MM}/{guid}-{slug}.{extension}</c> và trả về URL tương đối để phục vụ qua
    /// static file middleware (mount thứ hai, <c>RequestPath="/media/u"</c>).
    /// </summary>
    /// <param name="content">Luồng dữ liệu — vị trí đọc từ đầu (caller đặt <c>Position = 0</c> trước khi gọi).</param>
    /// <param name="area">Nhóm nghiệp vụ, ví dụ <c>"products"</c>, <c>"content"</c> — trở thành thư mục con đầu tiên.</param>
    /// <param name="extension">Phần mở rộng KHÔNG có dấu chấm, ví dụ <c>"webp"</c>, <c>"mp4"</c>.</param>
    /// <param name="contentType">MIME type đã được xác thực bằng magic bytes ở tầng gọi (không dùng ở đây, chỉ truyền qua để log/audit sau này).</param>
    /// <param name="slug">Gợi ý đặt tên, sẽ bị chuẩn hoá (lowercase, bỏ ký tự không hợp lệ); rỗng thì dùng "media".</param>
    Task<StoredFile> SaveAsync(
        Stream content,
        string area,
        string extension,
        string contentType,
        string? slug = null,
        CancellationToken ct = default);

    /// <summary>
    /// Xoá file vật lý ứng với <paramref name="relativeUrl"/>. KHÔNG BAO GIỜ chạm tới bất cứ thứ gì
    /// ngoài thư mục runtime (<c>Storage:RootPath</c>) — một URL không khớp tiền tố runtime
    /// (seed <c>/media/seed/...</c>, legacy <c>/uploads/...</c>, YouTube embed...) bị bỏ qua an toàn
    /// (no-op), không throw, không xoá nhầm ảnh seed đã versioned trong git.
    /// </summary>
    Task DeleteAsync(string relativeUrl, CancellationToken ct = default);

    /// <summary>Liệt kê file đã lưu, mới nhất trước, lọc theo <paramref name="area"/> nếu có (dùng cho GET /api/media).</summary>
    IAsyncEnumerable<StoredFile> ListAsync(string? area = null, CancellationToken ct = default);
}

/// <summary>Một file đã được lưu — <see cref="RelativeUrl"/> là thứ duy nhất caller cần ghi vào DB.</summary>
public readonly record struct StoredFile(string RelativeUrl, long FileSize, DateTimeOffset SavedAt);
