using BuildingBlocks.Configuration;
using Microsoft.EntityFrameworkCore;

namespace SystemConfig.Infrastructure;

/// <summary>
/// Nguồn dữ liệu của <see cref="IAppSettings"/>: bảng cấu hình admin (<c>Configurations</c>).
///
/// Trước khi có lớp này, không module nào đăng ký <see cref="IAppSettingsStore"/>, nên kernel dùng
/// <see cref="EmptyAppSettingsStore"/> và MỌI lần đọc setting đều rơi về hằng số mặc định trong code:
/// admin sửa phí ship, % hoa hồng, sức chứa khung giờ... trên trang Cấu hình mà server không hề thấy.
///
/// Đăng ký Scoped (giữ DbContext); <see cref="AppSettings"/> tự mở scope riêng cho mỗi lần nạp và
/// cache snapshot 60 giây, các endpoint ghi cấu hình gọi <see cref="IAppSettings.Invalidate"/>.
/// </summary>
public sealed class SystemConfigAppSettingsStore : IAppSettingsStore
{
    private readonly SystemConfigDbContext _db;

    public SystemConfigAppSettingsStore(SystemConfigDbContext db) => _db = db;

    public async Task<IReadOnlyDictionary<string, string?>> LoadAllAsync(CancellationToken cancellationToken = default)
    {
        var rows = await _db.Configurations
            .AsNoTracking()
            .Select(c => new { c.Key, c.Value })
            .ToListAsync(cancellationToken);

        var map = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        foreach (var row in rows)
        {
            map[row.Key] = row.Value;
        }
        return map;
    }
}
