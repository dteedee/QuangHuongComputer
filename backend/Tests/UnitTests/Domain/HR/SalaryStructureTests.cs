using FluentAssertions;
using HR.Domain;
using Xunit;

namespace UnitTests.Domain.HR;

public class SalaryStructureTests
{
    private static Guid Eid = Guid.NewGuid();

    [Fact]
    public void KhoiTao_HopLe_LuuBaseVaInsurable()
    {
        var s = new SalaryStructure(Eid, 20_000_000m, 15_000_000m, new DateTime(2026, 1, 1));
        s.BaseSalary.Should().Be(20_000_000m);
        s.InsurableSalary.Should().Be(15_000_000m);
        s.EndDate.Should().BeNull();
    }

    [Fact]
    public void KhoiTao_BaseSalaryAm_NemLoi()
    {
        var act = () => new SalaryStructure(Eid, -1m, 15_000_000m, DateTime.UtcNow);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void KhoiTao_EndTruocEffective_NemLoi()
    {
        var act = () => new SalaryStructure(Eid, 20_000_000m, 15_000_000m,
            new DateTime(2026, 6, 1), endDate: new DateTime(2026, 1, 1));
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void IsEffectiveOn_TrongKhoang_TraTrue()
    {
        var s = new SalaryStructure(Eid, 20_000_000m, 15_000_000m,
            new DateTime(2026, 1, 1), endDate: new DateTime(2026, 12, 31));
        s.IsEffectiveOn(new DateTime(2026, 6, 15)).Should().BeTrue();
    }

    [Fact]
    public void GetEffectiveOn_TraDungRecordTheoNgay()
    {
        var s1 = new SalaryStructure(Eid, 15_000_000m, 12_000_000m,
            new DateTime(2024, 1, 1), endDate: new DateTime(2024, 12, 31));
        var s2 = new SalaryStructure(Eid, 20_000_000m, 15_000_000m,
            new DateTime(2025, 1, 1), endDate: new DateTime(2025, 12, 31));
        var s3 = new SalaryStructure(Eid, 25_000_000m, 20_000_000m,
            new DateTime(2026, 1, 1));

        var list = new[] { s1, s2, s3 };

        list.GetEffectiveOn(new DateTime(2024, 6, 1))!.BaseSalary.Should().Be(15_000_000m);
        list.GetEffectiveOn(new DateTime(2025, 6, 1))!.BaseSalary.Should().Be(20_000_000m);
        list.GetEffectiveOn(new DateTime(2026, 6, 1))!.BaseSalary.Should().Be(25_000_000m);
    }

    [Fact]
    public void GetEffectiveOn_KhongCoRecordPhuHop_TraNull()
    {
        var s = new SalaryStructure(Eid, 20_000_000m, 15_000_000m,
            new DateTime(2026, 1, 1), endDate: new DateTime(2026, 12, 31));
        new[] { s }.GetEffectiveOn(new DateTime(2027, 6, 1)).Should().BeNull();
    }

    [Fact]
    public void CloseAt_LuuEndDate()
    {
        var s = new SalaryStructure(Eid, 20_000_000m, 15_000_000m, new DateTime(2026, 1, 1));
        s.CloseAt(new DateTime(2026, 6, 30));
        s.EndDate.Should().Be(new DateTime(2026, 6, 30));
    }

    [Fact]
    public void CloseAt_TruocEffective_NemLoi()
    {
        var s = new SalaryStructure(Eid, 20_000_000m, 15_000_000m, new DateTime(2026, 6, 1));
        var act = () => s.CloseAt(new DateTime(2026, 1, 1));
        act.Should().Throw<ArgumentException>();
    }
}
