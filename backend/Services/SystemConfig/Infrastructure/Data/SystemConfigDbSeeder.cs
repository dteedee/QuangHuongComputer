using SystemConfig.Domain;
using SystemConfig.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace SystemConfig.Infrastructure.Data;

public static class SystemConfigDbSeeder
{
    public static async Task SeedAsync(SystemConfigDbContext context)
    {
        // Check if configs already exist
        if (await context.Configurations.AnyAsync()) return;

        var configs = new List<ConfigurationEntry>
        {
            // ========== Company ==========
            new ConfigurationEntry
            {
                Key = "COMPANY_NAME",
                Value = "Quang Hưởng Computer",
                Description = "Tên công ty hiển thị trên website và hóa đơn",
                Category = "Company",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "COMPANY_ADDRESS",
                Value = "Số 179 Thôn 3/2, Xã Quảng Hưng, Huyện Quảng Xương, Tỉnh Thanh Hóa",
                Description = "Địa chỉ trụ sở chính công ty",
                Category = "Company",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "COMPANY_PHONE",
                Value = "0123456789",
                Description = "Số điện thoại liên hệ chính",
                Category = "Company",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "COMPANY_EMAIL",
                Value = "contact@quanghuong.com",
                Description = "Email liên hệ chính thức",
                Category = "Company",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "COMPANY_HOTLINE",
                Value = "1900 xxxx",
                Description = "Hotline hỗ trợ khách hàng 24/7",
                Category = "Company",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "COMPANY_WEBSITE",
                Value = "https://quanghuong.com",
                Description = "Website chính thức",
                Category = "Company",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "COMPANY_TAX_CODE",
                Value = "0123456789",
                Description = "Mã số thuế doanh nghiệp",
                Category = "Company",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "COMPANY_BANK_ACCOUNT",
                Value = "1234567890 - Vietcombank",
                Description = "Tài khoản ngân hàng nhận thanh toán",
                Category = "Company",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "COMPANY_BUSINESS_HOURS",
                Value = "8:00 - 20:00 hằng ngày",
                Description = "Giờ làm việc",
                Category = "Company",
                LastUpdated = DateTime.UtcNow
            },

            // ========== Sales & Tax ==========
            new ConfigurationEntry
            {
                Key = "TAX_RATE",
                Value = "0.08",
                Description = "Thuế VAT áp dụng cho đơn hàng (8%)",
                Category = "Sales & Tax",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "COMMISSION_RATE",
                Value = "0.05",
                Description = "Hoa hồng nhân viên bán hàng (5%)",
                Category = "Sales & Tax",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "FREE_SHIPPING_THRESHOLD",
                Value = "1000000",
                Description = "Đơn hàng trên 1 triệu được miễn phí ship",
                Category = "Sales & Tax",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "SHIPPING_COST",
                Value = "30000",
                Description = "Phí vận chuyển cơ bản (VNĐ)",
                Category = "Sales & Tax",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "MIN_ORDER_VALUE",
                Value = "100000",
                Description = "Giá trị đơn hàng tối thiểu",
                Category = "Sales & Tax",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "MAX_DISCOUNT_PERCENT",
                Value = "30",
                Description = "Giảm giá tối đa cho phép (%)",
                Category = "Sales & Tax",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "RETURN_WINDOW_DAYS",
                Value = "7",
                Description = "Số ngày cho phép đổi trả hàng",
                Category = "Sales & Tax",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "LOYALTY_POINTS_RATE",
                Value = "0.01",
                Description = "Tích điểm thưởng 1% giá trị đơn hàng",
                Category = "Sales & Tax",
                LastUpdated = DateTime.UtcNow
            },

            // ========== HR & Payroll ==========
            new ConfigurationEntry
            {
                Key = "BASE_SALARY",
                Value = "5000000",
                Description = "Lương cơ bản nhân viên (VNĐ)",
                Category = "HR & Payroll",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "OVERTIME_MULTIPLIER",
                Value = "1.5",
                Description = "Hệ số tăng ca (1.5x lương giờ)",
                Category = "HR & Payroll",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "BONUS_RATE",
                Value = "0.15",
                Description = "Thưởng hiệu suất 15%",
                Category = "HR & Payroll",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "PAID_LEAVE_DAYS",
                Value = "12",
                Description = "Số ngày nghỉ phép có lương/năm",
                Category = "HR & Payroll",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "PROBATION_PERIOD_DAYS",
                Value = "60",
                Description = "Thời gian thử việc (ngày)",
                Category = "HR & Payroll",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "SOCIAL_INSURANCE_RATE",
                Value = "0.08",
                Description = "Tỷ lệ đóng BHXH (8%)",
                Category = "HR & Payroll",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "HEALTH_INSURANCE_RATE",
                Value = "0.015",
                Description = "Tỷ lệ đóng BHYT (1.5%)",
                Category = "HR & Payroll",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "WORKING_HOURS_PER_DAY",
                Value = "8",
                Description = "Số giờ làm việc chuẩn mỗi ngày",
                Category = "HR & Payroll",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "LUNCH_ALLOWANCE",
                Value = "30000",
                Description = "Phụ cấp ăn trưa hằng ngày (VNĐ)",
                Category = "HR & Payroll",
                LastUpdated = DateTime.UtcNow
            },

            // ========== Repair SLA ==========
            new ConfigurationEntry
            {
                Key = "STANDARD_REPAIR_SLA_HOURS",
                Value = "48",
                Description = "Thời gian sửa chữa tiêu chuẩn (giờ)",
                Category = "Repair SLA",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "EXPRESS_REPAIR_SLA_HOURS",
                Value = "24",
                Description = "Thời gian sửa chữa khẩn cấp (giờ)",
                Category = "Repair SLA",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "EXPRESS_REPAIR_FEE",
                Value = "200000",
                Description = "Phí sửa chữa nhanh (VNĐ)",
                Category = "Repair SLA",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "DIAGNOSIS_FEE",
                Value = "50000",
                Description = "Phí kiểm tra, báo giá (VNĐ)",
                Category = "Repair SLA",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "WARRANTY_REPAIR_DAYS",
                Value = "30",
                Description = "Bảo hành sau sửa chữa (ngày)",
                Category = "Repair SLA",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "SPARE_PARTS_MARKUP",
                Value = "1.3",
                Description = "Hệ số giá linh kiện thay thế (1.3x giá vốn)",
                Category = "Repair SLA",
                LastUpdated = DateTime.UtcNow
            },

            // ========== Security ==========
            new ConfigurationEntry
            {
                Key = "SESSION_TIMEOUT_MINUTES",
                Value = "30",
                Description = "Thời gian hết phiên đăng nhập (phút)",
                Category = "Security",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "MAX_LOGIN_ATTEMPTS",
                Value = "5",
                Description = "Số lần đăng nhập sai tối đa",
                Category = "Security",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "PASSWORD_MIN_LENGTH",
                Value = "8",
                Description = "Độ dài mật khẩu tối thiểu",
                Category = "Security",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "REQUIRE_2FA_FOR_ADMIN",
                Value = "true",
                Description = "Bắt buộc 2FA cho tài khoản Admin",
                Category = "Security",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "IP_WHITELIST",
                Value = "127.0.0.1,192.168.1.0/24",
                Description = "Danh sách IP được phép truy cập Admin",
                Category = "Security",
                LastUpdated = DateTime.UtcNow
            },

            // ========== AI Chatbot ==========
            new ConfigurationEntry
            {
                Key = "AI_MODEL",
                Value = "gpt-4",
                Description = "Model AI sử dụng cho chatbot",
                Category = "AI Chatbot",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "AI_MAX_TOKENS",
                Value = "500",
                Description = "Số token tối đa cho mỗi phản hồi",
                Category = "AI Chatbot",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "AI_TEMPERATURE",
                Value = "0.7",
                Description = "Độ sáng tạo của AI (0-1)",
                Category = "AI Chatbot",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "AI_ENABLED",
                Value = "true",
                Description = "Bật/tắt chatbot AI",
                Category = "AI Chatbot",
                LastUpdated = DateTime.UtcNow
            },

            // ========== Notifications ==========
            new ConfigurationEntry
            {
                Key = "EMAIL_NOTIFICATIONS",
                Value = "true",
                Description = "Gửi thông báo qua email",
                Category = "Notifications",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "SMS_NOTIFICATIONS",
                Value = "false",
                Description = "Gửi thông báo qua SMS",
                Category = "Notifications",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "PUSH_NOTIFICATIONS",
                Value = "true",
                Description = "Gửi thông báo đẩy (Push)",
                Category = "Notifications",
                LastUpdated = DateTime.UtcNow
            },

            // ========== Social Media ==========
            new ConfigurationEntry
            {
                Key = "FACEBOOK_PAGE",
                Value = "https://facebook.com/quanghuongcomputer",
                Description = "Link Facebook Fanpage",
                Category = "Social Media",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "ZALO_OA",
                Value = "https://zalo.me/quanghuongcomputer",
                Description = "Link Zalo Official Account",
                Category = "Social Media",
                LastUpdated = DateTime.UtcNow
            },
            new ConfigurationEntry
            {
                Key = "YOUTUBE_CHANNEL",
                Value = "https://youtube.com/@quanghuongcomputer",
                Description = "Kênh YouTube chính thức",
                Category = "Social Media",
                LastUpdated = DateTime.UtcNow
            }
        };

        await context.Configurations.AddRangeAsync(configs);
        await context.SaveChangesAsync();
    }
}
