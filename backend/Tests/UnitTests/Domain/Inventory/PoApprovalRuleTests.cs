using FluentAssertions;
using InventoryModule.Application.Purchasing;
using InventoryModule.Domain;
using Xunit;

namespace UnitTests.Domain.Inventory;

/// <summary>
/// Hạn mức duyệt PO + chặn tự duyệt.
/// </summary>
public class PoApprovalRuleTests
{
    [Fact]
    public void KhoiTaoRule_MaxNhoHonMin_NemLoi()
    {
        var act = () => new POApprovalRule("Bad", 1000m, 500m, "Admin");
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void KhoiTaoRule_ThieuRole_NemLoi()
    {
        var act = () => new POApprovalRule("A", 0m, 1000m, "");
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Matches_TrongKhoang_ChoTrueAndCanBien()
    {
        var rule = new POApprovalRule("Trưởng kho", 0m, 50_000_000m, "StoreManager");

        rule.Matches(0m).Should().BeTrue();       // biên dưới
        rule.Matches(25_000_000m).Should().BeTrue();
        rule.Matches(49_999_999m).Should().BeTrue();
        rule.Matches(50_000_000m).Should().BeFalse(); // biên trên loại trừ
        rule.Matches(60_000_000m).Should().BeFalse();
    }

    [Fact]
    public void Matches_KhiInactive_LuonFalse()
    {
        var rule = new POApprovalRule("R", 0m, 1000m, "X");
        rule.IsActive = false;
        rule.Matches(500m).Should().BeFalse();
    }

    [Fact]
    public void EnsureNotSelfApproval_NguoiTaoTuDuyet_NemLoi()
    {
        var creator = Guid.NewGuid();
        var items = new List<PurchaseOrderItem> { new(Guid.NewGuid(), 1, 100m) };
        var po = new PurchaseOrder(Guid.NewGuid(), items, creator);

        var act = () => PoApprovalService.EnsureNotSelfApproval(po, creator);
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void EnsureNotSelfApproval_NguoiGuiDuyetTuDuyet_NemLoi()
    {
        var creator = Guid.NewGuid();
        var submitter = Guid.NewGuid();
        var items = new List<PurchaseOrderItem> { new(Guid.NewGuid(), 1, 100m) };
        var po = new PurchaseOrder(Guid.NewGuid(), items, creator);
        po.SubmitForApproval(submitter);

        var act = () => PoApprovalService.EnsureNotSelfApproval(po, submitter);
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void EnsureNotSelfApproval_NguoiKhac_KhongNemLoi()
    {
        var creator = Guid.NewGuid();
        var approver = Guid.NewGuid();
        var items = new List<PurchaseOrderItem> { new(Guid.NewGuid(), 1, 100m) };
        var po = new PurchaseOrder(Guid.NewGuid(), items, creator);
        po.SubmitForApproval(creator);

        var act = () => PoApprovalService.EnsureNotSelfApproval(po, approver);
        act.Should().NotThrow();
    }
}
