using BuildingBlocks.SharedKernel;
using BuildingBlocks.TaxEngine;
using BuildingBlocks.Time;
using FluentAssertions;
using Xunit;

namespace UnitTests.Kernel.Tax;

/// <summary>
/// W1-15 / D01 §2 — thuế suất hiệu lực. Mô hình: LUẬT ĐỊNH 10% trừ mức giảm tạm thời 2 điểm
/// trong cửa sổ 01/07/2025-31/12/2026. Test biên chạy qua <see cref="FixedBusinessClock"/> để
/// chứng minh ranh giới được đánh giá theo giờ VN, không phải UTC.
/// </summary>
public class VatRateResolverTests
{
    [Fact]
    public void HangSoLuatDinh_DungTheoD01()
    {
        TaxRates.VatStatutoryStandard.Should().Be(0.10m);
        TaxRates.VatReductionPoints.Should().Be(0.02m);
        TaxRates.VatReductionFrom.Should().Be(new DateOnly(2025, 7, 1));
        TaxRates.VatReductionTo.Should().Be(new DateOnly(2026, 12, 31));
    }

    [Theory]
    [InlineData("2025-06-30", 0.10)] // trước cửa sổ
    [InlineData("2025-07-01", 0.08)] // ngày đầu cửa sổ
    [InlineData("2026-09-18", 0.08)]
    [InlineData("2026-12-31", 0.08)] // ngày cuối cửa sổ
    [InlineData("2027-01-01", 0.10)] // tự về 10%, không cần deploy
    public void Resolve_HangDuocGiam_TheoNgayGiaoDich(string date, double expected)
    {
        var rate = VatRateResolver.Resolve(
            statutoryRate: TaxRates.VatStatutoryStandard,
            reductionEligible: true,
            businessDateVn: DateOnly.Parse(date));

        rate.Should().Be((decimal)expected);
    }

    /// <summary>
    /// BIÊN GIỜ VN: 2026-12-31T16:59:59Z vẫn là 31/12 ở Việt Nam → 8%;
    /// 17:00:00Z đã sang 01/01/2027 → 10%. So theo UTC sẽ sai đúng 7 tiếng.
    /// </summary>
    [Theory]
    [InlineData("2026-12-31T16:59:59Z", 0.08)]
    [InlineData("2026-12-31T17:00:00Z", 0.10)]
    public void Resolve_BienGiaoThua_TheoGioVietNam(string utcInstant, double expected)
    {
        IBusinessClock clock = FixedBusinessClock.AtUtc(utcInstant);

        var rate = VatRateResolver.Resolve(TaxRates.VatStatutoryStandard, true, clock.TodayVn);

        rate.Should().Be((decimal)expected);
    }

    [Fact]
    public void Resolve_HangKhongThuocDienGiam_GiuNguyen10PhanTram()
    {
        VatRateResolver.Resolve(TaxRates.VatStatutoryStandard, reductionEligible: false,
            new DateOnly(2026, 9, 18)).Should().Be(0.10m);
    }

    [Theory]
    [InlineData(0.05)]  // hàng thuế suất 5% không được giảm 2 điểm
    [InlineData(0.00)]  // hàng xuất khẩu
    [InlineData(-1.00)] // miễn thuế
    public void Resolve_ThueSuatKhacMucChuan_KhongApDungGiam(double statutoryRaw)
    {
        var statutory = (decimal)statutoryRaw;
        VatRateResolver.Resolve(statutory, reductionEligible: true, new DateOnly(2026, 9, 18))
            .Should().Be(statutory);
    }

    [Fact]
    public void FromSettings_CauHinhHopLe_DungCauHinh()
    {
        var settings = new TaxSettings(15_500_000m, 6_200_000m, 2_530_000m,
            VatDefaultRatePercent: 10m,
            VatReductionPointsPercent: 2m,
            VatReductionFrom: new DateOnly(2025, 7, 1),
            VatReductionTo: new DateOnly(2027, 12, 31)); // giả định QH gia hạn: CHỈ sửa config

        var window = VatReductionWindow.FromSettings(settings, out var problems);

        problems.Should().BeEmpty();
        VatRateResolver.Resolve(0.10m, true, new DateOnly(2027, 6, 1), window).Should().Be(0.08m);
    }

    [Fact]
    public void FromSettings_CauHinhHong_RoiVeHangSoLuatDinh_VaBaoLoi()
    {
        var settings = new TaxSettings(0m, 0m, 0m,
            VatDefaultRatePercent: 0m,          // sai
            VatReductionPointsPercent: 99m,     // sai
            VatReductionFrom: null,             // thiếu
            VatReductionTo: null);              // thiếu

        var window = VatReductionWindow.FromSettings(settings, out var problems);

        problems.Should().HaveCountGreaterThanOrEqualTo(4);
        window.Should().Be(VatReductionWindow.Legal);
        VatRateResolver.Resolve(0.10m, true, new DateOnly(2026, 9, 18), window).Should().Be(0.08m);
    }

    [Fact]
    public void FromSettings_CuaSoDaoNguoc_RoiVeCuaSoLuatDinh()
    {
        var settings = new TaxSettings(0m, 0m, 0m, 10m, 2m,
            VatReductionFrom: new DateOnly(2026, 12, 31),
            VatReductionTo: new DateOnly(2025, 7, 1));

        var window = VatReductionWindow.FromSettings(settings, out var problems);

        problems.Should().Contain(p => p.Contains("đảo ngược"));
        window.From.Should().Be(TaxRates.VatReductionFrom);
        window.To.Should().Be(TaxRates.VatReductionTo);
    }
}
