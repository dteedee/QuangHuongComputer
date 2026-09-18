using BuildingBlocks.TaxEngine;
using FluentAssertions;
using Xunit;

namespace UnitTests.Kernel.Tax;

/// <summary>
/// W1-15 / D06 §2-3 — bảng tham số hiệu lực theo ngày. Điểm sống còn: mỗi tham số có LỊCH RIÊNG
/// (TNCN + lương tối thiểu vùng đổi 01/01/2026; lương cơ sở + trần BH + tiền ăn ca đổi 01/07/2026),
/// nên một "bộ tham số 2026" duy nhất là sai.
/// </summary>
public class StatutoryParameterSetTests
{
    [Fact]
    public void MacDinhBienDich_ResolveDuMoiMa_TaiMoiMocQuanTrong()
    {
        foreach (var date in new[]
                 {
                     new DateOnly(2025, 12, 31), new DateOnly(2026, 1, 1),
                     new DateOnly(2026, 6, 30), new DateOnly(2026, 7, 1),
                     new DateOnly(2026, 9, 18), new DateOnly(2027, 1, 1)
                 })
        {
            var set = VietnamStatutoryDefaults.Resolve(date);

            set.AsOf.Should().Be(date);
            set.SourceRows.Keys.Should().Contain(StatutoryParameterCodes.All);
        }
    }

    [Theory]
    [InlineData("2025-12-31", 11_000_000, 4_400_000, 7)]
    [InlineData("2026-01-01", 15_500_000, 6_200_000, 5)]
    public void GiamTruVaBieuThue_DoiDungNgay_01_01_2026(string date, int personal, int dependent, int bracketCount)
    {
        var set = VietnamStatutoryDefaults.Resolve(DateOnly.Parse(date));

        set.PitPersonalDeduction.Should().Be(personal);
        set.PitDependentDeduction.Should().Be(dependent);
        set.PitBrackets.Should().HaveCount(bracketCount);
    }

    [Theory]
    [InlineData("2026-06-01", 2_340_000, 46_800_000)]
    [InlineData("2026-07-01", 2_530_000, 50_600_000)]
    public void MucThamChieuVaTranBaoHiem_DoiDungNgay_01_07_2026(string date, int reference, int cap)
    {
        var set = VietnamStatutoryDefaults.Resolve(DateOnly.Parse(date));

        set.SiReferenceLevel.Should().Be(reference);
        set.SocialInsuranceCap.Should().Be(cap);
    }

    [Theory]
    [InlineData("2026-06-30", 730_000)]
    [InlineData("2026-07-01", 1_200_000)]
    public void TienAnCa_ChiDoiTu_01_07_2026(string date, int cap)
    {
        VietnamStatutoryDefaults.Resolve(DateOnly.Parse(date)).PitMealTaxFreeCap.Should().Be(cap);
    }

    [Theory]
    [InlineData("2025-12-31", 4_960_000, 99_200_000)]
    [InlineData("2026-01-01", 5_310_000, 106_200_000)]
    public void LuongToiThieuVung1_VaTranBhtn_DoiTu_01_01_2026(string date, int monthly, int unemploymentCap)
    {
        var set = VietnamStatutoryDefaults.Resolve(DateOnly.Parse(date));

        set.CompanyWageRegion.Should().Be(WageRegion.I);
        set.MinWageFor(WageRegion.I).MonthlyWage.Should().Be(monthly);
        set.UnemploymentCapFor(WageRegion.I).Should().Be(unemploymentCap);
    }

    [Theory]
    [InlineData("2025-12-31", OvertimeExemptMode.PremiumOnly, 2_000_000)]
    [InlineData("2026-01-01", OvertimeExemptMode.FullWithinLegalHours, 5_000_000)]
    public void CheDoMienThueOt_VaNguongKhauTru10_DoiTu_01_01_2026(
        string date, OvertimeExemptMode mode, int threshold)
    {
        var set = VietnamStatutoryDefaults.Resolve(DateOnly.Parse(date));

        set.PitOvertimeExemptMode.Should().Be(mode);
        set.PitFlatThreshold.Should().Be(threshold);
    }

    [Fact]
    public void TyLeDongBaoHiem_DungTheoD06()
    {
        var rates = VietnamStatutoryDefaults.Resolve(new DateOnly(2026, 9, 1)).Rates;

        rates.EmployeeTotal.Should().Be(0.105m);
        rates.SiEmployerTotal.Should().Be(0.175m);
        (rates.SiEmployerTotal + rates.HiEmployer + rates.UiEmployer).Should().Be(0.215m);
        rates.UnionFeeEmployer.Should().Be(0.02m);
    }

    [Fact]
    public void HeSoOtDem_Ra_200_270_390_PhanTram()
    {
        var multipliers = VietnamStatutoryDefaults.Resolve(new DateOnly(2026, 9, 1)).OvertimeMultipliers;

        multipliers.Coefficient(OvertimeDayType.Weekday, atNight: false).Should().Be(1.5m);
        multipliers.Coefficient(OvertimeDayType.Weekday, atNight: true).Should().Be(2.0m);
        multipliers.Coefficient(OvertimeDayType.RestDay, atNight: true).Should().Be(2.7m);
        multipliers.Coefficient(OvertimeDayType.Holiday, atNight: true).Should().Be(3.9m);
    }

    [Fact]
    public void MoiDongDeuCoCanCuPhapLyVaNguon()
    {
        VietnamStatutoryDefaults.Rows.Should().OnlyContain(r =>
            !string.IsNullOrWhiteSpace(r.LegalBasis) && r.SourceUrl.StartsWith("https://"));
    }

    [Fact]
    public void MoiDongDeuHopLe_VaKhongTrungKhoa()
    {
        foreach (var row in VietnamStatutoryDefaults.Rows)
        {
            row.TryValidate(out var error).Should().BeTrue(error);
        }

        VietnamStatutoryDefaults.Rows
            .GroupBy(r => (r.Code, r.EffectiveFrom))
            .Should().OnlyContain(g => g.Count() == 1, "UNIQUE (Code, EffectiveFrom)");
    }

    /// <summary>D06 đánh dấu một số giá trị CHƯA XÁC MINH từ nguồn sơ cấp — phải truy vết được.</summary>
    [Fact]
    public void CacDongChuaXacMinh_DuocDanhDauRo()
    {
        var unverified = VietnamStatutoryDefaults.Rows.Where(r => !r.IsVerified).Select(r => r.Code).ToList();

        unverified.Should().Contain(StatutoryParameterCodes.PitMealTaxFreeCap);
        unverified.Should().Contain(StatutoryParameterCodes.HiUnpaidDaysSkip);
        unverified.Should().Contain(StatutoryParameterCodes.UiUnpaidDaysSkip);
        VietnamStatutoryDefaults.Rows.Where(r => !r.IsVerified)
            .Should().OnlyContain(r => !string.IsNullOrWhiteSpace(r.Note));
    }

    [Fact]
    public void ThieuDong_ThiBaoLoiRo_KhongAmThamTinhSai()
    {
        var incomplete = VietnamStatutoryDefaults.Rows
            .Where(r => r.Code != StatutoryParameterCodes.PitPersonalDeduction)
            .ToList();

        var act = () => StatutoryParameterSetFactory.Resolve(incomplete, new DateOnly(2026, 9, 1));

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*PIT_PERSONAL_DEDUCTION*");
    }

    [Fact]
    public void BieuThue_BacCuoiPhaiKhongCoTran()
    {
        var rows = VietnamStatutoryDefaults.Rows
            .Where(r => r.Code != StatutoryParameterCodes.PitBrackets)
            .Append(new StatutoryParameterRow(
                StatutoryParameterCodes.PitBrackets, new DateOnly(2026, 1, 1), null,
                """[{"upTo":10000000,"rate":0.05},{"upTo":30000000,"rate":0.35}]""",
                StatutoryParameterUnit.Json, "test", "https://example.test"))
            .ToList();

        var act = () => StatutoryParameterSetFactory.Resolve(rows, new DateOnly(2026, 9, 1));

        act.Should().Throw<InvalidOperationException>().WithMessage("*bậc cuối*");
    }

    [Fact]
    public void TyLeNgoaiKhoang0_1_BiTuChoi()
    {
        var bad = new StatutoryParameterRow(StatutoryParameterCodes.SiEmployee, new DateOnly(2026, 1, 1),
            1.5m, null, StatutoryParameterUnit.Rate, "test", "https://example.test");

        bad.TryValidate(out var error).Should().BeFalse();
        error.Should().Contain("[0;1]");
    }

    [Fact]
    public void DongPhaiCoDungMotCotGiaTri()
    {
        var both = new StatutoryParameterRow(StatutoryParameterCodes.SiEmployee, new DateOnly(2026, 1, 1),
            0.08m, "0.08", StatutoryParameterUnit.Rate, "test", "https://example.test");

        both.TryValidate(out var error).Should().BeFalse();
        error.Should().Contain("ĐÚNG MỘT");
    }

    [Fact]
    public async Task DefaultProvider_TraVeBoThamSoTheoNgay()
    {
        var set = await DefaultStatutoryParameterProvider.Instance.ResolveAsync(new DateOnly(2026, 9, 1));

        set.PitPersonalDeduction.Should().Be(15_500_000m);
        set.LegalBasisOf(StatutoryParameterCodes.SiReferenceLevel).Should().Contain("NĐ 161/2026");
    }
}
