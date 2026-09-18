using BuildingBlocks.TaxEngine;
using FluentAssertions;
using Xunit;

namespace UnitTests.Kernel.Tax;

/// <summary>
/// W1-15 / D06 §5 — TEST VECTORS TV1-TV6, đặt tên đúng theo D06. Mỗi con số đã được tính lại
/// độc lập bằng script Python trong phiên phản biện D06 (18/09/2026). Vùng I (xã Vĩnh Bảo, TP Hải Phòng).
/// </summary>
public class PayrollTaxCalculatorTests
{
    private static PayrollTaxInput BaseInput(int periodYear, int periodMonth, int payYear, int payMonth)
        => new()
        {
            PeriodMonth = new DateOnly(periodYear, periodMonth, 1),
            PayDate = new DateOnly(payYear, payMonth, 5),
            BasePay = 0m
        };

    /// <summary>TV1 — kỳ 9/2026, HĐLĐ 12 tháng, lương 9tr, ăn trưa tiền mặt 1tr, 1 NPT, OT 10h ngày thường.</summary>
    [Fact]
    public void TV1_HdldDayDu_OtVaAnTruaDeuMienThue()
    {
        var input = BaseInput(2026, 9, 2026, 10) with
        {
            BasePay = 9_000_000m,
            InsurableSalary = 9_000_000m,
            OvertimeHourlyBase = 9_000_000m,
            MealAllowanceCash = 1_000_000m,
            NumberOfDependents = 1,
            Overtime = new[] { new OvertimeEntry(OvertimeDayType.Weekday, 10m) }
        };

        var result = PayrollTaxCalculator.Calculate(input);

        result.Overtime.HourlyRate.Should().Be(43_269m, "lương giờ làm tròn về đồng TRƯỚC khi nhân hệ số");
        result.Overtime.TotalPay.Should().Be(649_035m);
        result.GrossPay.Should().Be(10_649_035m);

        result.Insurance.EmployeeSocial.Should().Be(720_000m);
        result.Insurance.EmployeeHealth.Should().Be(135_000m);
        result.Insurance.EmployeeUnemployment.Should().Be(90_000m);
        result.Insurance.EmployeeTotal.Should().Be(945_000m);

        result.TaxableIncome.Should().Be(9_000_000m, "OT và tiền ăn trưa trong hạn mức đều được miễn");
        result.PersonalIncomeTax.Should().Be(0m);
        result.NetPay.Should().Be(9_704_035m);

        (result.Insurance.EmployerSocialSickness + result.Insurance.EmployerSocialPension).Should().Be(1_530_000m);
        result.Insurance.EmployerSocialAccident.Should().Be(45_000m);
        result.Insurance.EmployerHealth.Should().Be(270_000m);
        result.Insurance.EmployerUnemployment.Should().Be(90_000m);
        result.Insurance.EmployerTotal.Should().Be(1_935_000m);
        result.UnionFeeEmployer.Should().Be(180_000m);
        result.TotalEmployerCost.Should().Be(12_764_035m);
    }

    /// <summary>
    /// Thứ tự làm tròn là LOAD-BEARING: nhân hệ số trước rồi mới làm tròn cho 649.038, lệch 3đ.
    /// </summary>
    [Fact]
    public void TV1_ThuTuLamTron_QuyetDinhKetQua()
    {
        const decimal contractSalary = 9_000_000m;
        var naive = Math.Round(contractSalary / (26m * 8m) * 1.5m * 10m, 0, MidpointRounding.AwayFromZero);

        naive.Should().Be(649_038m);
        naive.Should().NotBe(649_035m);
    }

    /// <summary>TV2a — kỳ 9/2026, lương 60tr, thưởng 5tr, 2 NPT. Trần BH = 50,6tr.</summary>
    [Fact]
    public void TV2a_Ky09_2026_TranBaoHiem50_6Trieu()
    {
        var result = PayrollTaxCalculator.Calculate(HighEarner(2026, 9, 2026, 10));

        result.Insurance.EmployeeSocial.Should().Be(4_048_000m);
        result.Insurance.EmployeeHealth.Should().Be(759_000m);
        result.Insurance.EmployeeUnemployment.Should().Be(600_000m);
        result.Insurance.EmployeeTotal.Should().Be(5_407_000m);

        result.AssessableIncome.Should().Be(31_693_000m);
        result.PersonalIncomeTax.Should().Be(2_838_600m);
        result.NetPay.Should().Be(56_754_400m);

        (result.Insurance.EmployerSocialSickness + result.Insurance.EmployerSocialPension).Should().Be(8_602_000m);
        result.Insurance.EmployerSocialAccident.Should().Be(253_000m);
        result.Insurance.EmployerHealth.Should().Be(1_518_000m);
        result.Insurance.EmployerUnemployment.Should().Be(600_000m);
        result.Insurance.EmployerTotal.Should().Be(10_973_000m);
        result.UnionFeeEmployer.Should().Be(1_012_000m);
    }

    /// <summary>TV2b — CÙNG người, kỳ 6/2026 (trần 46,8tr). Chênh 361.000đ tiền BH chứng minh mốc 01/07/2026.</summary>
    [Fact]
    public void TV2b_Ky06_2026_TranBaoHiem46_8Trieu()
    {
        var june = PayrollTaxCalculator.Calculate(HighEarner(2026, 6, 2026, 7));
        var september = PayrollTaxCalculator.Calculate(HighEarner(2026, 9, 2026, 10));

        june.Insurance.EmployeeSocial.Should().Be(3_744_000m);
        june.Insurance.EmployeeHealth.Should().Be(702_000m);
        june.Insurance.EmployeeUnemployment.Should().Be(600_000m);
        june.Insurance.EmployeeTotal.Should().Be(5_046_000m);

        june.AssessableIncome.Should().Be(32_054_000m);
        june.PersonalIncomeTax.Should().Be(2_910_800m);
        june.NetPay.Should().Be(57_043_200m);

        (september.Insurance.EmployeeTotal - june.Insurance.EmployeeTotal).Should().Be(361_000m);
    }

    /// <summary>TV3 — HĐ THỬ VIỆC RIÊNG 60 ngày, 85% = 8,5tr: miễn toàn bộ BH, khấu trừ 10%.</summary>
    [Fact]
    public void TV3_HopDongThuViecRieng_MienBaoHiem_KhauTru10PhanTram()
    {
        var input = BaseInput(2026, 9, 2026, 10) with
        {
            BasePay = 8_500_000m,
            InsurableSalary = 8_500_000m,
            IsStandaloneProbation = true,
            ContractMonths = 2
        };

        var result = PayrollTaxCalculator.Calculate(input);

        result.PitMethod.Should().Be(PitMethod.Flat10);
        result.Insurance.EmployeeTotal.Should().Be(0m);
        result.Insurance.EmployerTotal.Should().Be(0m);
        result.PersonalIncomeTax.Should().Be(850_000m);
        result.NetPay.Should().Be(7_650_000m);
        result.Notes.Should().Contain(n => n.Contains("thử việc riêng"));
    }

    [Fact]
    public void TV3_CoBanCamKet_KhongKhauTru()
    {
        var input = BaseInput(2026, 9, 2026, 10) with
        {
            BasePay = 8_500_000m,
            IsStandaloneProbation = true,
            ContractMonths = 2,
            HasPitCommitment = true
        };

        var result = PayrollTaxCalculator.Calculate(input);

        result.PersonalIncomeTax.Should().Be(0m);
        result.NetPay.Should().Be(8_500_000m);
    }

    [Fact]
    public void TV3_ChiNuaThang_DuoiNguong5Trieu_KhongKhauTru()
    {
        var input = BaseInput(2026, 9, 2026, 10) with
        {
            BasePay = 4_250_000m,
            IsStandaloneProbation = true,
            ContractMonths = 2
        };

        PayrollTaxCalculator.Calculate(input).PersonalIncomeTax.Should().Be(0m);
    }

    /// <summary>TV4 — lương 30tr, 0 NPT: kỳ trả 12/2025 so với 01/2026 (mốc biểu thuế + giảm trừ 01/01/2026).</summary>
    [Fact]
    public void TV4_Bien_01_01_2026_DoiBieuThueVaGiamTru()
    {
        var y2025 = PayrollTaxCalculator.Calculate(BaseInput(2025, 11, 2025, 12) with
        {
            BasePay = 30_000_000m,
            InsurableSalary = 30_000_000m
        });

        var y2026 = PayrollTaxCalculator.Calculate(BaseInput(2025, 12, 2026, 1) with
        {
            BasePay = 30_000_000m,
            InsurableSalary = 30_000_000m
        });

        y2025.Insurance.EmployeeTotal.Should().Be(3_150_000m);
        y2025.AssessableIncome.Should().Be(15_850_000m);
        y2025.PersonalIncomeTax.Should().Be(1_627_500m);
        y2025.NetPay.Should().Be(25_222_500m);

        y2026.Insurance.EmployeeTotal.Should().Be(3_150_000m);
        y2026.AssessableIncome.Should().Be(11_350_000m);
        y2026.PersonalIncomeTax.Should().Be(635_000m);
        y2026.NetPay.Should().Be(26_215_000m);
    }

    /// <summary>TV5 — thử việc ghi TRONG HĐLĐ 12 tháng: vẫn đóng đủ BH và vẫn tính luỹ tiến.</summary>
    [Fact]
    public void TV5_ThuViecTrongHdld_DongDuBaoHiem_VaLuyTien()
    {
        var input = BaseInput(2026, 9, 2026, 10) with
        {
            BasePay = 8_500_000m,
            InsurableSalary = 8_500_000m,
            IsStandaloneProbation = false,
            ContractMonths = 12
        };

        var result = PayrollTaxCalculator.Calculate(input);

        result.PitMethod.Should().Be(PitMethod.Progressive);
        result.Insurance.EmployeeSocial.Should().Be(680_000m);
        result.Insurance.EmployeeHealth.Should().Be(127_500m);
        result.Insurance.EmployeeUnemployment.Should().Be(85_000m);
        result.Insurance.EmployeeTotal.Should().Be(892_500m);
        result.PersonalIncomeTax.Should().Be(0m);
        result.NetPay.Should().Be(7_607_500m);
    }

    /// <summary>TV6 — quyết toán năm 2026, 1 NV lương 30tr × 12, 0 NPT (chặn hồi quy mẫu 05/KK-TNCN).</summary>
    [Fact]
    public void TV6_QuyetToanNam2026_Pit7_620_000()
    {
        var parameters = VietnamStatutoryDefaults.Resolve(new DateOnly(2026, 12, 31));

        var annualDeduction = parameters.PitPersonalDeduction * 12m;
        var annualInsurance = 3_150_000m * 12m;
        var annualAssessable = 30_000_000m * 12m - annualInsurance - annualDeduction;

        annualDeduction.Should().Be(186_000_000m);
        annualInsurance.Should().Be(37_800_000m);
        annualAssessable.Should().Be(136_200_000m);

        PitCalculator.Annual(annualAssessable, parameters.PitBrackets).Should().Be(7_620_000m);
        PitCalculator.Annual(annualAssessable, parameters.PitBrackets).Should().Be(12m * 635_000m);
    }

    /// <summary>Nghỉ không hưởng lương ≥ 14 ngày làm việc → ngừng đóng BHXH (Luật 41/2024 Đ.33.5).</summary>
    [Fact]
    public void NghiKhongLuong14Ngay_NgungDongBaoHiem()
    {
        var input = BaseInput(2026, 9, 2026, 10) with
        {
            BasePay = 4_000_000m,
            InsurableSalary = 9_000_000m,
            UnpaidLeaveWorkingDays = 14m
        };

        var result = PayrollTaxCalculator.Calculate(input);

        result.Insurance.EmployeeSocial.Should().Be(0m);
        result.Insurance.EmployeeHealth.Should().Be(0m);
        result.Insurance.EmployeeUnemployment.Should().Be(0m);
        result.UnionFeeEmployer.Should().Be(0m);
    }

    [Fact]
    public void NghiKhongLuong14Ngay_CoThoaThuan_VanDongBhxh()
    {
        var input = BaseInput(2026, 9, 2026, 10) with
        {
            BasePay = 4_000_000m,
            InsurableSalary = 9_000_000m,
            UnpaidLeaveWorkingDays = 14m,
            KeepSiOnUnpaidLeave = true
        };

        var result = PayrollTaxCalculator.Calculate(input);

        result.Insurance.EmployeeSocial.Should().Be(720_000m);
        result.Insurance.EmployeeHealth.Should().Be(0m, "cờ BHYT riêng, mặc định BẬT (CHƯA XÁC MINH)");
    }

    /// <summary>Trần giờ OT miễn thuế: min(giờ tháng, 40, 200 − luỹ kế năm).</summary>
    [Fact]
    public void OtVuotTran40GioThang_PhanVuotChiuThue()
    {
        var input = BaseInput(2026, 9, 2026, 10) with
        {
            BasePay = 9_000_000m,
            InsurableSalary = 9_000_000m,
            OvertimeHourlyBase = 9_000_000m,
            Overtime = new[] { new OvertimeEntry(OvertimeDayType.Weekday, 50m) }
        };

        var result = PayrollTaxCalculator.Calculate(input);

        result.Overtime.TotalHours.Should().Be(50m);
        result.Overtime.ExemptHours.Should().Be(40m);
        result.Overtime.TaxablePay.Should().BeGreaterThan(0m);
        result.TaxableIncome.Should().Be(9_000_000m + result.Overtime.TaxablePay);
        result.Notes.Should().Contain(n => n.Contains("vượt trần miễn thuế"));
    }

    [Fact]
    public void OtDaDung195GioTrongNam_ChiCon5GioDuocMien()
    {
        var input = BaseInput(2026, 9, 2026, 10) with
        {
            BasePay = 9_000_000m,
            InsurableSalary = 9_000_000m,
            OvertimeHourlyBase = 9_000_000m,
            OvertimeHoursYearToDate = 195m,
            Overtime = new[] { new OvertimeEntry(OvertimeDayType.Weekday, 20m) }
        };

        PayrollTaxCalculator.Calculate(input).Overtime.ExemptHours.Should().Be(5m);
    }

    [Fact]
    public void TienAnCaVuotHanMuc_PhanVuotChiuThue()
    {
        var input = BaseInput(2026, 9, 2026, 10) with
        {
            BasePay = 9_000_000m,
            InsurableSalary = 9_000_000m,
            MealAllowanceCash = 1_500_000m
        };

        var result = PayrollTaxCalculator.Calculate(input);

        result.TaxableIncome.Should().Be(9_300_000m, "1.500.000 − 1.200.000 = 300.000 chịu thuế");
    }

    [Fact]
    public void CaNhanKhongCuTru_20PhanTramTrenTongThuNhap()
    {
        var input = BaseInput(2026, 9, 2026, 10) with
        {
            BasePay = 30_000_000m,
            InsurableSalary = 30_000_000m,
            IsTaxResident = false
        };

        var result = PayrollTaxCalculator.Calculate(input);

        result.PitMethod.Should().Be(PitMethod.NonResident20);
        result.PersonalIncomeTax.Should().Be(6_000_000m);
    }

    [Fact]
    public void MoiSoTienLaSoNguyenKhongAm()
    {
        var result = PayrollTaxCalculator.Calculate(HighEarner(2026, 9, 2026, 10));

        foreach (var amount in new[]
                 {
                     result.GrossPay, result.NetPay, result.PersonalIncomeTax, result.TaxableIncome,
                     result.AssessableIncome, result.Insurance.EmployeeTotal, result.Insurance.EmployerTotal,
                     result.UnionFeeEmployer, result.TotalEmployerCost, result.Overtime.TotalPay
                 })
        {
            amount.Should().BeGreaterThanOrEqualTo(0m);
            decimal.Truncate(amount).Should().Be(amount);
        }
    }

    private static PayrollTaxInput HighEarner(int periodYear, int periodMonth, int payYear, int payMonth)
        => BaseInput(periodYear, periodMonth, payYear, payMonth) with
        {
            BasePay = 60_000_000m,
            InsurableSalary = 60_000_000m,
            Bonuses = 5_000_000m,
            NumberOfDependents = 2
        };
}
