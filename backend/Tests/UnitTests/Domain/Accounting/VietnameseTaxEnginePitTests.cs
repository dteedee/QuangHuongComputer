using Accounting.Domain;
using FluentAssertions;
using Xunit;

namespace UnitTests.Domain.Accounting;

/// <summary>
/// Thuế TNCN (PIT) — mọi kỳ vọng TÍNH TAY theo biểu thuế lũy tiến từng phần VN, KHÔNG lấy output code làm chuẩn.
/// Giảm trừ bản thân 11.000.000đ/tháng, người phụ thuộc 4.400.000đ/người/tháng.
/// Bậc: ≤5tr:5% | 5-10tr:10% | 10-18tr:15% | 18-32tr:20% | 32-52tr:25% | 52-80tr:30% | >80tr:35%
/// </summary>
public class VietnameseTaxEnginePitTests
{
    // Thu nhập chịu thuế = gross - 11tr (không BHXH, không người phụ thuộc)
    // 5tr   -> chịu thuế 0            -> 0
    // 12tr  -> 1tr  x5%               -> 50.000
    // 20tr  -> 5tr x5% + 4tr x10%     -> 650.000
    // 35tr  -> 24tr: 250k+500k+1,2tr+1,2tr -> 3.150.000
    // 60tr  -> 49tr: 250k+500k+1,2tr+2,8tr+4,25tr -> 9.000.000
    // 90tr  -> 79tr: 4,75tr+5tr+8,1tr -> 17.850.000
    // 150tr -> 139tr: 9,75tr+8,4tr+20,65tr -> 38.800.000
    [Theory]
    [InlineData(5_000_000L, 0L)]
    [InlineData(12_000_000L, 50_000L)]
    [InlineData(20_000_000L, 650_000L)]
    [InlineData(35_000_000L, 3_150_000L)]
    [InlineData(60_000_000L, 9_000_000L)]
    [InlineData(90_000_000L, 17_850_000L)]
    [InlineData(150_000_000L, 38_800_000L)]
    public void CalculateMonthlyPit_KhongNguoiPhuThuoc_TraVeDungThueLuyTien(long gross, long expectedPit)
    {
        var result = VietnameseTaxEngine.CalculateMonthlyPit(gross);

        result.PitAmount.Should().Be(expectedPit);
    }

    // Thu nhập rơi ĐÚNG mốc chuyển bậc (gross = ngưỡng + 11tr giảm trừ)
    [Theory]
    [InlineData(16_000_000L, 250_000L)]      // chịu thuế đúng 5tr  — hết bậc 1
    [InlineData(21_000_000L, 750_000L)]      // chịu thuế đúng 10tr — hết bậc 2
    [InlineData(29_000_000L, 1_950_000L)]    // chịu thuế đúng 18tr — hết bậc 3
    [InlineData(43_000_000L, 4_750_000L)]    // chịu thuế đúng 32tr — hết bậc 4
    [InlineData(63_000_000L, 9_750_000L)]    // chịu thuế đúng 52tr — hết bậc 5
    [InlineData(91_000_000L, 18_150_000L)]   // chịu thuế đúng 80tr — hết bậc 6
    public void CalculateMonthlyPit_ThuNhapDungNguongChuyenBac_KhongNhayBacSai(long gross, long expectedPit)
    {
        var result = VietnameseTaxEngine.CalculateMonthlyPit(gross);

        result.PitAmount.Should().Be(expectedPit);
    }

    [Theory]
    [InlineData(20_000_000L, 1, 230_000L)]     // chịu thuế 4,6tr -> 5%
    [InlineData(35_000_000L, 1, 2_270_000L)]   // chịu thuế 19,6tr -> 250k+500k+1,2tr+320k
    [InlineData(30_000_000L, 2, 780_000L)]     // chịu thuế 10,2tr -> 250k+500k+30k
    [InlineData(20_000_000L, 3, 0L)]           // giảm trừ vượt thu nhập -> miễn thuế
    public void CalculateMonthlyPit_CoNguoiPhuThuoc_GiamTru44TrieuMoiNguoi(long gross, int dependents, long expectedPit)
    {
        var result = VietnameseTaxEngine.CalculateMonthlyPit(gross, dependents);

        result.PitAmount.Should().Be(expectedPit);
        result.DependentDeductions.Should().Be(4_400_000m * dependents);
    }

    [Fact]
    public void CalculateMonthlyPit_ThuNhapBangDungGiamTruBanThan_KhongPhaiNopThue()
    {
        var result = VietnameseTaxEngine.CalculateMonthlyPit(11_000_000m);

        result.TaxableIncome.Should().Be(0);
        result.PitAmount.Should().Be(0);
        result.NetSalary.Should().Be(11_000_000m);
    }

    [Fact]
    public void CalculateMonthlyPit_ThuNhapBangKhong_TraVeKhongThue()
    {
        var result = VietnameseTaxEngine.CalculateMonthlyPit(0m);

        result.TaxableIncome.Should().Be(0);
        result.PitAmount.Should().Be(0);
        result.EffectiveTaxRate.Should().Be(0);
    }

    [Fact]
    public void CalculateMonthlyPit_ThuNhapAm_KhongSinhThueAm()
    {
        var result = VietnameseTaxEngine.CalculateMonthlyPit(-5_000_000m);

        result.PitAmount.Should().Be(0);
        result.TaxableIncome.Should().Be(0);
    }

    [Fact]
    public void CalculateMonthlyPit_CoBaoHiem_TruBaoHiemTruocKhiTinhThue()
    {
        // gross 30tr, BH tự nhập: 2,4tr + 450k + 300k = 3,15tr
        // trước thuế 26,85tr -> chịu thuế 15,85tr -> 250k + 500k + 5,85tr x15% = 1.627.500
        var result = VietnameseTaxEngine.CalculateMonthlyPit(
            30_000_000m, 0, 2_400_000m, 450_000m, 300_000m);

        result.TotalInsurance.Should().Be(3_150_000m);
        result.PreTaxIncome.Should().Be(26_850_000m);
        result.TaxableIncome.Should().Be(15_850_000m);
        result.PitAmount.Should().Be(1_627_500m);
    }

    [Fact]
    public void CalculateMonthlyPit_CoGiamTruKhac_LamGiamThuNhapChiuThue()
    {
        // gross 20tr, giảm trừ khác 3tr (từ thiện) -> chịu thuế 6tr -> 250k + 1tr x10% = 350k
        var result = VietnameseTaxEngine.CalculateMonthlyPit(20_000_000m, 0, 0, 0, 0, 3_000_000m);

        result.TaxableIncome.Should().Be(6_000_000m);
        result.PitAmount.Should().Be(350_000m);
    }

    [Fact]
    public void CalculateMonthlyPit_ThuNhapCao_ChiTietBacThueCongDungTongThue()
    {
        var result = VietnameseTaxEngine.CalculateMonthlyPit(150_000_000m);

        result.Brackets.Should().HaveCount(7);
        result.Brackets.Sum(b => b.TaxAmount).Should().Be(result.PitAmount);
        result.Brackets.Last().Rate.Should().Be(0.35m);
        result.Brackets.Last().TaxableAmount.Should().Be(59_000_000m); // 139tr - 80tr
    }

    [Fact]
    public void CalculateMonthlyPit_ThuNhap35Trieu_ChiDungToiBac4()
    {
        var result = VietnameseTaxEngine.CalculateMonthlyPit(35_000_000m);

        result.Brackets.Should().HaveCount(4);
        result.Brackets[3].Rate.Should().Be(0.20m);
        result.Brackets[3].TaxableAmount.Should().Be(6_000_000m); // 24tr - 18tr
    }

    [Fact]
    public void CalculateMonthlyPit_TraVeThueSuatHieuDungVaLuongNet()
    {
        var result = VietnameseTaxEngine.CalculateMonthlyPit(20_000_000m);

        result.EffectiveTaxRate.Should().Be(3.25m); // 650k / 20tr
        result.NetSalary.Should().Be(19_350_000m);
    }

    [Fact]
    public void HangSoGiamTru_DungTheoLuatHienHanh()
    {
        VietnameseTaxEngine.PersonalDeduction.Should().Be(11_000_000m);
        VietnameseTaxEngine.DependentDeduction.Should().Be(4_400_000m);
    }
}
