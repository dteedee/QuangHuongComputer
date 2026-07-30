using FluentAssertions;
using HR.Domain;
using Xunit;

namespace UnitTests.Domain.HR;

/// <summary>
/// Bảng lương: trạng thái đi tuần tự Draft -> Calculated -> Approved -> Processed -> Paid,
/// KHÔNG được nhảy cóc. Bonus/Deduction chỉ chấp nhận khi ở Draft hoặc Calculated.
/// NetPay không được âm dù cho tổng khấu trừ có vượt lương gốc.
///
/// LƯU Ý (lỗ hổng đã biết — sẽ sửa ở Phase 06):
/// Payroll.Calculate() KHÔNG gọi VietnameseTaxEngine, thuế TNCN và BHXH do người dùng
/// nhập tay qua AddDeduction("Tax"/"Insurance"). Test dưới đây chỉ kiểm tra HÀNH VI HIỆN TẠI
/// (state machine, biên số học), không kiểm tra tính đúng của thuế/bảo hiểm.
/// </summary>
public class PayrollTests
{
    private static Payroll NewPayroll(decimal baseSalary = 20_000_000m)
        => new Payroll(Guid.NewGuid(), 7, 2026, baseSalary);

    [Fact]
    public void KhoiTao_BangLuongMoi_StatusLaDraft_NetPayBangLuongGoc()
    {
        var p = NewPayroll(20_000_000m);

        p.Status.Should().Be(PayrollStatus.Draft);
        p.NetPay.Should().Be(20_000_000m);
        p.Deductions.Should().Be(0);
        p.Bonuses.Should().Be(0);
    }

    [Fact]
    public void KhoiTao_LuongAm_NemLoi()
    {
        var act = () => new Payroll(Guid.NewGuid(), 7, 2026, -1_000_000m);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void KhoiTao_ThangKhongHopLe_NemLoi()
    {
        var act1 = () => new Payroll(Guid.NewGuid(), 0, 2026, 10_000_000m);
        var act2 = () => new Payroll(Guid.NewGuid(), 13, 2026, 10_000_000m);

        act1.Should().Throw<ArgumentException>();
        act2.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Calculate_TongHopBonusVaDeduction_TinhDungNetPay()
    {
        var p = NewPayroll(20_000_000m);
        p.AddBonus(2_000_000m, "Performance");
        p.AddBonus(500_000m, "Attendance");
        p.AddDeduction(2_100_000m, "Insurance");
        p.AddDeduction(447_500m, "Tax");
        p.AddDeduction(100_000m, "Other");

        p.Calculate();

        p.Status.Should().Be(PayrollStatus.Calculated);
        p.Bonuses.Should().Be(2_500_000m);
        p.Deductions.Should().Be(2_647_500m);
        p.NetPay.Should().Be(19_852_500m);
        p.CalculatedAt.Should().NotBeNull();
    }

    [Fact]
    public void Calculate_KhauTruVuotLuongCongThuong_NetPayVeKhongKhongAm()
    {
        var p = NewPayroll(5_000_000m);
        p.AddDeduction(10_000_000m, "Tax"); // khấu trừ lớn hơn tổng thu nhập

        p.Calculate();

        p.NetPay.Should().Be(0);
        p.NetPay.Should().BeGreaterOrEqualTo(0);
    }

    [Fact]
    public void Calculate_KhiKhongPhaiDraft_NemLoi()
    {
        var p = NewPayroll();
        p.Calculate();

        var act = () => p.Calculate();

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void ChuyenTrangThai_DiTuanTuDuNamBuoc_ThanhCong()
    {
        var p = NewPayroll();
        p.Calculate();
        p.Approve(Guid.NewGuid());
        p.Process(Guid.NewGuid());
        p.MarkAsPaid();

        p.Status.Should().Be(PayrollStatus.Paid);
        p.ApprovedAt.Should().NotBeNull();
        p.ProcessedAt.Should().NotBeNull();
        p.PaidAt.Should().NotBeNull();
    }

    [Fact]
    public void Approve_TuDraft_NemLoi_ChanNhayCoc()
    {
        var p = NewPayroll();

        var act = () => p.Approve(Guid.NewGuid());

        act.Should().Throw<InvalidOperationException>();
        p.Status.Should().Be(PayrollStatus.Draft);
    }

    [Fact]
    public void Process_TuCalculated_NemLoi_PhaiApproveTruoc()
    {
        var p = NewPayroll();
        p.Calculate();

        var act = () => p.Process(Guid.NewGuid());

        act.Should().Throw<InvalidOperationException>();
        p.Status.Should().Be(PayrollStatus.Calculated);
    }

    [Fact]
    public void MarkAsPaid_TuApproved_NemLoi_PhaiProcessTruoc()
    {
        var p = NewPayroll();
        p.Calculate();
        p.Approve(Guid.NewGuid());

        var act = () => p.MarkAsPaid();

        act.Should().Throw<InvalidOperationException>();
        p.Status.Should().Be(PayrollStatus.Approved);
    }

    [Fact]
    public void AddBonus_KhiDaApproved_NemLoi()
    {
        var p = NewPayroll();
        p.Calculate();
        p.Approve(Guid.NewGuid());

        var act = () => p.AddBonus(500_000m);

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void AddDeduction_KhiDaProcessed_NemLoi()
    {
        var p = NewPayroll();
        p.Calculate();
        p.Approve(Guid.NewGuid());
        p.Process(Guid.NewGuid());

        var act = () => p.AddDeduction(100_000m, "Tax");

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void AddBonus_SoTienAm_NemLoi()
    {
        var p = NewPayroll();

        var act = () => p.AddBonus(-100_000m);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void AddDeduction_SoTienAm_NemLoi()
    {
        var p = NewPayroll();

        var act = () => p.AddDeduction(-100_000m, "Tax");

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void SetWorkHours_LamThemGio_TinhOvertimePayGap15Lan()
    {
        var p = NewPayroll();

        p.SetWorkHours(regularHours: 176m, overtimeHours: 10m, hourlyRate: 100_000m);

        p.OvertimeHours.Should().Be(10m);
        p.OvertimePay.Should().Be(1_500_000m); // 10 x 100k x 1.5
    }

    [Fact]
    public void SetWorkHours_TyGiaAm_NemLoi()
    {
        var p = NewPayroll();

        var act = () => p.SetWorkHours(160m, 0m, -1m);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void RevertToDraft_TuApproved_TraVeDraft_XoaThongTinDuyet()
    {
        var p = NewPayroll();
        p.Calculate();
        p.Approve(Guid.NewGuid());

        p.RevertToDraft();

        p.Status.Should().Be(PayrollStatus.Draft);
        p.ApprovedBy.Should().BeNull();
        p.ApprovedAt.Should().BeNull();
        p.CalculatedAt.Should().BeNull();
    }

    [Fact]
    public void RevertToDraft_TuPaid_NemLoi_KhongDuocLatBangDaTra()
    {
        var p = NewPayroll();
        p.Calculate();
        p.Approve(Guid.NewGuid());
        p.Process(Guid.NewGuid());
        p.MarkAsPaid();

        var act = () => p.RevertToDraft();

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void GetPeriodDescription_TraVeChuoiKyLuong()
    {
        var p = new Payroll(Guid.NewGuid(), 3, 2026, 10_000_000m);

        p.GetPeriodDescription().Should().Be("2026-03");
    }
}
