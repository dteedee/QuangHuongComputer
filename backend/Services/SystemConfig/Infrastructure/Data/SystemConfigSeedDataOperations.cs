using SystemConfig.Domain;

namespace SystemConfig.Infrastructure.Data;

/// <summary>
/// Dữ liệu seed cho các category vận hành: "Sales & Tax", "HR & Payroll", "Repair SLA".
/// </summary>
public static class SystemConfigSeedDataOperations
{
    public static List<ConfigurationEntry> GetEntries()
    {
        var now = DateTime.UtcNow;
        return new List<ConfigurationEntry>
        {
            // ========== Sales & Tax ==========
            Entry("TAX_RATE", "0.08", "Thuế VAT áp dụng cho đơn hàng (8%)", "Sales & Tax", now),
            Entry("COMMISSION_RATE", "0.05", "Hoa hồng nhân viên bán hàng (5%)", "Sales & Tax", now),
            Entry("FREE_SHIPPING_THRESHOLD", "1000000", "Đơn hàng trên 1 triệu được miễn phí ship", "Sales & Tax", now),
            // JSON extensibility: public-facing key dùng bởi FE FreeShippingProgress (Number, public category)
            Entry("FREESHIP_THRESHOLD", "500000", "Ngưỡng đơn hàng được miễn phí vận chuyển (VNĐ)", "Sales & Tax", now, ConfigValueType.Number),
            Entry("SHIPPING_COST", "30000", "Phí vận chuyển cơ bản (VNĐ)", "Sales & Tax", now),
            Entry("MIN_ORDER_VALUE", "100000", "Giá trị đơn hàng tối thiểu", "Sales & Tax", now),
            Entry("MAX_DISCOUNT_PERCENT", "30", "Giảm giá tối đa cho phép (%)", "Sales & Tax", now),
            Entry("RETURN_WINDOW_DAYS", "7", "Số ngày cho phép đổi trả hàng", "Sales & Tax", now),
            Entry("LOYALTY_POINTS_RATE", "0.01", "Tích điểm thưởng 1% giá trị đơn hàng", "Sales & Tax", now),

            // ========== HR & Payroll ==========
            Entry("BASE_SALARY", "5000000", "Lương cơ bản nhân viên (VNĐ)", "HR & Payroll", now),
            Entry("OVERTIME_MULTIPLIER", "1.5", "Hệ số tăng ca (1.5x lương giờ)", "HR & Payroll", now),
            Entry("BONUS_RATE", "0.15", "Thưởng hiệu suất 15%", "HR & Payroll", now),
            Entry("PAID_LEAVE_DAYS", "12", "Số ngày nghỉ phép có lương/năm", "HR & Payroll", now),
            Entry("PROBATION_PERIOD_DAYS", "60", "Thời gian thử việc (ngày)", "HR & Payroll", now),
            Entry("SOCIAL_INSURANCE_RATE", "0.08", "Tỷ lệ đóng BHXH (8%)", "HR & Payroll", now),
            Entry("HEALTH_INSURANCE_RATE", "0.015", "Tỷ lệ đóng BHYT (1.5%)", "HR & Payroll", now),
            Entry("WORKING_HOURS_PER_DAY", "8", "Số giờ làm việc chuẩn mỗi ngày", "HR & Payroll", now),
            Entry("LUNCH_ALLOWANCE", "30000", "Phụ cấp ăn trưa hằng ngày (VNĐ)", "HR & Payroll", now),

            // ========== Repair SLA ==========
            Entry("STANDARD_REPAIR_SLA_HOURS", "48", "Thời gian sửa chữa tiêu chuẩn (giờ)", "Repair SLA", now),
            Entry("EXPRESS_REPAIR_SLA_HOURS", "24", "Thời gian sửa chữa khẩn cấp (giờ)", "Repair SLA", now),
            Entry("EXPRESS_REPAIR_FEE", "200000", "Phí sửa chữa nhanh (VNĐ)", "Repair SLA", now),
            Entry("DIAGNOSIS_FEE", "50000", "Phí kiểm tra, báo giá (VNĐ)", "Repair SLA", now),
            Entry("WARRANTY_REPAIR_DAYS", "30", "Bảo hành sau sửa chữa (ngày)", "Repair SLA", now),
            Entry("SPARE_PARTS_MARKUP", "1.3", "Hệ số giá linh kiện thay thế (1.3x giá vốn)", "Repair SLA", now),
        };
    }

    private static ConfigurationEntry Entry(string key, string value, string description, string category, DateTime now, ConfigValueType valueType = ConfigValueType.String) => new()
    {
        Key = key,
        Value = value,
        Description = description,
        Category = category,
        ValueType = valueType,
        LastUpdated = now
    };
}
