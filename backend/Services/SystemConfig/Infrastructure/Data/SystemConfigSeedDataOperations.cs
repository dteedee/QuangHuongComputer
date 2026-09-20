using SystemConfig.Domain;

namespace SystemConfig.Infrastructure.Data;

/// <summary>
/// Dữ liệu seed cho các category vận hành: "Sales &amp; Tax", "Repair SLA".
///
/// KHÔNG còn category "HR &amp; Payroll": D06 xoá 9 key lương/bảo hiểm tự nghĩ ra
/// (BASE_SALARY, BONUS_RATE, HEALTH_INSURANCE_RATE, LUNCH_ALLOWANCE, OVERTIME_MULTIPLIER,
/// PAID_LEAVE_DAYS, PROBATION_PERIOD_DAYS, SOCIAL_INSURANCE_RATE, WORKING_HOURS_PER_DAY) vì
/// chúng là số mẫu, không phải tham số luật định 2026 — tham số thật do track HR/payroll của
/// wave 2 seed theo D06. D01 xoá <c>TAX_RATE</c> (chỉ từng tồn tại trong seed này); thuế suất
/// hiệu lực nay do <c>TAX_VAT_DEFAULT_RATE</c> + cửa sổ giảm quyết định.
/// Danh sách key bị khai tử nằm ở <see cref="SystemConfigSeedRetiredKeys"/>.
/// </summary>
public static class SystemConfigSeedDataOperations
{
    public static List<ConfigurationEntry> GetEntries()
    {
        var now = DateTime.UtcNow;
        return new List<ConfigurationEntry>
        {
            // ========== Sales & Tax ==========
            Entry("COMMISSION_RATE", "0.05", "Hoa hồng nhân viên bán hàng (5%)", "Sales & Tax", now),
            // JSON extensibility: public-facing key dùng bởi FE FreeShippingProgress (Number, public category)
            Entry("FREESHIP_THRESHOLD", "500000", "Ngưỡng đơn hàng được miễn phí vận chuyển (VNĐ)", "Sales & Tax", now, ConfigValueType.Number),
            Entry("SHIPPING_COST", "30000", "Phí vận chuyển cơ bản (VNĐ)", "Sales & Tax", now),
            // Trả góp: danh sách đối tác tài chính đang bật, phân tách bởi dấu phẩy. ĐỂ TRỐNG =
            // tắt trả góp (ActivePartners() rỗng thì mọi hồ sơ bị từ chối ngay tại tầng nghiệp vụ).
            Entry("INSTALLMENT_PARTNERS", "", "Đối tác trả góp đang bật, cách nhau bởi dấu phẩy (để trống = tắt trả góp)", "Sales & Tax", now),
            Entry("INSTALLMENT_LEAD_HOLD_HOURS", "72", "Số giờ giữ hàng chờ công ty tài chính duyệt hồ sơ trả góp", "Sales & Tax", now, ConfigValueType.Number),
            Entry("MIN_ORDER_VALUE", "100000", "Giá trị đơn hàng tối thiểu", "Sales & Tax", now),
            Entry("MAX_DISCOUNT_PERCENT", "30", "Giảm giá tối đa cho phép (%)", "Sales & Tax", now),
            Entry("RETURN_WINDOW_DAYS", "7", "Số ngày cho phép đổi trả hàng", "Sales & Tax", now),
            Entry("LOYALTY_POINTS_RATE", "0.01", "Tích điểm thưởng 1% giá trị đơn hàng", "Sales & Tax", now),

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
