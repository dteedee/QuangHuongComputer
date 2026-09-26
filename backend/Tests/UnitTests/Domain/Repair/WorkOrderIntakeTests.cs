using BuildingBlocks.Endpoints;
using FluentAssertions;
using Repair.Domain;
using Xunit;

namespace UnitTests.Domain.Repair;

/// <summary>Tiếp nhận máy + linh kiện mua ngoài (không qua kho).</summary>
public class WorkOrderIntakeTests
{
    private static WorkOrder NewWorkOrder() => new(Guid.NewGuid(), "ThinkPad T14", "SN-1", "Không lên nguồn");

    [Fact]
    public void PhieuMoi_UuTienMacDinhBinhThuong()
        => NewWorkOrder().Priority.Should().Be(WorkOrderPriority.Normal);

    [Fact]
    public void CapNhatTiepNhan_ChuanHoaPhuKien_BoTrungVaRong()
    {
        var wo = NewWorkOrder();
        wo.UpdateIntake(WorkOrderPriority.Urgent, " Laptop ", "Lenovo", "ThinkPad T14 Gen 3", "PF-123",
            new[] { "Sạc", "sạc", " ", "Túi chống sốc" }, null);

        wo.Priority.Should().Be(WorkOrderPriority.Urgent);
        wo.DeviceType.Should().Be("Laptop");
        wo.DeviceModel.Should().Be("ThinkPad T14 Gen 3");
        wo.SerialNumber.Should().Be("PF-123");
        wo.AccessoriesReceived.Should().Equal("Sạc", "Túi chống sốc");
    }

    [Fact]
    public void CapNhatTiepNhan_PhieuDaHuy_BiChan()
    {
        var wo = NewWorkOrder();
        wo.Cancel("khách rút máy");
        FluentActions.Invoking(() => wo.UpdateIntake(WorkOrderPriority.Low, null, null, null, null, null, null))
            .Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void AnhTiepNhan_VuotGioiHan_BiTuChoi()
    {
        var wo = NewWorkOrder();
        wo.AddIntakePhotos(Enumerable.Range(0, WorkOrder.MaxIntakePhotos).Select(i => $"/media/u/repair/{i}.jpg").ToList());

        FluentActions.Invoking(() => wo.AddIntakePhotos(new[] { "/media/u/repair/x.jpg" }))
            .Should().Throw<RequestValidationException>();
        wo.RemoveIntakePhoto("/media/u/repair/0.jpg").Should().BeTrue();
        wo.RemoveIntakePhoto("/media/u/khac.jpg").Should().BeFalse();
    }

    [Fact]
    public void LinhKienMuaNgoai_KhongCoInventoryItem_BatBuocGiaVon()
    {
        var part = new WorkOrderPart(Guid.NewGuid(), null, "Màn hình 14\" mua ngoài", 1, 2_500_000, serialNumber: "LCD-9", unitCost: 1_900_000);

        part.IsBoughtIn.Should().BeTrue();
        part.UnitCost.Should().Be(1_900_000);
        part.SerialNumber.Should().Be("LCD-9");

        FluentActions.Invoking(() => new WorkOrderPart(Guid.NewGuid(), null, "RAM", 1, 500_000))
            .Should().Throw<RequestValidationException>();
    }

    [Fact]
    public void LinhKienTrongKho_KhongLuuGiaVon()
    {
        var part = new WorkOrderPart(Guid.NewGuid(), Guid.NewGuid(), "SSD 512GB", 1, 1_200_000, unitCost: 999);
        part.IsBoughtIn.Should().BeFalse();
        part.UnitCost.Should().BeNull("giá vốn hàng trong kho nằm ở Inventory");
    }

    [Fact]
    public void NhatKyAnh_GhiGiaiDoanVaUrl()
    {
        var log = WorkOrderActivityLog.CreatePhotos(Guid.NewGuid(), WorkOrderPhotoStage.After,
            new[] { "/media/u/repair/a.jpg" }, " đã thay màn ");
        log.PhotoStage.Should().Be(WorkOrderPhotoStage.After);
        log.PhotoUrls.Should().ContainSingle();
        log.Description.Should().Be("đã thay màn");
    }
}
