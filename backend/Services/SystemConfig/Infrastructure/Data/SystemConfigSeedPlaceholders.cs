namespace SystemConfig.Infrastructure.Data;

/// <summary>
/// Giá trị PLACEHOLDER lịch sử của từng key config — dùng để phát hiện config nào
/// vẫn còn giữ dữ liệu giả lập (chưa được admin chỉnh sửa) và an toàn để seeder ghi đè.
/// Nếu giá trị hiện tại trong DB KHÔNG khớp danh sách này (vd. admin đã sửa tay),
/// seeder sẽ giữ nguyên, không ghi đè.
/// </summary>
public static class SystemConfigSeedPlaceholders
{
    public static readonly IReadOnlyDictionary<string, string[]> ByKey = new Dictionary<string, string[]>
    {
        ["COMPANY_NAME"] = new[] { "Quang Hưởng Computer" },
        ["COMPANY_ADDRESS"] = new[] { "Số 179 Thôn 3/2, Xã Quảng Hưng, Huyện Quảng Xương, Tỉnh Thanh Hóa" },
        ["COMPANY_PHONE"] = new[] { "0123456789" },
        ["COMPANY_EMAIL"] = new[] { "contact@quanghuong.com" },
        ["COMPANY_HOTLINE"] = new[] { "1900 xxxx" },
        ["COMPANY_TAX_CODE"] = new[] { "0123456789" },
    };
}
