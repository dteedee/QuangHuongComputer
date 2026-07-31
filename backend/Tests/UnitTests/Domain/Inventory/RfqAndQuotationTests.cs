using FluentAssertions;
using InventoryModule.Domain;
using Xunit;

namespace UnitTests.Domain.Inventory;

/// <summary>
/// RFQ + báo giá NCC: nhận báo giá → so sánh → chọn NCC thắng → sinh PO.
/// </summary>
public class RfqAndQuotationTests
{
    [Fact]
    public void KhoiTaoRfq_KhongCoItem_NemLoi()
    {
        var act = () => new RequestForQuotation(Guid.NewGuid(), "[]");
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void KhoiTaoRfq_HopLe_TrangThaiDraft()
    {
        var rfq = new RequestForQuotation(Guid.NewGuid(), "[{\"productId\":\"p1\",\"qty\":5}]");
        rfq.Status.Should().Be(RfqStatus.Draft);
        rfq.Number.Should().StartWith("RFQ-");
    }

    [Fact]
    public void MarkSent_TuDraft_ChuyenSangSent()
    {
        var rfq = new RequestForQuotation(Guid.NewGuid(), "[{\"x\":1}]");
        rfq.MarkSent();
        rfq.Status.Should().Be(RfqStatus.Sent);
    }

    [Fact]
    public void Award_KhiSent_ChuyenSangAwardedVaGhiPO()
    {
        var rfq = new RequestForQuotation(Guid.NewGuid(), "[{\"x\":1}]");
        rfq.MarkSent();

        var quotId = Guid.NewGuid();
        var poId = Guid.NewGuid();
        rfq.Award(quotId, poId);

        rfq.Status.Should().Be(RfqStatus.Awarded);
        rfq.AwardedQuotationId.Should().Be(quotId);
        rfq.AwardedPOId.Should().Be(poId);
    }

    [Fact]
    public void Award_KhiChuaGui_NemLoi()
    {
        var rfq = new RequestForQuotation(Guid.NewGuid(), "[{\"x\":1}]");
        var act = () => rfq.Award(Guid.NewGuid(), Guid.NewGuid());
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Cancel_KhiDaAwarded_NemLoi()
    {
        var rfq = new RequestForQuotation(Guid.NewGuid(), "[{\"x\":1}]");
        rfq.MarkSent();
        rfq.Award(Guid.NewGuid(), Guid.NewGuid());

        var act = () => rfq.Cancel();
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Quotation_TotalAmount_Bằng_TongItem()
    {
        var items = new List<SupplierQuotationItem>
        {
            new SupplierQuotationItem(Guid.NewGuid(), 10_000_000m, minQuantity: 2, leadTimeDays: 3),
            new SupplierQuotationItem(Guid.NewGuid(), 5_000_000m, minQuantity: 1, leadTimeDays: 5),
        };
        var quot = new SupplierQuotation(Guid.NewGuid(), Guid.NewGuid(), items,
            paymentTermType: PaymentTermType.NET30, deliveryDays: 5, warrantyMonths: 12);

        // 10tr * 2 + 5tr * 1 = 25tr
        quot.TotalAmount.Should().Be(25_000_000m);
        quot.Status.Should().Be(SupplierQuotationStatus.Received);
    }

    [Fact]
    public void QuotationItem_DonGiaAm_NemLoi()
    {
        var act = () => new SupplierQuotationItem(Guid.NewGuid(), -1m);
        act.Should().Throw<ArgumentException>();
    }
}
