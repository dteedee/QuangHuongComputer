using FluentAssertions;
using HR.Domain;
using Xunit;

namespace UnitTests.Domain.HR;

public class AllowanceTests
{
    [Fact]
    public void GetDefaults_TraVe6LoaiPhoBien()
    {
        var defaults = AllowanceType.GetDefaults().ToList();
        defaults.Should().HaveCount(6);

        var codes = defaults.Select(d => d.Code).ToList();
        codes.Should().Contain(new[] { "LUNCH", "TRANSPORT", "PHONE", "UNIFORM", "HAZARD", "RESPONSIBILITY" });
    }

    [Fact]
    public void GetDefaults_AnTrua_MienThue730k()
    {
        var lunch = AllowanceType.GetDefaults().Single(d => d.Code == "LUNCH");
        lunch.TaxFreeMonthlyLimit.Should().Be(730_000m);
        lunch.IsTaxable.Should().BeFalse();
    }

    [Fact]
    public void GetDefaults_TrangPhuc_MienThue416k667_5trChiaCho12()
    {
        var uniform = AllowanceType.GetDefaults().Single(d => d.Code == "UNIFORM");
        uniform.TaxFreeMonthlyLimit.Should().Be(416_667m);
    }

    [Fact]
    public void GetDefaults_DocHai_ChiuThue_ChiuBHXH()
    {
        var hazard = AllowanceType.GetDefaults().Single(d => d.Code == "HAZARD");
        hazard.IsTaxable.Should().BeTrue();
        hazard.IsInsurable.Should().BeTrue();
    }

    [Fact]
    public void AllowanceType_KhoiTao_CodeTuDongUpper()
    {
        var t = new AllowanceType("Ăn trưa", "lunch", 730_000m, false, false);
        t.Code.Should().Be("LUNCH");
    }

    [Fact]
    public void AllowanceType_TaxFreeLimitAm_NemLoi()
    {
        var act = () => new AllowanceType("X", "X", -1m, false, false);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Allowance_KhoiTao_HopLe()
    {
        var eid = Guid.NewGuid();
        var tid = Guid.NewGuid();
        var a = new Allowance(eid, tid, 500_000m, new DateTime(2026, 1, 1));

        a.EmployeeId.Should().Be(eid);
        a.AllowanceTypeId.Should().Be(tid);
        a.Amount.Should().Be(500_000m);
    }

    [Fact]
    public void Allowance_AmountAm_NemLoi()
    {
        var act = () => new Allowance(Guid.NewGuid(), Guid.NewGuid(), -100m, DateTime.UtcNow);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Allowance_EndTruocEffective_NemLoi()
    {
        var act = () => new Allowance(Guid.NewGuid(), Guid.NewGuid(), 500_000m,
            new DateTime(2026, 6, 1), new DateTime(2026, 1, 1));
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Allowance_UpdateAmount_LuuGiaTri()
    {
        var a = new Allowance(Guid.NewGuid(), Guid.NewGuid(), 500_000m, DateTime.UtcNow);
        a.UpdateAmount(730_000m);
        a.Amount.Should().Be(730_000m);
    }

    [Fact]
    public void Allowance_IsEffectiveOn_TrongKhoang_TraTrue()
    {
        var a = new Allowance(Guid.NewGuid(), Guid.NewGuid(), 500_000m,
            new DateTime(2026, 1, 1), new DateTime(2026, 12, 31));
        a.IsEffectiveOn(new DateTime(2026, 6, 1)).Should().BeTrue();
        a.IsEffectiveOn(new DateTime(2027, 1, 1)).Should().BeFalse();
    }
}
