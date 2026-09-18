using BuildingBlocks.SharedKernel;

namespace BuildingBlocks.TaxEngine;

// W1-15: file này CỐ Ý tự tham chiếu các thành viên đã đánh [Obsolete] (hằng số luật trước 2026)
// để giữ nguyên byte-for-byte hành vi mà 63 test thuế hiện có đang assert. CS0618 chỉ tắt TRONG
// file này — mọi caller bên ngoài vẫn nhận cảnh báo và hướng dẫn chuyển sang API mới.
#pragma warning disable CS0618

/// <summary>
/// Vietnamese Tax Engine — Thuế Việt Nam.
/// Implements PIT (TNCN), VAT (GTGT), CIT (TNDN), and Social Insurance calculations
/// theo pháp luật hiện hành (Thông tư 111/2013/TT-BTC, Luật BHXH 2014, Nghị quyết 43/2022/QH15).
///
/// Các hằng số PersonalDeduction/DependentDeduction dưới đây là FALLBACK mặc định.
/// Caller có thể truyền giá trị đọc từ SystemConfig (category "Tax") qua tham số
/// <c>personalDeduction</c>/<c>dependentDeduction</c> để cấu hình động theo luật hiện hành
/// mà không cần deploy — xem <see cref="ITaxSettingsProvider"/>.
/// </summary>
public static class VietnameseTaxEngine
{
    // ============================================
    // PERSONAL INCOME TAX (PIT / Thuế TNCN)
    // ============================================
    /// <summary>CŨ — giảm trừ bản thân theo luật TRƯỚC 2026. Từ kỳ tính thuế 2026 là 15.500.000.</summary>
    [Obsolete("D06/W1-15: dùng IStatutoryParameterProvider (PIT_PERSONAL_DEDUCTION). " +
              "11tr chỉ đúng đến kỳ 2025; từ 01/01/2026 là 15,5tr (NQ 110/2025). Xoá ở W4-5.")]
    public const decimal PersonalDeduction = 11_000_000m;   // Giảm trừ bản thân

    /// <summary>CŨ — giảm trừ người phụ thuộc TRƯỚC 2026. Từ kỳ tính thuế 2026 là 6.200.000.</summary>
    [Obsolete("D06/W1-15: dùng IStatutoryParameterProvider (PIT_DEPENDENT_DEDUCTION). Xoá ở W4-5.")]
    public const decimal DependentDeduction = 4_400_000m;   // Giảm trừ người phụ thuộc

    /// <summary>Progressive PIT tax brackets (monthly taxable income ranges).</summary>
    private static readonly (decimal UpperLimit, decimal Rate)[] PitBrackets = new[]
    {
        (5_000_000m,   0.05m),
        (10_000_000m,  0.10m),
        (18_000_000m,  0.15m),
        (32_000_000m,  0.20m),
        (52_000_000m,  0.25m),
        (80_000_000m,  0.30m),
        (decimal.MaxValue, 0.35m)
    };

    /// <summary>
    /// CŨ — TNCN tháng theo biểu 7 bậc (luật trước 2026). Từ kỳ tính thuế 2026 là biểu 5 bậc
    /// (Luật 109/2025/QH15 Đ.9) và giảm trừ 15,5tr/6,2tr.
    /// </summary>
    [Obsolete("D06/W1-15: dùng PitCalculator.Progressive(...) với StatutoryParameterSet. Xoá ở W4-5.")]
    public static PitCalculationResult CalculateMonthlyPit(
        decimal grossSalary,
        int numberOfDependents = 0,
        decimal socialInsurance = 0,
        decimal healthInsurance = 0,
        decimal unemploymentInsurance = 0,
        decimal otherDeductions = 0,
        decimal? personalDeduction = null,
        decimal? dependentDeduction = null)
    {
        var totalInsurance = socialInsurance + healthInsurance + unemploymentInsurance;
        var preTaxIncome = grossSalary - totalInsurance;

        var personalDeductionValue = personalDeduction ?? PersonalDeduction;
        var dependentDeductions = (dependentDeduction ?? DependentDeduction) * numberOfDependents;
        var taxableIncome = preTaxIncome - personalDeductionValue - dependentDeductions - otherDeductions;

        if (taxableIncome <= 0)
        {
            return new PitCalculationResult
            {
                GrossSalary = grossSalary,
                TotalInsurance = totalInsurance,
                PreTaxIncome = preTaxIncome,
                PersonalDeduction = personalDeductionValue,
                DependentDeductions = dependentDeductions,
                OtherDeductions = otherDeductions,
                TaxableIncome = 0,
                PitAmount = 0,
                NetSalary = preTaxIncome,
                EffectiveTaxRate = 0,
                Brackets = new List<PitBracketDetail>()
            };
        }

        var brackets = new List<PitBracketDetail>();
        var totalTax = 0m;
        var remaining = taxableIncome;
        var previousLimit = 0m;

        foreach (var (upperLimit, rate) in PitBrackets)
        {
            if (remaining <= 0) break;

            var bracketWidth = upperLimit == decimal.MaxValue
                ? remaining
                : Math.Min(upperLimit - previousLimit, remaining);

            var bracketTax = bracketWidth * rate;
            totalTax += bracketTax;

            brackets.Add(new PitBracketDetail
            {
                From = previousLimit,
                To = upperLimit == decimal.MaxValue ? taxableIncome : Math.Min(upperLimit, taxableIncome),
                Rate = rate,
                TaxableAmount = bracketWidth,
                TaxAmount = bracketTax
            });

            remaining -= bracketWidth;
            previousLimit = upperLimit;
        }

        return new PitCalculationResult
        {
            GrossSalary = grossSalary,
            TotalInsurance = totalInsurance,
            PreTaxIncome = preTaxIncome,
            PersonalDeduction = personalDeductionValue,
            DependentDeductions = dependentDeductions,
            OtherDeductions = otherDeductions,
            TaxableIncome = taxableIncome,
            PitAmount = Math.Round(totalTax, 0),
            NetSalary = preTaxIncome - Math.Round(totalTax, 0),
            EffectiveTaxRate = preTaxIncome > 0 ? Math.Round(totalTax / preTaxIncome * 100, 2) : 0,
            Brackets = brackets
        };
    }

    /// <summary>
    /// Calculate ANNUAL PIT from annual taxable income (dùng cho quyết toán năm — bậc thuế × 12).
    /// Áp dụng thang thuế × 12 tháng theo Thông tư 111/2013.
    /// </summary>
    [Obsolete("D06/W1-15: dùng PitCalculator.Annual(...) với biểu thuế của năm quyết toán. Xoá ở W4-5.")]
    public static decimal CalculateAnnualPit(decimal annualTaxableIncome)
    {
        if (annualTaxableIncome <= 0) return 0m;

        var totalTax = 0m;
        var remaining = annualTaxableIncome;
        var previousLimit = 0m;

        foreach (var (upperLimit, rate) in PitBrackets)
        {
            if (remaining <= 0) break;

            var annualUpper = upperLimit == decimal.MaxValue ? decimal.MaxValue : upperLimit * 12m;
            var annualPrev = previousLimit * 12m;
            var bracketWidth = annualUpper == decimal.MaxValue
                ? remaining
                : Math.Min(annualUpper - annualPrev, remaining);

            totalTax += bracketWidth * rate;
            remaining -= bracketWidth;
            previousLimit = upperLimit;
        }

        return Math.Round(totalTax, 0);
    }

    // ============================================
    // SOCIAL INSURANCE (BHXH, BHYT, BHTN)
    // ============================================
    // CŨ — tỉ lệ đóng bảo hiểm dưới đây là hằng số không có ngày hiệu lực và gộp 17,5% phía NSDLĐ
    // thành một khoản (D06 tách thành SI_ER_SICK 3% + SI_ER_PENSION 14% + SI_ER_ACCIDENT 0,5%).
    // Giá trị hiện vẫn đúng, nhưng nguồn sự thật là StatutoryParameterSet.Rates. W4-5 xoá cả cụm.
    private const string ObsoleteInsuranceRates =
        "D06/W1-15: dùng StatutoryParameterSet.Rates (SI_EE/HI_EE/UI_EE/SI_ER_*/HI_ER/UI_ER) — " +
        "tỉ lệ phải có ngày hiệu lực và phía NSDLĐ phải tách theo từng quỹ. Xoá ở W4-5.";

    [Obsolete(ObsoleteInsuranceRates)]
    public const decimal SocialInsuranceRate_Employee = 0.08m;

    [Obsolete(ObsoleteInsuranceRates)]
    public const decimal HealthInsuranceRate_Employee = 0.015m;

    [Obsolete(ObsoleteInsuranceRates)]
    public const decimal UnemploymentInsuranceRate_Employee = 0.01m;

    [Obsolete(ObsoleteInsuranceRates)]
    public const decimal TotalInsuranceRate_Employee = 0.105m;

    [Obsolete(ObsoleteInsuranceRates)]
    public const decimal SocialInsuranceRate_Employer = 0.175m;

    [Obsolete(ObsoleteInsuranceRates)]
    public const decimal HealthInsuranceRate_Employer = 0.03m;

    [Obsolete(ObsoleteInsuranceRates)]
    public const decimal UnemploymentInsuranceRate_Employer = 0.01m;

    [Obsolete(ObsoleteInsuranceRates)]
    public const decimal TotalInsuranceRate_Employer = 0.215m;

    /// <summary>CŨ — lương cơ sở 2024-2025. Từ 01/07/2026 là 2.530.000 (NĐ 161/2026).</summary>
    [Obsolete("D06/W1-15: dùng IStatutoryParameterProvider (SI_REFERENCE_LEVEL). Xoá ở W4-5.")]
    public const decimal BaseSalary2025 = 2_340_000m;

    /// <summary>CŨ — trần BHXH/BHYT 20 × 2.340.000. Từ 01/07/2026 là 50.600.000.</summary>
    [Obsolete("D06/W1-15: trần = SI_CAP_MULTIPLIER × SI_REFERENCE_LEVEL tại ngày 01 của tháng lương. Xoá ở W4-5.")]
    public const decimal MaxInsurableSalary = 46_800_000m;

    /// <summary>
    /// CŨ — tính bảo hiểm theo hằng số cố định, không có ngày hiệu lực, không phân biệt HĐ thử việc
    /// riêng, không xử lý nghỉ không lương ≥ 14 ngày, gộp 17,5% phía NSDLĐ thành 1 khoản.
    /// </summary>
    [Obsolete("D06/W1-15: dùng PayrollTaxCalculator.Calculate(...) với StatutoryParameterSet. Xoá ở W4-5.")]
    public static InsuranceCalculationResult CalculateInsurance(decimal grossSalary, decimal? regionalMinSalary = null)
    {
        var insurable = Math.Min(grossSalary, MaxInsurableSalary);
        var regionalMin = regionalMinSalary ?? 4_960_000m;

        var empBhxh = Math.Round(insurable * SocialInsuranceRate_Employee, 0);
        var empBhyt = Math.Round(insurable * HealthInsuranceRate_Employee, 0);
        var empBhtn = Math.Round(Math.Min(grossSalary, regionalMin * 20) * UnemploymentInsuranceRate_Employee, 0);

        var erBhxh = Math.Round(insurable * SocialInsuranceRate_Employer, 0);
        var erBhyt = Math.Round(insurable * HealthInsuranceRate_Employer, 0);
        var erBhtn = Math.Round(Math.Min(grossSalary, regionalMin * 20) * UnemploymentInsuranceRate_Employer, 0);

        return new InsuranceCalculationResult
        {
            InsurableSalary = insurable,
            Employee = new InsuranceBreakdown
            {
                SocialInsurance = empBhxh,
                HealthInsurance = empBhyt,
                UnemploymentInsurance = empBhtn,
                Total = empBhxh + empBhyt + empBhtn
            },
            Employer = new InsuranceBreakdown
            {
                SocialInsurance = erBhxh,
                HealthInsurance = erBhyt,
                UnemploymentInsurance = erBhtn,
                Total = erBhxh + erBhyt + erBhtn
            }
        };
    }

    // ============================================
    // VAT (Thuế GTGT)
    // ============================================
    /// <summary>CŨ — xem <see cref="TaxRates.VatStandard"/>.</summary>
    [Obsolete("D01/W1-15: dùng VatRateResolver.Resolve(...). Hằng số 8% không có ngày hiệu lực. Xoá ở W4-5.")]
    public const decimal VatStandard = TaxRates.VatStandard;

    /// <summary>Thuế suất GTGT LUẬT ĐỊNH của nhóm hàng thông thường (10%) — D01.</summary>
    public const decimal VatStatutoryStandard = TaxRates.VatStatutoryStandard;

    public const decimal VatTelecom = TaxRates.VatTelecom;
    public const decimal VatExport = TaxRates.VatExport;
    public const decimal VatExempt = TaxRates.VatExempt;

    /// <summary>
    /// CŨ — suy thuế suất từ slug danh mục. D01 §2: thuế suất luật định nằm ở cột
    /// <c>Categories.VatRate</c>, mức giảm tạm thời do <see cref="VatRateResolver"/> quyết định theo NGÀY.
    /// </summary>
    [Obsolete("D01/W1-15: đọc Categories.VatRate + VatRateResolver.Resolve(...). Xoá ở W4-5.")]
    public static decimal VatRateForCategory(string? categorySlug) => categorySlug switch
    {
        "vien-thong" or "tai-chinh" or "bat-dong-san" => VatTelecom,
        _ => VatStandard
    };

    /// <summary>
    /// CŨ — mặc định 8% ngầm. D01 bắt buộc LUÔN truyền thuế suất đã resolve theo ngày.
    /// Giữ overload 1 tham số để các caller cũ còn biên dịch; W4-5 xoá.
    /// </summary>
    [Obsolete("D01/W1-15: luôn truyền vatRate đã resolve theo ngày (VatRateResolver.Resolve). Xoá ở W4-5.")]
    public static VatCalculationResult CalculateVat(decimal priceBeforeVat)
        => CalculateVat(priceBeforeVat, VatStandard);

    /// <summary>
    /// CŨ — mặc định 8% ngầm. Xem <see cref="CalculateVat(decimal)"/>.
    /// </summary>
    [Obsolete("D01/W1-15: luôn truyền vatRate đã resolve theo ngày (VatRateResolver.Resolve). Xoá ở W4-5.")]
    public static VatCalculationResult ExtractVat(decimal priceIncludingVat)
        => ExtractVat(priceIncludingVat, VatStandard);

    public static VatCalculationResult CalculateVat(decimal priceBeforeVat, decimal vatRate)
    {
        if (vatRate < 0)
        {
            return new VatCalculationResult
            {
                PriceBeforeVat = priceBeforeVat,
                VatRate = 0,
                VatAmount = 0,
                PriceAfterVat = priceBeforeVat,
                IsExempt = true
            };
        }

        var vatAmount = Math.Round(priceBeforeVat * vatRate, 0);
        return new VatCalculationResult
        {
            PriceBeforeVat = priceBeforeVat,
            VatRate = vatRate,
            VatAmount = vatAmount,
            PriceAfterVat = priceBeforeVat + vatAmount,
            IsExempt = false
        };
    }

    /// <summary>
    /// D01 §3.4 — tách VAT ra khỏi giá ĐÃ GỒM VAT: <c>net = Round(gross / (1 + rate), 0)</c>,
    /// <c>vat = gross − net</c>. Vì VAT là phần dư nên Σ(net + vat) luôn khớp tổng đơn tuyệt đối.
    ///
    /// <c>Math.Round(x, 0)</c> mặc định là banker's rounding. Đã quét mọi số nguyên 1..400.000 với
    /// thuế suất 5/8/10%: <c>gross/(1+rate)</c> KHÔNG BAO GIỜ rơi đúng .5, nên ToEven và
    /// AwayFromZero cho cùng kết quả ở bước này — số học giữ nguyên byte-for-byte so với bản cũ.
    /// (Khác biệt chỉ nằm ở bước giảm giá theo %, xem <see cref="DiscountAllocator"/>.)
    /// </summary>
    public static VatCalculationResult ExtractVat(decimal priceIncludingVat, decimal vatRate)
    {
        if (vatRate <= 0)
        {
            return new VatCalculationResult
            {
                PriceBeforeVat = priceIncludingVat,
                VatRate = 0,
                VatAmount = 0,
                PriceAfterVat = priceIncludingVat,
                IsExempt = vatRate < 0
            };
        }

        var priceBeforeVat = Math.Round(priceIncludingVat / (1 + vatRate), 0);
        var vatAmount = priceIncludingVat - priceBeforeVat;

        return new VatCalculationResult
        {
            PriceBeforeVat = priceBeforeVat,
            VatRate = vatRate,
            VatAmount = vatAmount,
            PriceAfterVat = priceIncludingVat,
            IsExempt = false
        };
    }

    /// <summary>
    /// D01 §3.1 + §5 — tách VAT cho MỘT DÒNG đơn/hoá đơn, trả về đủ các số mà
    /// <c>OrderItems</c>/<c>InvoiceLines</c> phải snapshot.
    ///
    /// Tách THEO DÒNG chứ không theo cả đơn: 290.000 + ship 30.000 → theo dòng 21.481 + 2.222 = 23.703,
    /// tách cả đơn (320.000) = 23.704. Đa thuế suất bắt buộc phải tách theo dòng (Luật GTGT Đ.9.4).
    /// Khoản giảm giá hiện rõ trên từng dòng (NĐ 123/2020 Đ.10.6.đ), không dùng 1 dòng âm chung.
    /// </summary>
    /// <param name="unitPriceIncludingVat">Đơn giá bán ĐÃ GỒM VAT (số nguyên VND).</param>
    /// <param name="quantity">Số lượng.</param>
    /// <param name="lineDiscount">Giảm giá riêng của dòng (đã làm tròn đồng).</param>
    /// <param name="allocatedOrderDiscount">Phần giảm giá cấp đơn phân bổ về dòng này (<see cref="DiscountAllocator"/>).</param>
    /// <param name="vatRate">Thuế suất ĐÃ resolve theo ngày (<see cref="VatRateResolver"/>).</param>
    public static VatLineBreakdown ExtractVatLine(
        decimal unitPriceIncludingVat,
        decimal quantity,
        decimal lineDiscount,
        decimal allocatedOrderDiscount,
        decimal vatRate)
    {
        var grossBeforeDiscount = Math.Round(unitPriceIncludingVat * quantity, 0, MidpointRounding.AwayFromZero);
        var discount = Math.Max(0m, lineDiscount) + Math.Max(0m, allocatedOrderDiscount);
        if (discount > grossBeforeDiscount) discount = grossBeforeDiscount;

        var payable = grossBeforeDiscount - discount;
        var extracted = ExtractVat(payable, vatRate);

        return new VatLineBreakdown(
            GrossBeforeDiscount: grossBeforeDiscount,
            LineDiscount: discount,
            Payable: payable,
            NetAmount: extracted.PriceBeforeVat,
            VatRate: vatRate <= 0m ? 0m : vatRate,
            VatAmount: extracted.VatAmount);
    }

    // ============================================
    // CIT (Thuế TNDN)
    // ============================================
    public const decimal CitStandardRate = 0.20m;

    public static CitCalculationResult CalculateCit(decimal revenue, decimal deductibleExpenses)
    {
        var taxableIncome = Math.Max(0, revenue - deductibleExpenses);
        var citAmount = Math.Round(taxableIncome * CitStandardRate, 0);

        return new CitCalculationResult
        {
            Revenue = revenue,
            DeductibleExpenses = deductibleExpenses,
            TaxableIncome = taxableIncome,
            TaxRate = CitStandardRate,
            CitAmount = citAmount
        };
    }

    // ============================================
    // COMPREHENSIVE PAYROLL
    // ============================================
    /// <summary>
    /// CŨ — bảng lương theo hằng số luật trước 2026, lấy GROSS làm căn cứ đóng bảo hiểm
    /// (đúng phải là <c>SalaryStructure.InsurableSalary</c>), không có làm thêm giờ/phụ cấp/thử việc.
    /// </summary>
    [Obsolete("D06/W1-15: dùng PayrollTaxCalculator.Calculate(PayrollTaxInput, ...). Xoá ở W4-5.")]
    public static PayrollTaxResult CalculatePayroll(
        decimal grossSalary,
        int numberOfDependents = 0,
        decimal otherDeductions = 0,
        decimal? regionalMinSalary = null,
        decimal? personalDeduction = null,
        decimal? dependentDeduction = null)
    {
        var insurance = CalculateInsurance(grossSalary, regionalMinSalary);
        var pit = CalculateMonthlyPit(
            grossSalary,
            numberOfDependents,
            insurance.Employee.SocialInsurance,
            insurance.Employee.HealthInsurance,
            insurance.Employee.UnemploymentInsurance,
            otherDeductions,
            personalDeduction,
            dependentDeduction
        );

        return new PayrollTaxResult
        {
            GrossSalary = grossSalary,
            Insurance = insurance,
            Pit = pit,
            EmployeeDeductions = insurance.Employee.Total + pit.PitAmount,
            EmployerCosts = insurance.Employer.Total,
            NetSalary = grossSalary - insurance.Employee.Total - pit.PitAmount,
            TotalCompanyCost = grossSalary + insurance.Employer.Total
        };
    }
}

// ============================================
// RESULT DTOs
// ============================================

public class PitCalculationResult
{
    public decimal GrossSalary { get; set; }
    public decimal TotalInsurance { get; set; }
    public decimal PreTaxIncome { get; set; }
    public decimal PersonalDeduction { get; set; }
    public decimal DependentDeductions { get; set; }
    public decimal OtherDeductions { get; set; }
    public decimal TaxableIncome { get; set; }
    public decimal PitAmount { get; set; }
    public decimal NetSalary { get; set; }
    public decimal EffectiveTaxRate { get; set; }
    public List<PitBracketDetail> Brackets { get; set; } = new();
}

public class PitBracketDetail
{
    public decimal From { get; set; }
    public decimal To { get; set; }
    public decimal Rate { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal TaxAmount { get; set; }
}

public class InsuranceCalculationResult
{
    public decimal InsurableSalary { get; set; }
    public InsuranceBreakdown Employee { get; set; } = new();
    public InsuranceBreakdown Employer { get; set; } = new();
}

public class InsuranceBreakdown
{
    public decimal SocialInsurance { get; set; }
    public decimal HealthInsurance { get; set; }
    public decimal UnemploymentInsurance { get; set; }
    public decimal Total { get; set; }
}

/// <summary>
/// D01 §4/§5 — số liệu thuế của MỘT DÒNG, đúng bộ cột mà <c>OrderItems</c> và <c>InvoiceLines</c> lưu.
/// Bất biến: <c>Payable == GrossBeforeDiscount − LineDiscount</c> và <c>NetAmount + VatAmount == Payable</c>.
/// </summary>
public readonly record struct VatLineBreakdown(
    decimal GrossBeforeDiscount,
    decimal LineDiscount,
    decimal Payable,
    decimal NetAmount,
    decimal VatRate,
    decimal VatAmount);

public class VatCalculationResult
{
    public decimal PriceBeforeVat { get; set; }
    public decimal VatRate { get; set; }
    public decimal VatAmount { get; set; }
    public decimal PriceAfterVat { get; set; }
    public bool IsExempt { get; set; }
}

public class CitCalculationResult
{
    public decimal Revenue { get; set; }
    public decimal DeductibleExpenses { get; set; }
    public decimal TaxableIncome { get; set; }
    public decimal TaxRate { get; set; }
    public decimal CitAmount { get; set; }
}

public class PayrollTaxResult
{
    public decimal GrossSalary { get; set; }
    public InsuranceCalculationResult Insurance { get; set; } = new();
    public PitCalculationResult Pit { get; set; } = new();
    public decimal EmployeeDeductions { get; set; }
    public decimal EmployerCosts { get; set; }
    public decimal NetSalary { get; set; }
    public decimal TotalCompanyCost { get; set; }
}

#pragma warning restore CS0618
