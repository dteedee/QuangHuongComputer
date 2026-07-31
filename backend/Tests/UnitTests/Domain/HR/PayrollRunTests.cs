using FluentAssertions;
using HR.Domain;
using Xunit;

namespace UnitTests.Domain.HR;

/// <summary>
/// PayrollRun: state machine Draft → Calculated → Approved → Paid,
/// bảng lương đã Approved BẤT BIẾN (Payroll con throw khi mutate).
/// </summary>
public class PayrollRunTests
{
    private static PayrollRun NewRun() => new(2026, 6);

    private static Payroll NewPayroll(Guid? runId = null)
    {
        var p = new Payroll(Guid.NewGuid(), 6, 2026, 20_000_000m);
        if (runId.HasValue) p.AssignToRun(runId.Value);
        return p;
    }

    [Fact]
    public void Constructor_HopLe_StatusDraft_TenTuDong()
    {
        var run = NewRun();
        run.Status.Should().Be(PayrollRunStatus.Draft);
        run.Name.Should().Contain("06/2026");
        run.Payrolls.Should().BeEmpty();
    }

    [Fact]
    public void Constructor_MonthKhongHopLe_NemLoi()
    {
        var act = () => new PayrollRun(2026, 0);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void AddPayroll_KyKhac_NemLoi()
    {
        var run = NewRun();
        var p = new Payroll(Guid.NewGuid(), 7, 2026, 10_000_000m);   // tháng 7 vs run tháng 6

        var act = () => run.AddPayroll(p);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void AddPayroll_TrungEmployee_NemLoi()
    {
        var run = NewRun();
        var empId = Guid.NewGuid();
        run.AddPayroll(new Payroll(empId, 6, 2026, 10_000_000m));

        var act = () => run.AddPayroll(new Payroll(empId, 6, 2026, 12_000_000m));

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void MarkCalculated_CapNhatTongHop()
    {
        var run = NewRun();
        var p1 = new Payroll(Guid.NewGuid(), 6, 2026, 20_000_000m);
        var p2 = new Payroll(Guid.NewGuid(), 6, 2026, 15_000_000m);
        run.AddPayroll(p1);
        run.AddPayroll(p2);

        run.MarkCalculated();

        run.Status.Should().Be(PayrollRunStatus.Calculated);
        run.EmployeeCount.Should().Be(2);
        run.TotalGrossPay.Should().Be(35_000_000m);
    }

    [Fact]
    public void Approve_TuDraft_NemLoi_PhaiCalculatedTruoc()
    {
        var run = NewRun();

        var act = () => run.Approve(Guid.NewGuid());

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Approve_ApproveTatCaPayrollCon()
    {
        var run = NewRun();
        var p = new Payroll(Guid.NewGuid(), 6, 2026, 10_000_000m);
        p.Calculate();
        run.AddPayroll(p);
        run.MarkCalculated();

        run.Approve(Guid.NewGuid());

        run.Status.Should().Be(PayrollRunStatus.Approved);
        p.Status.Should().Be(PayrollStatus.Approved);
    }

    [Fact]
    public void MarkAsPaid_TuApproved_ChuyenPayrollConSangPaid()
    {
        var run = NewRun();
        var p = new Payroll(Guid.NewGuid(), 6, 2026, 10_000_000m);
        p.Calculate();
        run.AddPayroll(p);
        run.MarkCalculated();
        run.Approve(Guid.NewGuid());

        run.MarkAsPaid(Guid.NewGuid());

        run.Status.Should().Be(PayrollRunStatus.Paid);
        p.Status.Should().Be(PayrollStatus.Paid);
    }

    [Fact]
    public void Cancel_TuApproved_NemLoi()
    {
        var run = NewRun();
        var p = new Payroll(Guid.NewGuid(), 6, 2026, 10_000_000m);
        p.Calculate();
        run.AddPayroll(p);
        run.MarkCalculated();
        run.Approve(Guid.NewGuid());

        var act = () => run.Cancel("test");

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void PayrollTrongRun_SauApproved_KhongRevertDuoc()
    {
        // Bảng lương đã Approved trong Run = BẤT BIẾN
        var run = NewRun();
        var runId = run.Id;
        var p = NewPayroll(runId);
        p.Calculate();
        p.Approve(Guid.NewGuid());   // trực tiếp approve

        var act = () => p.RevertToDraft();

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*BẤT BIẾN*");
    }

    [Fact]
    public void PayrollKhongCoRun_SauApproved_VanRevertDuoc_LegacyBackCompat()
    {
        // Backward compat: nếu Payroll không thuộc PayrollRun, legacy revert vẫn work
        var p = new Payroll(Guid.NewGuid(), 6, 2026, 10_000_000m);
        p.Calculate();
        p.Approve(Guid.NewGuid());

        p.RevertToDraft();

        p.Status.Should().Be(PayrollStatus.Draft);
    }
}
