using SystemConfig.Domain;

namespace SystemConfig.Infrastructure.Data;

/// <summary>
/// Dữ liệu seed cho category "Company" (thông tin doanh nghiệp thật, xác minh qua masothue.com)
/// và "Tax" (hằng số thuế GTGT — dùng bởi VatRateResolver / ITaxSettingsProvider).
///
/// Nguồn của từng giá trị: <c>decisions/D09-cua-hang-kho-va-thong-tin-cong-ty.md</c> (bảng dấu
/// chân công khai). Không tự bịa giá trị nào: thứ chưa xác minh được seed RỖNG và footer ẩn dòng
/// đó đi, thay vì in một con số sai lên mặt tiền pháp lý của website.
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
            Entry("COMPANY_ADDRESS", "Số 179 khu phố 3/2, Thị Trấn Vĩnh Bảo, Huyện Vĩnh Bảo, TP Hải Phòng", "Địa chỉ trụ sở chính công ty (nguyên văn đăng ký kinh doanh)", "Company", now),
            Entry("COMPANY_TAX_ADDRESS", "Số 179 Khu phố 13/2 - TT Vĩnh Bảo, Xã Vĩnh Bảo, TP Hải Phòng", "Địa chỉ đăng ký thuế (dùng cho hóa đơn)", "Company", now),
            Entry("COMPANY_REPRESENTATIVE", "Dương Thị Hạnh", "Người đại diện pháp luật", "Company", now),
            // D09: mã vùng 031 đã bị bỏ khi Hải Phòng chuyển sang 225.
            Entry("COMPANY_PHONE", "0225 3823769", "Số điện thoại bàn tại cửa hàng", "Company", now),
            Entry("COMPANY_PHONE_2", "0904.235.090", "Số điện thoại liên hệ phụ / di động", "Company", now),
            Entry("COMPANY_EMAIL", "quanghuongvbhp@gmail.com", "Email liên hệ chính thức", "Company", now),
            Entry("COMPANY_HOTLINE", "0904.235.090", "Hotline hỗ trợ khách hàng", "Company", now),
            // D09: khôi phục giờ do chủ repo tự nhập (commit f659837) thay cho giá trị mẫu kiểu chuỗi lớn.
            Entry("COMPANY_WORKING_HOURS", "7:00 - 17:15 (Thứ 2 - Thứ 7)", "Giờ làm việc hiển thị công khai (nguồn sự thật là Store.OpeningHoursJson)", "Company", now),
            Entry("COMPANY_ESTABLISHED_DATE", "2008-04-18", "Ngày thành lập / hoạt động", "Company", now, ConfigValueType.String),
            Entry("COMPANY_SINCE", "2008", "Năm thành lập — dùng cho tagline SINCE", "Company", now),
            Entry("COMPANY_WEBSITE", "https://quanghuong.com", "Website chính thức", "Company", now, ConfigValueType.Url),
            // Seeded empty on purpose — real bank account must be entered by admin via ConfigPortal, never a fake placeholder
            Entry("COMPANY_BANK_ACCOUNT", "", "Tài khoản ngân hàng nhận thanh toán (công khai để chuyển khoản)", "Company", now),

            // ===== NĐ 248/2026/NĐ-CP Đ.4.2 — bắt buộc công khai số + ngày + nơi cấp GCN ĐKDN =====
            Entry("COMPANY_REGISTRATION_NUMBER", "0204000990", "Số Giấy chứng nhận đăng ký doanh nghiệp", "Company", now),
            Entry("COMPANY_REGISTRATION_DATE", "2008-04-10", "Ngày cấp Giấy chứng nhận đăng ký doanh nghiệp", "Company", now),
            // CHƯA XÁC MINH — không nguồn công khai nào ghi nơi cấp. Chủ shop điền; footer ẩn dòng rỗng.
            Entry("COMPANY_REGISTRATION_PLACE", "", "Nơi cấp Giấy chứng nhận đăng ký doanh nghiệp (chủ shop điền)", "Company", now),

            // ===== Thuế GTGT (D01) =====
            Entry("TAX_VAT_DEFAULT_RATE", "10", "Thuế suất GTGT luật định mặc định (%)", "Tax", now, ConfigValueType.Number),
            Entry("TAX_VAT_REDUCTION_POINTS", "2", "Số điểm phần trăm được giảm tạm thời (10% → 8%)", "Tax", now, ConfigValueType.Number),
            Entry("TAX_VAT_REDUCTION_FROM", "2025-07-01", "Ngày bắt đầu áp dụng mức giảm 2 điểm", "Tax", now),
            Entry("TAX_VAT_REDUCTION_TO", "2026-12-31", "Ngày kết thúc áp dụng mức giảm 2 điểm", "Tax", now),
            Entry("TAX_VAT_REDUCTION_LEGAL_BASIS", "NQ 204/2025/QH15; NĐ 174/2025/NĐ-CP", "Căn cứ pháp lý của mức giảm thuế GTGT", "Tax", now),
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
