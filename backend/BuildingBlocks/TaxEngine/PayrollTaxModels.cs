namespace BuildingBlocks.TaxEngine;

/// <summary>Cách tính thuế TNCN cho một lần chi trả (D06 §4).</summary>
public enum PitMethod
{
    /// <summary>Luỹ tiến từng phần — HĐLĐ ≥ 3 tháng, cá nhân cư trú.</summary>
    Progressive,

    /// <summary>Khấu trừ 10% mỗi lần chi — HĐ THỬ VIỆC RIÊNG / thời vụ &lt; 3 tháng / không HĐ.</summary>
    Flat10,

    /// <summary>20% trên tổng thu nhập, không giảm trừ — cá nhân không cư trú (Luật 109/2025 Đ.21).</summary>
    NonResident20
}

/// <summary>Một khối giờ làm thêm cùng loại ngày và cùng ca (ngày/đêm).</summary>
/// <param name="DayType">Ngày thường / ngày nghỉ hằng tuần (theo LỊCH CA, không mặc định Chủ nhật) / ngày lễ.</param>
/// <param name="Hours">Số giờ làm thêm.</param>
/// <param name="AtNight">Có làm vào ban đêm không (cộng thêm 30% + 20% × hệ số lương của ngày).</param>
public readonly record struct OvertimeEntry(OvertimeDayType DayType, decimal Hours, bool AtNight = false);

/// <summary>
/// W1-15 / D06 §4 — đầu vào THUẦN của một kỳ lương cho một người. Không entity, không I/O:
/// module HR (W2-25) ánh xạ <c>Employee</c>/<c>EmploymentContract</c>/<c>SalaryStructure</c>/
/// <c>MonthlyTimesheet</c> sang record này rồi gọi <see cref="PayrollTaxCalculator"/>.
/// </summary>
public sealed record PayrollTaxInput
{
    /// <summary>Ngày 01 của THÁNG LƯƠNG — dùng tra bảo hiểm, lương tối thiểu vùng, hệ số OT.</summary>
    public required DateOnly PeriodMonth { get; init; }

    /// <summary>Ngày TRẢ lương — dùng tra tham số thuế TNCN (Luật 109/2025 Đ.8.3; NĐ 253 Đ.46.3).</summary>
    public required DateOnly PayDate { get; init; }

    /// <summary>Tiền lương theo công thực tế trong tháng (chưa gồm phụ cấp, thưởng, làm thêm).</summary>
    public required decimal BasePay { get; init; }

    /// <summary>Căn cứ đóng bảo hiểm (<c>SalaryStructure.InsurableSalary</c>) — KHÔNG phải gross.</summary>
    public decimal InsurableSalary { get; init; }

    /// <summary>Lương HĐ + phụ cấp <c>IsInsurable</c>, dùng làm tử số của lương giờ OT. 0 = suy từ các trường khác.</summary>
    public decimal OvertimeHourlyBase { get; init; }

    /// <summary>Tiền ăn ca/ăn trưa TRẢ BẰNG TIỀN — miễn thuế đến <c>PIT_MEAL_TAXFREE_CAP</c>.</summary>
    public decimal MealAllowanceCash { get; init; }

    /// <summary>Phụ cấp chịu thuế khác (điện thoại/xăng xe vượt định mức, trách nhiệm...).</summary>
    public decimal OtherTaxableAllowances { get; init; }

    /// <summary>Khoản chi KHÔNG chịu thuế (công tác phí trong định mức, trang phục trong hạn mức...).</summary>
    public decimal NonTaxableAllowances { get; init; }

    /// <summary>Thưởng (doanh số, tháng 13) — chịu thuế 100%, KHÔNG đóng bảo hiểm.</summary>
    public decimal Bonuses { get; init; }

    /// <summary>Giảm trừ khác (BH hưu trí tự nguyện, từ thiện...) — trừ vào thu nhập tính thuế và vào net.</summary>
    public decimal OtherDeductions { get; init; }

    /// <summary>Số ngày công chuẩn của tháng (mặc định 26).</summary>
    public decimal StandardWorkingDays { get; init; } = 26m;

    /// <summary>Số giờ làm việc chuẩn mỗi ngày (mặc định 8).</summary>
    public decimal HoursPerDay { get; init; } = 8m;

    /// <summary>Các khối giờ làm thêm trong tháng.</summary>
    public IReadOnlyList<OvertimeEntry> Overtime { get; init; } = Array.Empty<OvertimeEntry>();

    /// <summary>Giờ làm ban đêm KHÔNG phải làm thêm (chỉ hưởng phụ cấp đêm 30%).</summary>
    public decimal NightHours { get; init; }

    /// <summary>Luỹ kế giờ làm thêm đã dùng từ đầu năm (để áp trần 200 giờ/năm).</summary>
    public decimal OvertimeHoursYearToDate { get; init; }

    /// <summary>Số NGÀY LÀM VIỆC nghỉ không hưởng lương trong tháng (≥ 14 → ngừng đóng BHXH).</summary>
    public decimal UnpaidLeaveWorkingDays { get; init; }

    /// <summary>Có thoả thuận NSDLĐ-NLĐ vẫn đóng BHXH tháng nghỉ không lương (Luật 41/2024 Đ.33.5).</summary>
    public bool KeepSiOnUnpaidLeave { get; init; }

    /// <summary>HĐ THỬ VIỆC RIÊNG (không phải thử việc ghi trong HĐLĐ) — miễn toàn bộ BH, dùng khấu trừ 10%.</summary>
    public bool IsStandaloneProbation { get; init; }

    /// <summary>Cá nhân cư trú (mặc định true).</summary>
    public bool IsTaxResident { get; init; } = true;

    /// <summary>Thời hạn HĐLĐ tính bằng tháng; 0 = không có hợp đồng; &lt; 3 → khấu trừ 10%.</summary>
    public int ContractMonths { get; init; } = 12;

    /// <summary>Có bản cam kết TNCN (thu nhập chưa đến mức phải nộp) → tạm chưa khấu trừ 10%.</summary>
    public bool HasPitCommitment { get; init; }

    /// <summary>Là đoàn viên công đoàn → trừ đoàn phí (mặc định false).</summary>
    public bool IsUnionMember { get; init; }

    public int NumberOfDependents { get; init; }

    /// <summary>Ghi đè cách tính thuế theo từng nhân viên (D06 §4).</summary>
    public PitMethod? PitMethodOverride { get; init; }

    /// <summary>Ghi đè vùng lương tối thiểu; mặc định lấy <c>COMPANY_WAGE_REGION</c>.</summary>
    public WageRegion? WageRegionOverride { get; init; }
}

/// <summary>Kết quả làm thêm giờ + làm đêm của một kỳ lương.</summary>
public readonly record struct PayrollOvertimeBreakdown(
    decimal HourlyRate,
    decimal TotalHours,
    decimal TotalPay,
    decimal NightPremiumPay,
    decimal ExemptHours,
    decimal ExemptPay,
    decimal TaxablePay);

/// <summary>Bảo hiểm bắt buộc hai phía, đã tách từng quỹ (phiếu lương phải hiện đủ).</summary>
public readonly record struct PayrollInsuranceBreakdown(
    decimal SocialInsuranceBase,
    decimal HealthInsuranceBase,
    decimal UnemploymentBase,
    decimal EmployeeSocial,
    decimal EmployeeHealth,
    decimal EmployeeUnemployment,
    decimal EmployerSocialSickness,
    decimal EmployerSocialPension,
    decimal EmployerSocialAccident,
    decimal EmployerHealth,
    decimal EmployerUnemployment)
{
    public decimal EmployeeTotal => EmployeeSocial + EmployeeHealth + EmployeeUnemployment;

    public decimal EmployerTotal => EmployerSocialSickness + EmployerSocialPension
        + EmployerSocialAccident + EmployerHealth + EmployerUnemployment;
}

/// <summary>Phiếu lương đầy đủ — mọi số tiền là số nguyên VND không âm.</summary>
public sealed record PayrollBreakdown
{
    public required DateOnly PeriodMonth { get; init; }
    public required DateOnly PayDate { get; init; }
    public required PitMethod PitMethod { get; init; }
    public required PayrollOvertimeBreakdown Overtime { get; init; }
    public required PayrollInsuranceBreakdown Insurance { get; init; }

    /// <summary>Tổng tiền trả trước mọi khấu trừ (gồm cả khoản miễn thuế).</summary>
    public required decimal GrossPay { get; init; }

    /// <summary>Thu nhập CHỊU thuế (đã loại phần OT/đêm và phụ cấp được miễn).</summary>
    public required decimal TaxableIncome { get; init; }

    /// <summary>Thu nhập TÍNH thuế (chịu thuế − bảo hiểm − giảm trừ). 0 nếu âm.</summary>
    public required decimal AssessableIncome { get; init; }

    public required decimal PersonalIncomeTax { get; init; }
    public required decimal UnionDuesEmployee { get; init; }
    public required decimal UnionFeeEmployer { get; init; }
    public required decimal NetPay { get; init; }
    public required decimal TotalEmployerCost { get; init; }

    /// <summary>Ghi chú diễn giải (miễn BH do thử việc, ngừng BHXH do nghỉ không lương, chạm trần...).</summary>
    public required IReadOnlyList<string> Notes { get; init; }
}
