using System.Collections.Concurrent;

namespace Catalog;

/// <summary>
/// W0-3: hạn mức tải lên theo từng tài khoản cho <c>POST /api/catalog/media/upload</c>.
/// Guard role đã chặn khách hàng, nhưng một tài khoản nhân viên bị chiếm vẫn có thể
/// đẩy hàng nghìn file lên đĩa. Đếm dung lượng trong cửa sổ 1 giờ trượt, in-memory
/// (một tiến trình API duy nhất — W1-1/W1-15 sẽ chuyển sang Redis nếu chạy nhiều node).
/// </summary>
internal static class CatalogMediaUploadQuota
{
    /// <summary>50MB cho mỗi user trong 1 giờ.</summary>
    internal const long BytesPerHour = 50L * 1024 * 1024;

    private static readonly ConcurrentDictionary<string, (DateTime Window, long Bytes)> Usage = new();

    /// <summary>Cộng dồn dung lượng đã tải trong cửa sổ hiện tại; false = đã vượt hạn mức.</summary>
    internal static bool TryConsume(string userId, long bytes)
    {
        var now = DateTime.UtcNow;
        var used = Usage.AddOrUpdate(
            userId,
            _ => (now, bytes),
            (_, cur) => now - cur.Window >= TimeSpan.FromHours(1) ? (now, bytes) : (cur.Window, cur.Bytes + bytes));
        return used.Bytes <= BytesPerHour;
    }
}
