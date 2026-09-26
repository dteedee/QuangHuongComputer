using FluentAssertions;
using Repair.Application.Commission;
using Repair.Domain;
using Xunit;

namespace UnitTests.Domain.Repair;

/// <summary>
/// Căn cứ hoa hồng kỹ thuật (IRepairCommissionSourceQuery) sau khi báo giá có dòng: tiền công +
/// dịch vụ của báo giá KHÁCH ĐÃ DUYỆT (sau giảm giá, gồm VAT), linh kiện luôn bị loại.
/// </summary>
public class RepairCommissionBaseTests
{
    private static WorkOrder DiagnosedWorkOrder()
    {
        var wo = new WorkOrder(Guid.NewGuid(), "HP Pavilion", "SN-7", "Vỡ bản lề");
        wo.AssignTechnician(Guid.NewGuid());
        wo.MarkAsDiagnosed("Thay bản lề + vệ sinh");
        return wo;
    }

    private static RepairQuote QuoteWithLines(WorkOrder wo, decimal quoteDiscount)
    {
        var quote = new RepairQuote(wo.Id, 1.5m, 200_000);
        quote.ReplaceLines(new[]
        {
            new RepairQuoteLineDraft(RepairQuoteLineKind.Part, "Bản lề thay thế", 2, 350_000),
            new RepairQuoteLineDraft(RepairQuoteLineKind.Labor, "Công thay bản lề", 1.5m, 200_000),
            new RepairQuoteLineDraft(RepairQuoteLineKind.Service, "Vệ sinh máy", 1, 150_000, LineDiscount: 50_000),
            new RepairQuoteLineDraft(RepairQuoteLineKind.Other, "Phí gửi hãng", 1, 20_000),
        }, quoteDiscount, 0.08m);
        wo.CreateQuote(quote);
        return quote;
    }

    [Fact]
    public void BaoGiaDaDuyet_CanCuLaCongCongDichVu_KhongGomLinhKien()
    {
        var wo = DiagnosedWorkOrder();
        var quote = QuoteWithLines(wo, quoteDiscount: 0);
        quote.Approve();
        wo.ApproveQuote(quote.TotalCost);

        var (labor, service) = RepairCommissionSourceQuery.CommissionBase(wo);

        labor.Should().Be(300_000);            // 1,5 × 200.000
        service.Should().Be(100_000 + 20_000); // dịch vụ sau giảm dòng + khác
        (labor + service).Should().Be(quote.TotalCost - quote.PartsCost);
        quote.PartsCost.Should().Be(700_000, "linh kiện có trong báo giá nhưng không vào căn cứ");
    }

    [Fact]
    public void GiamGiaCaPhieu_DaPhanBoVaoCongVaDichVu_TruocKhiTinhCanCu()
    {
        var wo = DiagnosedWorkOrder();
        var quote = QuoteWithLines(wo, quoteDiscount: 112_000); // 10% của 1.120.000 sau giảm dòng
        quote.Approve();
        wo.ApproveQuote(quote.TotalCost);

        var (labor, service) = RepairCommissionSourceQuery.CommissionBase(wo);

        labor.Should().Be(270_000);
        service.Should().Be(90_000 + 18_000);
        (labor + service + quote.PartsCost).Should().Be(quote.TotalCost);
    }

    [Fact]
    public void BaoGiaChuaDuyet_DungChiPhiTrenPhieuNhuCu()
    {
        var wo = DiagnosedWorkOrder();
        QuoteWithLines(wo, 0); // còn Pending

        RepairCommissionSourceQuery.CommissionBase(wo).Should().Be((wo.LaborCost, wo.ServiceFee));
    }
}
