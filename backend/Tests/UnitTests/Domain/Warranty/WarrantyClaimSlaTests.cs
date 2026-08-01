using FluentAssertions;
using Warranty.Domain;
using Xunit;

namespace UnitTests.Domain.Warranty;

/// <summary>
/// Phase 07: WarrantyClaim mở rộng ClaimType/SLA/link WorkOrder/RMA/Loaner.
/// </summary>
public class WarrantyClaimSlaTests
{
    private static WarrantyClaim NewClaim()
        => new(Guid.NewGuid(), "SN-1", "Không lên nguồn");

    [Fact]
    public void AssignHandling_YeuCauApproved()
    {
        var c = NewClaim();
        var ex = Assert.Throws<InvalidOperationException>(() => c.AssignHandling(ClaimType.RepairAtShop, 24));
        ex.Message.Should().Contain("duyệt");
    }

    [Fact]
    public void AssignHandling_TinhSlaDeadlineDung()
    {
        var c = NewClaim();
        c.Approve();
        c.AssignHandling(ClaimType.RepairAtShop, 24);
        c.ClaimType.Should().Be(ClaimType.RepairAtShop);
        c.SlaDeadline.Should().NotBeNull();
        c.Status.Should().Be(ClaimStatus.InProgress);
    }

    [Fact]
    public void LinkWorkOrder_ChiRepairAtShop()
    {
        var c = NewClaim();
        c.Approve();
        c.AssignHandling(ClaimType.SendToManufacturer, 72);
        Assert.Throws<InvalidOperationException>(() => c.LinkWorkOrder(Guid.NewGuid()));
    }

    [Fact]
    public void LinkRma_ChiSendToManufacturer()
    {
        var c = NewClaim();
        c.Approve();
        c.AssignHandling(ClaimType.RepairAtShop, 24);
        Assert.Throws<InvalidOperationException>(() => c.LinkRma(Guid.NewGuid()));
    }

    [Fact]
    public void IsSlaBreachingAt_Dat80Percent_TraTrue()
    {
        var c = NewClaim();
        c.Approve();
        c.AssignHandling(ClaimType.RepairAtShop, 10); // 10 giờ SLA

        // Giả lập đã trôi 8 giờ (80% SLA)
        var now = DateTime.UtcNow.AddHours(8);
        c.IsSlaBreachingAt(80, now).Should().BeTrue();
    }

    [Fact]
    public void IsSlaBreachingAt_Chua80Percent_TraFalse()
    {
        var c = NewClaim();
        c.Approve();
        c.AssignHandling(ClaimType.RepairAtShop, 100);
        var now = DateTime.UtcNow.AddHours(10); // 10% SLA
        c.IsSlaBreachingAt(80, now).Should().BeFalse();
    }

    [Fact]
    public void IsSlaBreachingAt_ClaimDaResolved_TraFalse()
    {
        var c = NewClaim();
        c.Approve();
        c.AssignHandling(ClaimType.RepairAtShop, 10);
        c.Resolve("done");
        var now = DateTime.UtcNow.AddHours(20);
        c.IsSlaBreachingAt(80, now).Should().BeFalse();
    }
}
