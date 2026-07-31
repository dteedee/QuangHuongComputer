using FluentAssertions;
using SystemConfig.Domain;
using Xunit;

namespace UnitTests.Domain.SystemConfig;

/// <summary>
/// Kiểm entity Store — chi nhánh cửa hàng vật lý.
/// </summary>
public class StoreTests
{
    [Fact]
    public void KhoiTao_DayDuFieldBatBuoc_TaoThanhCong()
    {
        var s = new Store("HN-CG", "Cầu Giấy", "1 Trần Duy Hưng", "0912345678");
        s.Code.Should().Be("HN-CG");
        s.Name.Should().Be("Cầu Giấy");
        s.Address.Should().Be("1 Trần Duy Hưng");
        s.Phone.Should().Be("0912345678");
        s.IsActive.Should().BeTrue();
        s.IsPickupPoint.Should().BeTrue();
        // Giờ mở cửa mặc định phải có JSON hợp lệ với đủ 7 ngày.
        s.OpeningHoursJson.Should().Contain("mon").And.Contain("sun");
    }

    [Fact]
    public void KhoiTao_CodeRong_NemLoi()
    {
        var act = () => new Store("", "Cầu Giấy", "1 Trần Duy Hưng", "090");
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void KhoiTao_NameRong_NemLoi()
    {
        var act = () => new Store("HN-CG", "  ", "1 Trần Duy Hưng", "090");
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void KhoiTao_AddressRong_NemLoi()
    {
        var act = () => new Store("HN-CG", "Cầu Giấy", "", "090");
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void UpdateBasicInfo_DoiThongTin()
    {
        var s = new Store("HN-CG", "Cầu Giấy", "1 Trần Duy Hưng", "090");
        s.UpdateBasicInfo("Cầu Giấy 2", "2 Trần Duy Hưng", "0918",
            "Trung Hoà", "Cầu Giấy", "Hà Nội",
            "shop@x.vn", 21.03m, 105.79m, isPickupPoint: false, sortOrder: 5);
        s.Name.Should().Be("Cầu Giấy 2");
        s.Ward.Should().Be("Trung Hoà");
        s.Province.Should().Be("Hà Nội");
        s.Email.Should().Be("shop@x.vn");
        s.Latitude.Should().Be(21.03m);
        s.Longitude.Should().Be(105.79m);
        s.IsPickupPoint.Should().BeFalse();
        s.SortOrder.Should().Be(5);
    }

    [Fact]
    public void AssignWarehouse_KhongTrungLap()
    {
        var s = new Store("HN-CG", "Cầu Giấy", "1 Trần Duy Hưng", "090");
        var wid = Guid.NewGuid();
        s.AssignWarehouse(wid);
        s.AssignWarehouse(wid); // gọi lại — không thêm
        s.Warehouses.Should().HaveCount(1);
    }

    [Fact]
    public void UnassignWarehouse_XoaWarehouse()
    {
        var s = new Store("HN-CG", "Cầu Giấy", "1 Trần Duy Hưng", "090");
        var wid = Guid.NewGuid();
        s.AssignWarehouse(wid);
        s.UnassignWarehouse(wid);
        s.Warehouses.Should().BeEmpty();
    }

    [Fact]
    public void AssignEmployee_LuuRole()
    {
        var s = new Store("HN-CG", "Cầu Giấy", "1 Trần Duy Hưng", "090");
        var eid = Guid.NewGuid();
        s.AssignEmployee(eid, "StoreManager");
        s.Employees.Should().HaveCount(1);
        s.Employees.First().Role.Should().Be("StoreManager");
    }

    [Fact]
    public void ActivateDeactivate_DoiTrangThai()
    {
        var s = new Store("HN-CG", "Cầu Giấy", "1 Trần Duy Hưng", "090");
        s.Deactivate();
        s.IsActive.Should().BeFalse();
        s.Activate();
        s.IsActive.Should().BeTrue();
    }

    [Fact]
    public void SetOpeningHours_LuuJson()
    {
        var s = new Store("HN-CG", "Cầu Giấy", "1 Trần Duy Hưng", "090");
        s.SetOpeningHours("{\"mon\":\"08:00-22:00\"}");
        s.OpeningHoursJson.Should().Be("{\"mon\":\"08:00-22:00\"}");
    }

    [Fact]
    public void SetOpeningHours_Empty_TraDefaultRong()
    {
        var s = new Store("HN-CG", "Cầu Giấy", "1 Trần Duy Hưng", "090");
        s.SetOpeningHours("");
        s.OpeningHoursJson.Should().Be("{}");
    }

    [Fact]
    public void StoreWarehouse_MarkUnmarkPrimary()
    {
        var sw = new StoreWarehouse(Guid.NewGuid(), Guid.NewGuid());
        sw.IsPrimary.Should().BeFalse();
        sw.MarkPrimary();
        sw.IsPrimary.Should().BeTrue();
        sw.UnmarkPrimary();
        sw.IsPrimary.Should().BeFalse();
    }
}
