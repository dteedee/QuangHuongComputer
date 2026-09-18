using BuildingBlocks.SharedKernel;
using BuildingBlocks.TaxEngine;
using BuildingBlocks.Time;
using FluentAssertions;
using Xunit;

namespace UnitTests.Kernel.Tax;

/// <summary>
/// W1-15 — kiểm chứng ĐỐI KHÁNG (verifier, 2026-09-18). Các ca biên mà bộ test của implementer
/// KHÔNG phủ: cấu hình sai kiểu "fail-open", hệ số OT đêm, mốc 01/07/2026 của bộ tham số,
/// bất biến tách VAT trên dải rộng, và hành vi khi caller truyền số tiền lẻ.
/// Mọi con số ở đây được suy ra ĐỘC LẬP từ D01/D06, không copy từ code.
/// </summary>
public class KernelAdversarialProbeTests
{
    // ---------------------------------------------------------------- VAT

    /// <summary>
    /// D01 §2: cả 4 biên của cửa sổ giảm. 30/06/2025 và 01/01/2027 phải là 10%.
    /// </summary>
    [Theory]
    [InlineData("2025-06-30", 0.10)]
    [InlineData("2025-07-01", 0.08)]
    [InlineData("2026-12-31", 0.08)]
    [InlineData("2027-01-01", 0.10)]
    public void Vat_BonBienCuaCuaSoGiam(string date, double expected)
        => VatRateResolver.Resolve(0.10m, true, DateOnly.Parse(date)).Should().Be((decimal)expected);

    /// <summary>
    /// Đêm giao thừa 2026 theo GIỜ VN, đi qua đúng đường mà production sẽ đi
    /// (IBusinessClock.TodayVn → VatRateResolver), không tự dựng DateOnly.
    /// </summary>
    [Theory]
    [InlineData("2026-12-31T16:59:59Z", 0.08)]
    [InlineData("2026-12-31T17:00:00Z", 0.10)]
    public void Vat_BienGiaoThua_QuaIBusinessClock(string utc, double expected)
    {
        IBusinessClock clock = FixedBusinessClock.AtUtc(utc);
        VatRateResolver.Resolve(0.10m, true, clock.TodayVn).Should().Be((decimal)expected);
    }

    /// <summary>Miễn thuế (−1) và 0% không bao giờ bị "giảm" thành số khác.</summary>
    [Theory]
    [InlineData(-1.0)]
    [InlineData(0.0)]
    public void Vat_MienThueVa0PhanTram_GiuNguyen(double raw)
        => VatRateResolver.Resolve((decimal)raw, true, new DateOnly(2026, 9, 18)).Should().Be((decimal)raw);

    /// <summary>
    /// IR-03 của implementer: nếu TAX_VAT_DEFAULT_RATE = 8 (fallback hiện tại của
    /// SystemConfigTaxSettingsProvider) thì dòng hàng 10% KHÔNG được giảm — hậu quả thật là
    /// thu 10% NGAY HÔM NAY, không phải "kẹt ở 8% sau 2026". Test này khoá lại hành vi để
    /// khi IR-03 được sửa (fallback = 10) nó vẫn đúng.
    /// </summary>
    [Fact]
    public void Vat_ConfigSaiMucChuan_KhongApDungGiam()
    {
        var window = VatReductionWindow.FromSettings(
            new TaxSettings(11_000_000m, 4_400_000m, 2_340_000m, VatDefaultRatePercent: 8m),
            out var problems);

        window.StandardRate.Should().Be(0.08m);
        problems.Should().NotBeEmpty("thiếu FROM/TO vẫn phải được báo cáo");
        VatRateResolver.Resolve(0.10m, true, new DateOnly(2026, 9, 18), window)
            .Should().Be(0.10m, "mức chuẩn cấu hình ≠ thuế suất luật định của dòng → không giảm");
    }

    /// <summary>Bất biến tách VAT của D01 §3.4 trên dải rộng: net + vat = gross, cả hai nguyên, không âm.</summary>
    [Theory]
    [InlineData(0.05)]
    [InlineData(0.08)]
    [InlineData(0.10)]
    public void Vat_BatBienTachTheoDong_TrenDaiRong(double rateRaw)
    {
        var rate = (decimal)rateRaw;
        for (var gross = 1m; gross <= 30_000m; gross += 7m)
        {
            var r = VietnameseTaxEngine.ExtractVat(gross, rate);
            (r.PriceBeforeVat + r.VatAmount).Should().Be(gross);
            decimal.Truncate(r.PriceBeforeVat).Should().Be(r.PriceBeforeVat);
            r.VatAmount.Should().BeGreaterThanOrEqualTo(0m);
        }
    }

    /// <summary>Dòng miễn thuế qua overload theo dòng: VAT = 0, net = payable.</summary>
    [Fact]
    public void Vat_DongMienThue_NetBangPayable()
    {
        var line = VietnameseTaxEngine.ExtractVatLine(1_000_000m, 2m, 0m, 0m, TaxRates.VatExempt);

        line.Payable.Should().Be(2_000_000m);
        line.NetAmount.Should().Be(2_000_000m);
        line.VatAmount.Should().Be(0m);
        line.VatRate.Should().Be(0m);
    }

    // ---------------------------------------------------- Phân bổ giảm giá

    /// <summary>
    /// Σ alloc phải bằng ĐÚNG D với mọi tổ hợp — quét ngẫu nhiên tất định 500 đơn.
    /// Đây là bất biến mà hoá đơn dựa vào (Total = Subtotal − D + ship).
    /// </summary>
    [Fact]
    public void Alloc_TongLuonBangD_QuetNgauNhienTatDinh()
    {
        var rng = new Random(20260918);
        for (var t = 0; t < 500; t++)
        {
            var count = rng.Next(1, 8);
            var lines = new DiscountLine[count];
            var sum = 0m;
            for (var i = 0; i < count; i++)
            {
                decimal gross = rng.Next(1, 5_000_000);
                lines[i] = new DiscountLine(i + 1, gross, IsGift: rng.Next(10) == 0);
                if (!lines[i].IsGift) sum += gross;
            }

            decimal d = rng.Next(0, 6_000_000);
            var alloc = DiscountAllocator.Allocate(lines, d);

            alloc.Sum().Should().Be(Math.Min(d, sum), $"lần {t}");
            alloc.Should().OnlyContain(a => a >= 0m);
            for (var i = 0; i < count; i++)
            {
                if (lines[i].IsGift) alloc[i].Should().Be(0m, $"dòng quà lần {t}");
                (lines[i].Gross - alloc[i]).Should().BeGreaterThanOrEqualTo(0m, $"payable âm lần {t}");
            }
        }
    }

    /// <summary>Tie-break phải ổn định khi ĐẢO thứ tự mảng: cùng dữ liệu → cùng kết quả theo Sequence.</summary>
    [Fact]
    public void Alloc_DaoThuTuMang_KetQuaTheoSequenceKhongDoi()
    {
        var forward = new[]
        {
            new DiscountLine(1, 100_000m), new DiscountLine(2, 100_000m), new DiscountLine(3, 100_000m)
        };
        var reversed = new[]
        {
            new DiscountLine(3, 100_000m), new DiscountLine(2, 100_000m), new DiscountLine(1, 100_000m)
        };

        var a = DiscountAllocator.Allocate(forward, 2m);
        var b = DiscountAllocator.Allocate(reversed, 2m);

        a.Should().Equal(1m, 1m, 0m);
        // Mảng đảo ngược: Sequence 1 và 2 nằm ở index 2 và 1 — vẫn là hai dòng nhận thêm 1đ.
        b.Should().Equal(0m, 1m, 1m);
    }

    /// <summary>Trả hàng: trả từng cái một trên dòng lẻ, tổng hoàn phải khớp tuyệt đối với payable.</summary>
    [Theory]
    [InlineData(1_268_113, 3)]
    [InlineData(999_999, 7)]
    [InlineData(1, 4)]
    public void TraHang_TongHoanKhopPayable_MoiSoLuong(int payableRaw, int qty)
    {
        decimal payable = payableRaw;
        var refunded = 0m;
        for (var returned = 0; returned < qty; returned++)
        {
            var refund = DiscountAllocator.RefundForReturn(payable, qty, 1, returned, refunded);
            refund.Should().BeGreaterThanOrEqualTo(0m);
            refunded += refund;
        }

        refunded.Should().Be(payable);
    }

    // ------------------------------------------------------------ Lương

    /// <summary>
    /// D06 §4: OT ĐÊM = 200% / 270% / 390%. Suy ra độc lập từ 1,5+0,3+0,2×1 · 2,0+0,3+0,2×2 · 3,0+0,3+0,2×3.
    /// </summary>
    [Theory]
    [InlineData(OvertimeDayType.Weekday, 2.0)]
    [InlineData(OvertimeDayType.RestDay, 2.7)]
    [InlineData(OvertimeDayType.Holiday, 3.9)]
    public void Ot_HeSoLamDem_200_270_390(OvertimeDayType dayType, double coefficient)
    {
        var input = new PayrollTaxInput
        {
            PeriodMonth = new DateOnly(2026, 9, 1),
            PayDate = new DateOnly(2026, 10, 5),
            BasePay = 9_000_000m,
            InsurableSalary = 9_000_000m,
            OvertimeHourlyBase = 9_000_000m,
            Overtime = new[] { new OvertimeEntry(dayType, 10m, AtNight: true) }
        };

        var expected = Math.Round(43_269m * (decimal)coefficient * 10m, 0, MidpointRounding.AwayFromZero);

        PayrollTaxCalculator.Calculate(input).Overtime.TotalPay.Should().Be(expected);
    }

    /// <summary>Mốc 01/07/2026: mức tham chiếu và trần BHXH/BHYT đổi đúng một ngày.</summary>
    [Fact]
    public void ThamSo_Moc01_07_2026_DoiMucThamChieuVaTran()
    {
        var june = VietnamStatutoryDefaults.Resolve(new DateOnly(2026, 6, 30));
        var july = VietnamStatutoryDefaults.Resolve(new DateOnly(2026, 7, 1));

        june.SiReferenceLevel.Should().Be(2_340_000m);
        july.SiReferenceLevel.Should().Be(2_530_000m);
        june.SocialInsuranceCap.Should().Be(46_800_000m);
        july.SocialInsuranceCap.Should().Be(50_600_000m);
        june.UnemploymentCapFor(WageRegion.I).Should().Be(106_200_000m, "LTT vùng đổi từ 01/01/2026, không phải 01/07");
    }

    /// <summary>Mốc 01/01/2026: giảm trừ + biểu thuế + ngưỡng khấu trừ 10% đổi cùng ngày.</summary>
    [Fact]
    public void ThamSo_Moc01_01_2026_DoiGiamTruVaBieuThue()
    {
        var y2025 = VietnamStatutoryDefaults.Resolve(new DateOnly(2025, 12, 31));
        var y2026 = VietnamStatutoryDefaults.Resolve(new DateOnly(2026, 1, 1));

        y2025.PitPersonalDeduction.Should().Be(11_000_000m);
        y2026.PitPersonalDeduction.Should().Be(15_500_000m);
        y2025.PitDependentDeduction.Should().Be(4_400_000m);
        y2026.PitDependentDeduction.Should().Be(6_200_000m);
        y2025.PitBrackets.Should().HaveCount(7);
        y2026.PitBrackets.Should().HaveCount(5);
        y2025.PitFlatThreshold.Should().Be(2_000_000m);
        y2026.PitFlatThreshold.Should().Be(5_000_000m);
        y2026.PitMealTaxFreeCap.Should().Be(730_000m, "trần ăn ca chỉ lên 1,2tr từ 01/07/2026");
    }

    /// <summary>Biểu thuế 2026 tại đúng 4 điểm gãy — suy ra tay, không qua số trừ nhanh.</summary>
    [Theory]
    [InlineData(10_000_000, 500_000)]
    [InlineData(30_000_000, 2_500_000)]
    [InlineData(60_000_000, 8_500_000)]
    [InlineData(100_000_000, 20_500_000)]
    public void Pit_BieuThue2026_DungTaiDiemGay(int income, int tax)
    {
        var parameters = VietnamStatutoryDefaults.Resolve(new DateOnly(2026, 1, 1));

        PitCalculator.Progressive(income, parameters.PitBrackets).Should().Be(tax);
    }

    /// <summary>Không có dòng OT nào thì không được phát sinh tiền OT, và thu nhập chịu thuế = lương.</summary>
    [Fact]
    public void Luong_KhongOt_KhongPhatSinhTienOt()
    {
        var result = PayrollTaxCalculator.Calculate(new PayrollTaxInput
        {
            PeriodMonth = new DateOnly(2026, 9, 1),
            PayDate = new DateOnly(2026, 10, 5),
            BasePay = 9_000_000m,
            InsurableSalary = 9_000_000m
        });

        result.Overtime.TotalPay.Should().Be(0m);
        result.Overtime.TaxablePay.Should().Be(0m);
        result.TaxableIncome.Should().Be(9_000_000m);
    }
}
