using Accounting.Domain;
using FluentAssertions;
using Xunit;

namespace UnitTests.Domain.Accounting;

/// <summary>
/// BHXH 8% + BHYT 1.5% + BHTN 1% (NLĐ) = 10.5% | DN đóng 17.5% + 3% + 1% = 21.5%
/// Trần BHXH/BHYT = 20 x lương cơ sở = 46.800.000
/// Trần BHTN = 20 x lương tối thiểu vùng (vùng I: 4.960.000 -> 99.200.000)
/// </summary>
public class VietnameseTaxEngineInsuranceTests
{
    [Fact]
    public void CalculateInsurance_Luong20Trieu_DuoiTran_NLDDong105PhanTram()
    {
        var result = VietnameseTaxEngine.CalculateInsurance(20_000_000m);

        result.InsurableSalary.Should().Be(20_000_000m);
        result.Employee.SocialInsurance.Should().Be(1_600_000m);        // 8%
        result.Employee.HealthInsurance.Should().Be(300_000m);          // 1.5%
        result.Employee.UnemploymentInsurance.Should().Be(200_000m);    // 1%
        result.Employee.Total.Should().Be(2_100_000m);                  // 10.5%
    }

    [Fact]
    public void CalculateInsurance_Luong20Trieu_DNDong215PhanTram()
    {
        var result = VietnameseTaxEngine.CalculateInsurance(20_000_000m);

        result.Employer.SocialInsurance.Should().Be(3_500_000m);        // 17.5%
        result.Employer.HealthInsurance.Should().Be(600_000m);          // 3%
        result.Employer.UnemploymentInsurance.Should().Be(200_000m);    // 1%
        result.Employer.Total.Should().Be(4_300_000m);                  // 21.5%
    }

    [Fact]
    public void CalculateInsurance_Luong60Trieu_BhxhBhytTinhTrenTran468Trieu()
    {
        var result = VietnameseTaxEngine.CalculateInsurance(60_000_000m);

        result.InsurableSalary.Should().Be(46_800_000m);
        result.Employee.SocialInsurance.Should().Be(3_744_000m);   // 8% x 46,8tr (KHÔNG phải 60tr)
        result.Employee.HealthInsurance.Should().Be(702_000m);     // 1.5% x 46,8tr
        result.Employer.SocialInsurance.Should().Be(8_190_000m);   // 17.5% x 46,8tr
        result.Employer.HealthInsurance.Should().Be(1_404_000m);   // 3% x 46,8tr
    }

    [Fact]
    public void CalculateInsurance_Luong60Trieu_BhtnVanTinhTrenLuongThucVaDuoiTranVung()
    {
        // Trần BHTN = 20 x 4.960.000 = 99,2tr > 60tr nên BHTN tính trên 60tr
        var result = VietnameseTaxEngine.CalculateInsurance(60_000_000m);

        result.Employee.UnemploymentInsurance.Should().Be(600_000m);
        result.Employee.Total.Should().Be(5_046_000m);
    }

    [Fact]
    public void CalculateInsurance_Luong100Trieu_BhtnBiChanTaiTran992Trieu()
    {
        var result = VietnameseTaxEngine.CalculateInsurance(100_000_000m);

        result.Employee.UnemploymentInsurance.Should().Be(992_000m); // 1% x 99,2tr
        result.Employee.SocialInsurance.Should().Be(3_744_000m);
        result.Employee.HealthInsurance.Should().Be(702_000m);
    }

    [Fact]
    public void CalculateInsurance_LuongDungBangTran_KhongBiChan()
    {
        var result = VietnameseTaxEngine.CalculateInsurance(46_800_000m);

        result.InsurableSalary.Should().Be(46_800_000m);
        result.Employee.SocialInsurance.Should().Be(3_744_000m);
    }

    [Fact]
    public void CalculateInsurance_LuongVungKhac_DungTranBhtnCuaVungDo()
    {
        // Vùng IV: lương tối thiểu 3.450.000 -> trần BHTN 69tr, lương 80tr bị chặn
        var result = VietnameseTaxEngine.CalculateInsurance(80_000_000m, regionalMinSalary: 3_450_000m);

        result.Employee.UnemploymentInsurance.Should().Be(690_000m);
    }

    [Fact]
    public void CalculateInsurance_LuongBangKhong_KhongPhaiDong()
    {
        var result = VietnameseTaxEngine.CalculateInsurance(0m);

        result.Employee.Total.Should().Be(0);
        result.Employer.Total.Should().Be(0);
    }

    [Fact]
    public void HangSoBaoHiem_KhopVoiQuyDinh2025()
    {
        VietnameseTaxEngine.TotalInsuranceRate_Employee.Should().Be(0.105m);
        VietnameseTaxEngine.TotalInsuranceRate_Employer.Should().Be(0.215m);
        VietnameseTaxEngine.MaxInsurableSalary.Should().Be(20 * VietnameseTaxEngine.BaseSalary2025);
        VietnameseTaxEngine.MaxInsurableSalary.Should().Be(46_800_000m);
    }

    [Fact]
    public void CalculatePayroll_Luong25Trieu_1NguoiPhuThuoc_TinhDungTuGrossToiNet()
    {
        // BH NLĐ = 2.625.000 -> trước thuế 22.375.000 -> chịu thuế 6.975.000
        // Thuế = 5tr x5% + 1.975.000 x10% = 447.500 -> Net = 21.927.500
        var result = VietnameseTaxEngine.CalculatePayroll(25_000_000m, numberOfDependents: 1);

        result.Insurance.Employee.Total.Should().Be(2_625_000m);
        result.Pit.TaxableIncome.Should().Be(6_975_000m);
        result.Pit.PitAmount.Should().Be(447_500m);
        result.NetSalary.Should().Be(21_927_500m);
        result.EmployeeDeductions.Should().Be(3_072_500m);
    }

    [Fact]
    public void CalculatePayroll_Luong25Trieu_ChiPhiDoanhNghiepBangGrossCongPhanDN()
    {
        var result = VietnameseTaxEngine.CalculatePayroll(25_000_000m);

        result.EmployerCosts.Should().Be(5_375_000m);                 // 21.5% x 25tr
        result.TotalCompanyCost.Should().Be(30_375_000m);
        result.TotalCompanyCost.Should().Be(result.GrossSalary + result.Insurance.Employer.Total);
    }

    [Fact]
    public void CalculatePayroll_LuongCao60Trieu_DungBaoHiemDaChanTranKhiTinhThue()
    {
        // BH NLĐ = 5.046.000 -> trước thuế 54.954.000 -> chịu thuế 43.954.000
        // Thuế = 4.750.000 + 11.954.000 x25% = 7.738.500 -> Net = 47.215.500
        var result = VietnameseTaxEngine.CalculatePayroll(60_000_000m);

        result.Pit.TotalInsurance.Should().Be(5_046_000m);
        result.Pit.TaxableIncome.Should().Be(43_954_000m);
        result.Pit.PitAmount.Should().Be(7_738_500m);
        result.NetSalary.Should().Be(47_215_500m);
    }

    [Fact]
    public void CalculatePayroll_NetLuonNhoHonGross_VaKhongAm()
    {
        foreach (var gross in new[] { 5_000_000m, 20_000_000m, 60_000_000m, 150_000_000m })
        {
            var result = VietnameseTaxEngine.CalculatePayroll(gross);

            result.NetSalary.Should().BeLessThan(gross);
            result.NetSalary.Should().BeGreaterThan(0);
            result.NetSalary.Should().Be(gross - result.EmployeeDeductions);
        }
    }
}
