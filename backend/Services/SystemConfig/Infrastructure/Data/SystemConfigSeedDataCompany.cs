using SystemConfig.Domain;

namespace SystemConfig.Infrastructure.Data;

/// <summary>
/// Dữ liệu seed cho category "Company" (thông tin doanh nghiệp thật, xác minh qua masothue.com)
/// và "Tax" (hằng số thuế TNCN/VAT — dùng bởi ITaxSettingsProvider).
/// </summary>
public static class SystemConfigSeedDataCompany
{
    public static List<ConfigurationEntry> GetEntries()
    {
        var now = DateTime.UtcNow;
        return new List<ConfigurationEntry>
        {
            Entry("COMPANY_NAME", "Công ty TNHH Máy Tính Quang Hưởng", "Tên công ty hiển thị trên website và hóa đơn", "Company", now),
            Entry("COMPANY_NAME_EN", "Quang Huong Computer Limited Company", "Tên quốc tế của công ty", "Company", now),
            Entry("COMPANY_SHORT_NAME", "Quang Huong Computer Co., Ltd.", "Tên viết tắt tiếng Anh", "Company", now),
            Entry("COMPANY_BRAND_TEXT_1", "QUANG HƯỞNG", "Dòng chữ thương hiệu 1 (logo/footer)", "Company", now),
            Entry("COMPANY_BRAND_TEXT_2", "COMPUTER", "Dòng chữ thương hiệu 2 (logo/footer)", "Company", now),
            Entry("COMPANY_TAX_CODE", "0200807633", "Mã số thuế doanh nghiệp", "Company", now),
            Entry("COMPANY_ADDRESS", "Số 179 khu phố 3/2, Thị Trấn Vĩnh Bảo, Huyện Vĩnh Bảo, TP Hải Phòng", "Địa chỉ trụ sở chính công ty", "Company", now),
            Entry("COMPANY_TAX_ADDRESS", "Số 179 Khu phố 13/2 - TT Vĩnh Bảo, Xã Vĩnh Bảo, TP Hải Phòng", "Địa chỉ đăng ký thuế (dùng cho hóa đơn)", "Company", now),
            Entry("COMPANY_REPRESENTATIVE", "Dương Thị Hạnh", "Người đại diện pháp luật", "Company", now),
            Entry("COMPANY_PHONE", "031 3823769", "Số điện thoại liên hệ chính", "Company", now),
            Entry("COMPANY_PHONE_2", "0904.235.090", "Số điện thoại liên hệ phụ / di động", "Company", now),
            Entry("COMPANY_EMAIL", "quanghuongvbhp@gmail.com", "Email liên hệ chính thức", "Company", now),
            Entry("COMPANY_HOTLINE", "0904.235.090", "Hotline hỗ trợ khách hàng", "Company", now),
            Entry("COMPANY_WORKING_HOURS", "8:00 - 21:00 (T2 - CN)", "Giờ làm việc hiển thị công khai", "Company", now),
            Entry("COMPANY_ESTABLISHED_DATE", "2008-04-18", "Ngày thành lập / hoạt động", "Company", now, ConfigValueType.String),
            Entry("COMPANY_SINCE", "2008", "Năm thành lập — dùng cho tagline SINCE", "Company", now),
            Entry("COMPANY_WEBSITE", "https://quanghuong.com", "Website chính thức", "Company", now, ConfigValueType.Url),
            Entry("COMPANY_BANK_ACCOUNT", "1234567890 - Vietcombank", "Tài khoản ngân hàng nhận thanh toán (công khai để chuyển khoản)", "Company", now),
            Entry("COMPANY_BUSINESS_HOURS", "8:00 - 21:00 (T2 - CN)", "[Alias cũ] Giờ làm việc — dùng COMPANY_WORKING_HOURS cho code mới", "Company", now),

            Entry("TAX_PERSONAL_DEDUCTION", "11000000", "Giảm trừ gia cảnh bản thân (TNCN, VNĐ/tháng)", "Tax", now, ConfigValueType.Number),
            Entry("TAX_DEPENDENT_DEDUCTION", "4400000", "Giảm trừ người phụ thuộc (TNCN, VNĐ/tháng)", "Tax", now, ConfigValueType.Number),
            Entry("TAX_BASE_SALARY", "2340000", "Lương cơ sở tính bảo hiểm (VNĐ)", "Tax", now, ConfigValueType.Number),
            Entry("TAX_VAT_DEFAULT_RATE", "10", "Thuế suất GTGT mặc định (%)", "Tax", now, ConfigValueType.Number),
        };
    }

    private static ConfigurationEntry Entry(
        string key, string value, string description, string category, DateTime now,
        ConfigValueType valueType = ConfigValueType.String) => new()
    {
        Key = key,
        Value = value,
        Description = description,
        Category = category,
        ValueType = valueType,
        LastUpdated = now
    };
}
