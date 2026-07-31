using FluentAssertions;
using InventoryModule.Domain;
using Xunit;

namespace UnitTests.Domain.Inventory;

/// <summary>
/// Đề nghị mua: Draft → Submitted → Approved → ConvertedToPO | Rejected | Cancelled.
/// Chuyển thành PO chỉ được khi đã Approved.
/// </summary>
public class PurchaseRequisitionTests
{
    private static PurchaseRequisition NewPR(int qty = 5)
    {
        var items = new List<PurchaseRequisitionItem>
        {
            new PurchaseRequisitionItem(Guid.NewGuid(), "Sản phẩm test", qty, "note")
        };
        return new PurchaseRequisition(Guid.NewGuid(), "Nhân viên A", items, UrgencyLevel.Medium, "Cần gấp");
    }

    [Fact]
    public void KhoiTao_KhongCoItem_NemLoi()
    {
        var act = () => new PurchaseRequisition(Guid.NewGuid(), "A", new List<PurchaseRequisitionItem>());
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void KhoiTao_MacDinh_LaDraftVaCoNumber()
    {
        var pr = NewPR();
        pr.Status.Should().Be(PurchaseRequisitionStatus.Draft);
        pr.Number.Should().StartWith("PR-");
        pr.Items.Should().HaveCount(1);
    }

    [Fact]
    public void Submit_TuDraft_ChuyenSangSubmitted()
    {
        var pr = NewPR();
        pr.Submit();
        pr.Status.Should().Be(PurchaseRequisitionStatus.Submitted);
    }

    [Fact]
    public void Approve_ChuaSubmit_NemLoi()
    {
        var pr = NewPR();
        var act = () => pr.Approve(Guid.NewGuid());
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Reject_ThieuLyDo_NemLoi()
    {
        var pr = NewPR();
        pr.Submit();
        var act = () => pr.Reject(Guid.NewGuid(), "");
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void ConvertToPO_KhiChuaApproved_NemLoi()
    {
        var pr = NewPR();
        pr.Submit();
        var act = () => pr.ConvertToPO(Guid.NewGuid(), Guid.NewGuid(), new Dictionary<Guid, decimal>());
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void ConvertToPO_KhiApproved_SinhPOVaLuuLienKet()
    {
        var pr = NewPR();
        pr.Submit();
        pr.Approve(Guid.NewGuid());

        var productId = pr.Items[0].ProductId;
        var prices = new Dictionary<Guid, decimal> { [productId] = 12_500_000m };
        var supplierId = Guid.NewGuid();
        var creator = Guid.NewGuid();

        var po = pr.ConvertToPO(supplierId, creator, prices);

        po.SupplierId.Should().Be(supplierId);
        po.Items.Should().HaveCount(1);
        po.Items[0].UnitPrice.Should().Be(12_500_000m);
        po.TotalAmount.Should().Be(12_500_000m * pr.Items[0].Quantity);
        po.RequisitionId.Should().Be(pr.Id);
        pr.Status.Should().Be(PurchaseRequisitionStatus.ConvertedToPO);
        pr.ConvertedPOId.Should().Be(po.Id);
    }

    [Fact]
    public void ConvertToPO_Urgent_TruyenIsUrgentSangPO()
    {
        var items = new List<PurchaseRequisitionItem>
        {
            new PurchaseRequisitionItem(Guid.NewGuid(), "gấp", 1)
        };
        var pr = new PurchaseRequisition(Guid.NewGuid(), null, items, UrgencyLevel.Urgent);
        pr.Submit();
        pr.Approve(Guid.NewGuid());

        var po = pr.ConvertToPO(Guid.NewGuid(), Guid.NewGuid(), new Dictionary<Guid, decimal>());

        po.IsUrgent.Should().BeTrue();
    }

    [Fact]
    public void Cancel_KhiDaConverted_NemLoi()
    {
        var pr = NewPR();
        pr.Submit();
        pr.Approve(Guid.NewGuid());
        pr.ConvertToPO(Guid.NewGuid(), Guid.NewGuid(), new Dictionary<Guid, decimal>());

        var act = () => pr.Cancel();
        act.Should().Throw<InvalidOperationException>();
    }
}
