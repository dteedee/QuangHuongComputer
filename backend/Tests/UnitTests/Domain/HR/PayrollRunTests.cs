using FluentAssertions;
using HR.Domain;
using HR.Infrastructure;
using Microsoft.EntityFrameworkCore;
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
    public void MarkCalculated_KhongCoPayrollNao_NemLoi()
    {
        // W0-8: chặn strand — Run 0 nhân viên không được chuyển sang Calculated.
        var run = NewRun();

        var act = () => run.MarkCalculated();

        act.Should().Throw<InvalidOperationException>();
        run.Status.Should().Be(PayrollRunStatus.Draft);
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

    // ============================================================
    // W0-8 — EF mapping regression: PayrollRun.Payrolls từng bị Ignore()
    // ở HRDbContext, khiến .Include(r => r.Payrolls) throw runtime trên
    // MỌI request calculate/approve (500 ở PayrollRunService + PayrollEndpoints).
    // ============================================================

    [Fact]
    public async Task EfMapping_IncludePayrolls_KhongThrow_VaLoadDungDuLieu()
    {
        var dbName = "payrollrun-mapping-" + Guid.NewGuid();
        var options = new DbContextOptionsBuilder<HRDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

        Guid runId, payrollId;
        await using (var writeDb = new HRDbContext(options))
        {
            var run = new PayrollRun(2026, 9);
            runId = run.Id;
            var payroll = new Payroll(Guid.NewGuid(), 9, 2026, 20_000_000m);
            payrollId = payroll.Id;
            writeDb.PayrollRuns.Add(run);
            writeDb.Payrolls.Add(payroll);
            payroll.AssignToRun(run.Id);
            run.AddPayroll(payroll);
            await writeDb.SaveChangesAsync();
        }

        // Context MỚI (không dùng chung change tracker) để buộc EF đọc lại từ store thật
        // qua navigation đã map, thay vì trả instance đã tracked sẵn.
        await using var readDb = new HRDbContext(options);
        PayrollRun? loaded = null;
        Func<Task> act = async () =>
        {
            loaded = await readDb.PayrollRuns
                .Include(r => r.Payrolls)
                .FirstOrDefaultAsync(r => r.Id == runId);
        };

        await act.Should().NotThrowAsync();
        loaded.Should().NotBeNull();
        loaded!.Payrolls.Should().ContainSingle(p => p.Id == payrollId);
    }
}
