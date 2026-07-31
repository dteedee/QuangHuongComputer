using FluentAssertions;
using InventoryModule.Domain;
using Xunit;

namespace UnitTests.Domain.Inventory;

/// <summary>
/// Vòng đời duyệt PO: Draft → PendingApproval → Approved → Sent → Received.
/// Rejected → có thể mở lại về Draft để sửa. Send chỉ cho phép từ Approved.
/// </summary>
public class PurchaseOrderApprovalTests
{
    private static PurchaseOrder NewPO(Guid? creator = null, decimal price = 1_000_000m)
    {
        var items = new List<PurchaseOrderItem>
        {
            new PurchaseOrderItem(Guid.NewGuid(), 5, price)
        };
        return new PurchaseOrder(Guid.NewGuid(), items, creator);
    }

    [Fact]
    public void KhoiTao_TrangThaiMacDinh_LaDraft()
    {
        var po = NewPO();
        po.Status.Should().Be(POStatus.Draft);
        po.TotalAmount.Should().Be(5_000_000m);
    }

    [Fact]
    public void SubmitForApproval_DangDraft_ChuyenSangPendingApproval()
    {
        var po = NewPO();
        var userId = Guid.NewGuid();

        po.SubmitForApproval(userId);

        po.Status.Should().Be(POStatus.PendingApproval);
        po.SubmittedBy.Should().Be(userId);
        po.SubmittedAt.Should().NotBeNull();
    }

    [Fact]
    public void SubmitForApproval_TrangThaiKhongPhaiDraft_NemLoi()
    {
        var po = NewPO();
        po.SubmitForApproval(Guid.NewGuid());
        po.Approve(Guid.NewGuid());

        var act = () => po.SubmitForApproval(Guid.NewGuid());

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Approve_DangPending_ChuyenSangApproved()
    {
        var po = NewPO();
        po.SubmitForApproval(Guid.NewGuid());
        var approver = Guid.NewGuid();

        po.Approve(approver);

        po.Status.Should().Be(POStatus.Approved);
        po.ApprovedBy.Should().Be(approver);
        po.ApprovedAt.Should().NotBeNull();
    }

    [Fact]
    public void Approve_KhiChuaGuiDuyet_NemLoi()
    {
        var po = NewPO();
        var act = () => po.Approve(Guid.NewGuid());
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Reject_ThieuLyDo_NemArgumentException()
    {
        var po = NewPO();
        po.SubmitForApproval(Guid.NewGuid());

        var act = () => po.Reject(Guid.NewGuid(), "");

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Reject_DungLyDo_ChuyenSangRejectedVaGhiLyDo()
    {
        var po = NewPO();
        po.SubmitForApproval(Guid.NewGuid());
        var approver = Guid.NewGuid();

        po.Reject(approver, "Giá cao hơn NCC khác 15%");

        po.Status.Should().Be(POStatus.Rejected);
        po.RejectedBy.Should().Be(approver);
        po.RejectionReason.Should().Be("Giá cao hơn NCC khác 15%");
    }

    [Fact]
    public void ReopenForEdit_TuRejected_QuayVeDraft()
    {
        var po = NewPO();
        po.SubmitForApproval(Guid.NewGuid());
        po.Reject(Guid.NewGuid(), "Sai NCC");

        po.ReopenForEdit();

        po.Status.Should().Be(POStatus.Draft);
    }

    [Fact]
    public void Send_ChuaApproved_KhongDuocGuiChoNCC()
    {
        var po = NewPO();
        // Trước Phase 05: Draft → Sent. Sau Phase 05: phải Approved.
        var act = () => po.Send();
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Send_DaApproved_ChuyenSangSent()
    {
        var po = NewPO();
        po.SubmitForApproval(Guid.NewGuid());
        po.Approve(Guid.NewGuid());

        po.Send();

        po.Status.Should().Be(POStatus.Sent);
    }

    [Fact]
    public void LinkToRequisition_GhiLaiNguon()
    {
        var po = NewPO();
        var reqId = Guid.NewGuid();
        po.LinkToRequisition(reqId);
        po.RequisitionId.Should().Be(reqId);
    }
}
