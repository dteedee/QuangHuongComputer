using FluentAssertions;
using HR.Domain;
using Xunit;

namespace UnitTests.Domain.HR;

/// <summary>
/// EmployeeAsset: cấp phát → thu hồi, không cho thu hồi 2 lần,
/// bắt buộc các trường quan trọng.
/// </summary>
public class EmployeeAssetTests
{
    private static EmployeeAsset NewAsset(decimal value = 25_000_000m)
        => new(
            employeeId: Guid.NewGuid(),
            assetType: "Laptop",
            assetCode: "LT-001",
            value: value,
            conditionOnAssign: AssetCondition.New);

    [Fact]
    public void Constructor_HopLe_TaoAsset()
    {
        var a = NewAsset();

        a.IsReturned.Should().BeFalse();
        a.ConditionOnAssign.Should().Be(AssetCondition.New);
        a.Value.Should().Be(25_000_000m);
    }

    [Fact]
    public void Constructor_ThieuAssetType_NemLoi()
    {
        var act = () => new EmployeeAsset(Guid.NewGuid(), "", "LT-001", 1m);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Constructor_ThieuAssetCode_NemLoi()
    {
        var act = () => new EmployeeAsset(Guid.NewGuid(), "Laptop", "", 1m);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Constructor_ValueAm_NemLoi()
    {
        var act = () => new EmployeeAsset(Guid.NewGuid(), "Laptop", "LT-001", -1m);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Return_LanDau_GhiNhanDayDu()
    {
        var a = NewAsset();
        var receiver = Guid.NewGuid();

        a.Return(AssetCondition.Good, receiver, "Máy còn hoạt động tốt");

        a.IsReturned.Should().BeTrue();
        a.ReturnedDate.Should().NotBeNull();
        a.ConditionOnReturn.Should().Be(AssetCondition.Good);
        a.ReceivedBy.Should().Be(receiver);
    }

    [Fact]
    public void Return_LanThuHai_NemLoi()
    {
        var a = NewAsset();
        a.Return(AssetCondition.Good, Guid.NewGuid());

        var act = () => a.Return(AssetCondition.Good, Guid.NewGuid());

        act.Should().Throw<InvalidOperationException>();
    }
}
