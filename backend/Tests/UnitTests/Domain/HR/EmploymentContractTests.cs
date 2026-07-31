using FluentAssertions;
using HR.Domain;
using Xunit;

namespace UnitTests.Domain.HR;

public class EmploymentContractTests
{
    private static Guid Eid = Guid.NewGuid();

    private static EmploymentContract NewFixed1Y() => new(
        Eid, "HD-2026-001", ContractType.FixedTerm1Year,
        new DateTime(2026, 1, 1), new DateTime(2027, 1, 1),
        20_000_000m, 15_000_000m);

    [Fact]
    public void KhoiTao_HDCoThoiHan_HopLe()
    {
        var c = NewFixed1Y();
        c.Type.Should().Be(ContractType.FixedTerm1Year);
        c.Status.Should().Be(ContractStatus.Draft);
    }

    [Fact]
    public void KhoiTao_HDPermanent_KhongCoEndDate_HopLe()
    {
        var c = new EmploymentContract(Eid, "HD-P-01", ContractType.Permanent,
            new DateTime(2026, 1, 1), null, 30_000_000m, 20_000_000m);
        c.EndDate.Should().BeNull();
    }

    [Fact]
    public void KhoiTao_Permanent_MaCoEndDate_NemLoi()
    {
        var act = () => new EmploymentContract(Eid, "HD-P-02", ContractType.Permanent,
            new DateTime(2026, 1, 1), new DateTime(2027, 1, 1),
            30_000_000m, 20_000_000m);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void KhoiTao_FixedTerm_KhongCoEndDate_NemLoi()
    {
        var act = () => new EmploymentContract(Eid, "HD-F", ContractType.FixedTerm3Year,
            new DateTime(2026, 1, 1), null, 30_000_000m, 20_000_000m);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void KhoiTao_EndDateTruocStart_NemLoi()
    {
        var act = () => new EmploymentContract(Eid, "HD-B", ContractType.FixedTerm1Year,
            new DateTime(2027, 1, 1), new DateTime(2026, 1, 1),
            10_000_000m, 8_000_000m);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Activate_TuDraft_ChuyenActive()
    {
        var c = NewFixed1Y();
        c.Activate();
        c.Status.Should().Be(ContractStatus.Active);
    }

    [Fact]
    public void Terminate_LuuLyDoVaThoiGian()
    {
        var c = NewFixed1Y();
        c.Activate();
        var when = new DateTime(2026, 6, 30);
        c.Terminate("Nghỉ việc theo yêu cầu", when);

        c.Status.Should().Be(ContractStatus.Terminated);
        c.TerminationReason.Should().Be("Nghỉ việc theo yêu cầu");
        c.TerminatedAt.Should().Be(when);
    }

    [Fact]
    public void Terminate_LyDoRong_NemLoi()
    {
        var c = NewFixed1Y();
        c.Activate();
        var act = () => c.Terminate("  ", DateTime.UtcNow);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void IsExpiringSoon_ConDuoi30Ngay_TraTrue()
    {
        var start = DateTime.UtcNow.AddYears(-1);
        var end = DateTime.UtcNow.AddDays(20);
        var c = new EmploymentContract(Eid, "HD-E-1", ContractType.FixedTerm1Year,
            start, end, 10_000_000m, 8_000_000m);
        c.Activate();

        c.IsExpiringSoon(30).Should().BeTrue();
    }

    [Fact]
    public void IsExpiringSoon_Con60Ngay_ThresholdMacDinh30_TraFalse()
    {
        var start = DateTime.UtcNow.AddYears(-1);
        var end = DateTime.UtcNow.AddDays(60);
        var c = new EmploymentContract(Eid, "HD-E-2", ContractType.FixedTerm1Year,
            start, end, 10_000_000m, 8_000_000m);
        c.Activate();

        c.IsExpiringSoon().Should().BeFalse();
    }

    [Fact]
    public void IsExpiringSoon_Permanent_LuonFalse()
    {
        var c = new EmploymentContract(Eid, "HD-E-3", ContractType.Permanent,
            new DateTime(2026, 1, 1), null, 30_000_000m, 20_000_000m);
        c.Activate();

        c.IsExpiringSoon(365).Should().BeFalse();
    }
}
