using FluentAssertions;
using HR.Domain;
using Xunit;

namespace UnitTests.Domain.HR;

public class DependentTests
{
    private static Guid Eid = Guid.NewGuid();

    [Fact]
    public void KhoiTao_HopLe_TaoRecord()
    {
        var d = new Dependent(Eid, "Nguyen Van B", DependentRelation.Child,
            new DateTime(2015, 6, 1), new DateTime(2024, 1, 1));

        d.EmployeeId.Should().Be(Eid);
        d.FullName.Should().Be("Nguyen Van B");
        d.Relation.Should().Be(DependentRelation.Child);
    }

    [Fact]
    public void KhoiTao_DeductionEndTruocStart_NemLoi()
    {
        var act = () => new Dependent(Eid, "X", DependentRelation.Child,
            new DateTime(2015, 1, 1),
            deductionStartDate: new DateTime(2024, 6, 1),
            deductionEndDate: new DateTime(2024, 1, 1));
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void KhoiTao_EmployeeIdTrong_NemLoi()
    {
        var act = () => new Dependent(Guid.Empty, "X", DependentRelation.Child,
            new DateTime(2015, 1, 1), new DateTime(2024, 1, 1));
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void KhoiTao_TaxCodeSai_NemLoi()
    {
        var act = () => new Dependent(Eid, "X", DependentRelation.Child,
            new DateTime(2015, 1, 1), new DateTime(2024, 1, 1), taxCode: "abc");
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void IsActiveOn_TrongKhoang_TraTrue()
    {
        var d = new Dependent(Eid, "B", DependentRelation.Child,
            new DateTime(2015, 1, 1),
            new DateTime(2024, 1, 1),
            new DateTime(2026, 12, 31));

        d.IsActiveOn(new DateTime(2025, 6, 1)).Should().BeTrue();
    }

    [Fact]
    public void IsActiveOn_TruocStart_TraFalse()
    {
        var d = new Dependent(Eid, "B", DependentRelation.Child,
            new DateTime(2015, 1, 1), new DateTime(2024, 1, 1));

        d.IsActiveOn(new DateTime(2023, 12, 31)).Should().BeFalse();
    }

    [Fact]
    public void IsActiveOn_SauEnd_TraFalse()
    {
        var d = new Dependent(Eid, "B", DependentRelation.Child,
            new DateTime(2015, 1, 1),
            new DateTime(2024, 1, 1),
            new DateTime(2024, 12, 31));

        d.IsActiveOn(new DateTime(2025, 1, 1)).Should().BeFalse();
    }

    [Fact]
    public void EndDeduction_LuuEndDate()
    {
        var d = new Dependent(Eid, "B", DependentRelation.Child,
            new DateTime(2015, 1, 1), new DateTime(2024, 1, 1));
        d.EndDeduction(new DateTime(2026, 6, 30));
        d.DeductionEndDate.Should().Be(new DateTime(2026, 6, 30));
    }

    [Fact]
    public void EndDeduction_TruocStart_NemLoi()
    {
        var d = new Dependent(Eid, "B", DependentRelation.Child,
            new DateTime(2015, 1, 1), new DateTime(2024, 1, 1));
        var act = () => d.EndDeduction(new DateTime(2023, 1, 1));
        act.Should().Throw<ArgumentException>();
    }
}
