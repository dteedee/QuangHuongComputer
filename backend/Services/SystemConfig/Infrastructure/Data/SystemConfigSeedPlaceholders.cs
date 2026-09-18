namespace SystemConfig.Infrastructure.Data;

/// <summary>
/// Giá trị PLACEHOLDER lịch sử của từng key config — dùng để phát hiện config nào
/// vẫn còn giữ dữ liệu giả lập (chưa được admin chỉnh sửa) và an toàn để seeder ghi đè.
/// Nếu giá trị hiện tại trong DB KHÔNG khớp danh sách này (vd. admin đã sửa tay),
/// seeder sẽ giữ nguyên, không ghi đè.
///
/// Mỗi mục là một giá trị ĐÃ TỪNG ĐƯỢC SEED, không phải giá trị đoán. Thiếu một mục ở đây là
/// lý do một quyết định (vd. D09 sửa số điện thoại) im lặng không tới được database đang chạy.
/// </summary>
public static class SystemConfigSeedPlaceholders
{
    public static readonly IReadOnlyDictionary<string, string[]> ByKey = new Dictionary<string, string[]>
    {
        ["COMPANY_NAME"] = new[] { "Quang Hưởng Computer" },
        ["COMPANY_ADDRESS"] = new[] { "Số 179 Thôn 3/2, Xã Quảng Hưng, Huyện Quảng Xương, Tỉnh Thanh Hóa" },
        // D09: "031" là mã vùng đã bị bỏ khi Hải Phòng chuyển sang 225; "0123456789" là số mẫu.
        ["COMPANY_PHONE"] = new[] { "0123456789", "031 3823769" },
        ["COMPANY_EMAIL"] = new[] { "contact@quanghuong.com" },
        ["COMPANY_HOTLINE"] = new[] { "1900 xxxx", "1900.6321", "1800.6321" },
        ["COMPANY_TAX_CODE"] = new[] { "0123456789" },
        // Fake bank account shipped by earlier seeds — customer-facing, must be blanked until admin enters the real one
        ["COMPANY_BANK_ACCOUNT"] = new[] { "1234567890 - Vietcombank" },
        // D09: ba giá trị giờ mở cửa đã từng nằm trong DB, tất cả đều là giá trị mẫu kiểu chuỗi lớn.
        ["COMPANY_WORKING_HOURS"] = new[] { "8:00 - 21:00 (T2 - CN)", "8:00 - 20:00 hằng ngày", "8:00 - 20:00" },
        // D09: ba trang mạng xã hội đã xác minh là KHÔNG tồn tại (2026-09-18) → ghi đè về rỗng.
        ["FACEBOOK_PAGE"] = new[] { "https://facebook.com/quanghuongcomputer" },
        ["ZALO_OA"] = new[] { "https://zalo.me/quanghuongcomputer" },
        ["YOUTUBE_CHANNEL"] = new[] { "https://youtube.com/@quanghuongcomputer" },
    };
}
