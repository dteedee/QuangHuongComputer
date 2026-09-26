using FluentAssertions;
using HR.Application.Commission;
using HR.Domain;
using Xunit;

namespace UnitTests.Domain.HR.Commission;

/// <summary>Quy tắc tiền + kỳ của hoa hồng kỹ thuật (phần thuần, không DB).</summary>
public class CommissionCalculatorTests
{
    private static readonly CommissionRate Default = new(10m, 0m, IsDefault: true);
    private static readonly DateTime PaidSep15 = new(2026, 9, 15, 3, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Tien_cong_cong_phi_dich_vu_nhan_ty_le_cong_tien_co_dinh()
    {
        var quote = CommissionCalculator.Calculate(500_000m, 100_000m, new CommissionRate(10m, 20_000m, false), PaidSep15);

        quote.BaseAmount.Should().Be(600_000m, "căn cứ = tiền công + phí dịch vụ; linh kiện không được đưa vào");
        quote.Amount.Should().Be(80_000m, "600.000 × 10% + 20.000 cố định");
        quote.RatePercent.Should().Be(10m);
        quote.FixedAmount.Should().Be(20_000m);
    }

    [Fact]
    public void Lam_tron_ve_dong_nguyen()
    {
        var quote = CommissionCalculator.Calculate(333_333m, 0m, new CommissionRate(7.5m, 0m, false), PaidSep15);

        quote.Amount.Should().Be(25_000m, "333.333 × 7,5% = 24.999,975 -> làm tròn 25.000 VND");
        (quote.Amount % 1m).Should().Be(0m);
    }

    [Fact]
    public void Tien_am_hoac_bang_khong_khong_sinh_hoa_hong_theo_ty_le()
    {
        var quote = CommissionCalculator.Calculate(-50_000m, 0m, Default, PaidSep15);

        quote.BaseAmount.Should().Be(0m);
        quote.Amount.Should().Be(0m);
    }

    [Theory]
    [InlineData("2026-09-30T16:59:59Z", "2026-09")] // 23:59:59 giờ VN ngày 30/9
    [InlineData("2026-09-30T17:00:00Z", "2026-10")] // 00:00 giờ VN ngày 1/10
    [InlineData("2026-12-31T17:30:00Z", "2027-01")]
    public void Ky_tinh_theo_gio_Viet_Nam(string paidAtUtc, string expectedPeriod)
    {
        var paid = DateTime.Parse(paidAtUtc, null, System.Globalization.DateTimeStyles.AdjustToUniversal);

        CommissionCalculator.Calculate(100_000m, 0m, Default, paid).Period.Should().Be(expectedPeriod);
    }

    [Fact]
    public void Muc_rieng_lay_moc_hieu_luc_gan_nhat_truoc_ngay_thanh_toan()
    {
        var emp = Guid.NewGuid();
        var history = new[]
        {
            new CommissionPolicy(emp, 5m, 0m, new DateOnly(2026, 1, 1)),
            new CommissionPolicy(emp, 12m, 10_000m, new DateOnly(2026, 9, 1)),
            new CommissionPolicy(emp, 20m, 0m, new DateOnly(2026, 10, 1)),
        };

        CommissionCalculator.ResolveRate(history, new DateOnly(2026, 8, 31), Default)
            .Should().Be(new CommissionRate(5m, 0m, false));
        CommissionCalculator.ResolveRate(history, new DateOnly(2026, 9, 15), Default)
            .Should().Be(new CommissionRate(12m, 10_000m, false));
        CommissionCalculator.ResolveRate(history, new DateOnly(2025, 12, 31), Default)
            .Should().Be(Default, "trước mốc riêng đầu tiên thì dùng mặc định SystemConfig");
    }

    [Fact]
    public void Bien_ky_quy_ra_UTC_theo_mui_gio_Viet_Nam()
    {
        var (from, to) = CommissionPeriod.UtcBounds("2026-09");

        from.Should().Be(new DateTime(2026, 8, 31, 17, 0, 0, DateTimeKind.Utc));
        to.Should().Be(new DateTime(2026, 9, 30, 17, 0, 0, DateTimeKind.Utc));
    }

    [Theory]
    [InlineData("2026-09", true)]
    [InlineData("2026-13", false)]
    [InlineData("2026-9", false)]
    [InlineData("", false)]
    public void Kiem_tra_dinh_dang_ky(string period, bool valid)
        => CommissionPeriod.IsValid(period).Should().Be(valid);

    [Fact]
    public void Muc_rieng_ngoai_khoang_bi_tu_choi()
    {
        var act = () => new CommissionPolicy(Guid.NewGuid(), 101m, 0m, new DateOnly(2026, 1, 1));
        act.Should().Throw<ArgumentException>();
        var negative = () => new CommissionPolicy(Guid.NewGuid(), 10m, -1m, new DateOnly(2026, 1, 1));
        negative.Should().Throw<ArgumentException>();
    }
}
