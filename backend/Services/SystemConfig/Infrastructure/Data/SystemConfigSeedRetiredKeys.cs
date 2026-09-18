namespace SystemConfig.Infrastructure.Data;

/// <summary>
/// Config key đã bị KHAI TỬ bởi một quyết định, kèm giá trị nó từng được seed.
///
/// Vì sao cần danh sách riêng: <see cref="SystemConfigDbSeeder"/> chỉ INSERT key thiếu và ghi đè
/// key còn giữ placeholder — nó không bao giờ xoá. Bỏ một dòng khỏi
/// <c>SystemConfigSeedData*.GetEntries()</c> vì thế chỉ ảnh hưởng database TRỐNG; database đang
/// chạy vẫn giữ key cũ mãi mãi, và code đọc nhầm nó sẽ tính lương/thuế bằng số mẫu.
///
/// Xoá vẫn fail-safe: chỉ xoá khi giá trị hiện tại đúng bằng một trong các giá trị từng seed.
/// Admin đã sửa tay → giữ nguyên, để người vận hành tự quyết định.
/// </summary>
public static class SystemConfigSeedRetiredKeys
{
    public static readonly IReadOnlyDictionary<string, string[]> ByKey = new Dictionary<string, string[]>
    {
        // ---- D01: thuế suất cứng, thay bằng TAX_VAT_DEFAULT_RATE + cửa sổ giảm ----
        ["TAX_RATE"] = new[] { "0.08", "0.1", "0.10" },

        // ---- D06: 9 key lương/bảo hiểm là số mẫu, không phải tham số luật định 2026 ----
        ["BASE_SALARY"] = new[] { "5000000" },
        ["BONUS_RATE"] = new[] { "0.15" },
        ["HEALTH_INSURANCE_RATE"] = new[] { "0.015" },
        ["LUNCH_ALLOWANCE"] = new[] { "30000" },
        ["OVERTIME_MULTIPLIER"] = new[] { "1.5" },
        ["PAID_LEAVE_DAYS"] = new[] { "12" },
        ["PROBATION_PERIOD_DAYS"] = new[] { "60" },
        ["SOCIAL_INSURANCE_RATE"] = new[] { "0.08" },
        ["WORKING_HOURS_PER_DAY"] = new[] { "8" },

        // ---- D06: ba hằng số thuế TNCN đã lỗi thời (mức giảm trừ gia cảnh đã thay đổi) ----
        ["TAX_PERSONAL_DEDUCTION"] = new[] { "11000000" },
        ["TAX_DEPENDENT_DEDUCTION"] = new[] { "4400000" },
        ["TAX_BASE_SALARY"] = new[] { "2340000" },

        // ---- D09: alias trùng lặp của COMPANY_WORKING_HOURS ----
        ["COMPANY_BUSINESS_HOURS"] = new[] { "8:00 - 21:00 (T2 - CN)", "8:00 - 20:00 hằng ngày", "8:00 - 20:00" },
    };
}
