using SystemConfig.Domain;

namespace SystemConfig.Infrastructure.Data;

/// <summary>
/// Dữ liệu seed cho các category hệ thống: "Security", "AI Chatbot", "Notifications", "Social Media".
/// </summary>
public static class SystemConfigSeedDataSystem
{
    public static List<ConfigurationEntry> GetEntries()
    {
        var now = DateTime.UtcNow;
        return new List<ConfigurationEntry>
        {
            // ========== Security ==========
            Entry("SESSION_TIMEOUT_MINUTES", "30", "Thời gian hết phiên đăng nhập (phút)", "Security", now),
            Entry("MAX_LOGIN_ATTEMPTS", "5", "Số lần đăng nhập sai tối đa", "Security", now),
            Entry("PASSWORD_MIN_LENGTH", "8", "Độ dài mật khẩu tối thiểu", "Security", now),
            Entry("REQUIRE_2FA_FOR_ADMIN", "true", "Bắt buộc 2FA cho tài khoản Admin", "Security", now),
            Entry("IP_WHITELIST", "127.0.0.1,192.168.1.0/24", "Danh sách IP được phép truy cập Admin", "Security", now),

            // ========== AI Chatbot ==========
            Entry("AI_MODEL", "gpt-4", "Model AI sử dụng cho chatbot", "AI Chatbot", now),
            Entry("AI_MAX_TOKENS", "500", "Số token tối đa cho mỗi phản hồi", "AI Chatbot", now),
            Entry("AI_TEMPERATURE", "0.7", "Độ sáng tạo của AI (0-1)", "AI Chatbot", now),
            Entry("AI_ENABLED", "true", "Bật/tắt chatbot AI", "AI Chatbot", now),

            // ========== Notifications ==========
            Entry("EMAIL_NOTIFICATIONS", "true", "Gửi thông báo qua email", "Notifications", now),
            Entry("SMS_NOTIFICATIONS", "false", "Gửi thông báo qua SMS", "Notifications", now),
            Entry("PUSH_NOTIFICATIONS", "true", "Gửi thông báo đẩy (Push)", "Notifications", now),

            // ========== Social Media ==========
            Entry("FACEBOOK_PAGE", "https://facebook.com/quanghuongcomputer", "Link Facebook Fanpage", "Social Media", now),
            Entry("ZALO_OA", "https://zalo.me/quanghuongcomputer", "Link Zalo Official Account", "Social Media", now),
            Entry("YOUTUBE_CHANNEL", "https://youtube.com/@quanghuongcomputer", "Kênh YouTube chính thức", "Social Media", now),
        };
    }

    private static ConfigurationEntry Entry(string key, string value, string description, string category, DateTime now) => new()
    {
        Key = key,
        Value = value,
        Description = description,
        Category = category,
        LastUpdated = now
    };
}
