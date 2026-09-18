using Accounting.Domain;
using Accounting.DTOs;
using Accounting.Infrastructure;
using BuildingBlocks.Configuration;
using BuildingBlocks.Documents;
using BuildingBlocks.Endpoints;
using BuildingBlocks.TaxEngine;
using BuildingBlocks.Time;
using BuildingBlocks.SharedKernel;
using VietnameseTaxEngine = BuildingBlocks.TaxEngine.VietnameseTaxEngine;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Accounting.Application.Invoicing;

/// <summary>
/// Hoá đơn bán ra lập TAY (không sinh từ đơn hàng): dịch vụ, bán lẻ ghi sổ, điều chỉnh.
///
/// Ba con số từng bị hardcode trong endpoint — tiền tệ USD, thuế suất 10%, hạn 30 ngày — nay:
/// VND cứng theo D01, thuế suất resolve theo NGÀY LẬP, hạn đọc từ <c>Accounting:InvoiceDueDays</c>.
/// </summary>
public class ManualInvoiceService
{
    private readonly AccountingDbContext _db;
    private readonly IDocumentNumberService _documentNumbers;
    private readonly IBusinessClock _clock;
    private readonly IAppSettings _settings;
    private readonly ITaxSettingsProvider? _taxSettings;
    private readonly ILogger<ManualInvoiceService> _logger;

    public ManualInvoiceService(
        AccountingDbContext db,
        IDocumentNumberService documentNumbers,
        IBusinessClock clock,
        IAppSettings settings,
        ILogger<ManualInvoiceService> logger,
        ITaxSettingsProvider? taxSettings = null)
    {
        _db = db;
        _documentNumbers = documentNumbers;
        _clock = clock;
        _settings = settings;
        _logger = logger;
        _taxSettings = taxSettings;
    }

    public async Task<Invoice> CreateAsync(CreateManualInvoiceRequest request, CancellationToken ct = default)
    {
        if (request.Lines is null || request.Lines.Count == 0)
            throw new RequestValidationException("lines", "Hoá đơn phải có ít nhất một dòng hàng.");

        var nowUtc = _clock.UtcNow.UtcDateTime;
        var dueDays = _settings.GetInt("Accounting:InvoiceDueDays", 30);
        var number = await _documentNumbers.NextAsync(DocumentNumberTypes.Invoice, ct);

        var invoice = Invoice.CreateReceivable(
            request.CustomerId,
            request.OrganizationAccountId,
            number,
            nowUtc,
            request.DueDate ?? nowUtc.AddDays(dueDays),
            request.Notes);

        ApplyBuyer(invoice, request.Buyer);
        await FillLinesAsync(invoice, request.Lines, ct);

        _db.Invoices.Add(invoice);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Hoá đơn thủ công {Number}: {Total} VND.", invoice.InvoiceNumber, invoice.TotalAmount);
        return invoice;
    }

    /// <summary>Sửa hoá đơn — CHỈ khi còn nháp (đã phát hành thì phải dùng giấy báo có).</summary>
    public async Task UpdateAsync(Invoice invoice, UpdateManualInvoiceRequest request, CancellationToken ct = default)
    {
        if (invoice.Status != InvoiceStatus.Draft)
            throw new ConflictException("Chỉ sửa được hoá đơn ở trạng thái nháp.");
        if (request.Lines is null || request.Lines.Count == 0)
            throw new RequestValidationException("lines", "Hoá đơn phải có ít nhất một dòng hàng.");

        invoice.ClearLines();
        await FillLinesAsync(invoice, request.Lines, ct);
        invoice.UpdateNotes(request.Notes);
        if (request.DueDate.HasValue) invoice.UpdateDueDate(request.DueDate.Value);
        ApplyBuyer(invoice, request.Buyer);

        await _db.SaveChangesAsync(ct);
    }

    private async Task FillLinesAsync(Invoice invoice, List<ManualInvoiceLineRequest> lines, CancellationToken ct)
    {
        var businessDate = _clock.TodayVn;
        var window = await ResolveVatWindowAsync(ct);

        foreach (var line in lines)
        {
            if (line.Quantity <= 0)
                throw new RequestValidationException("lines", "Số lượng của mỗi dòng phải lớn hơn 0.");
            if (line.UnitPriceIncludingVat < 0)
                throw new RequestValidationException("lines", "Đơn giá không được âm.");

            var statutory = (line.VatStatutoryRate ?? (TaxRates.VatStatutoryStandard * 100m)) / 100m;
            var rate = VatRateResolver.Resolve(statutory, line.VatReductionEligible, businessDate, window);

            var breakdown = VietnameseTaxEngine.ExtractVatLine(
                line.UnitPriceIncludingVat, line.Quantity, Math.Max(0m, line.Discount), 0m, rate);

            invoice.AddLine(InvoiceLine.FromExtracted(
                description: line.Description,
                quantity: line.Quantity,
                vatRatePercent: rate <= 0m ? 0m : Math.Round(rate * 100m, 2),
                grossBeforeDiscount: breakdown.GrossBeforeDiscount,
                lineDiscount: breakdown.LineDiscount,
                grossAmount: breakdown.Payable,
                netAmount: breakdown.NetAmount,
                vatAmount: breakdown.VatAmount,
                sku: line.Sku,
                unitName: string.IsNullOrWhiteSpace(line.UnitName)
                    ? OrderInvoiceLineBuilder.DefaultUnitName
                    : line.UnitName));
        }
    }

    private static void ApplyBuyer(Invoice invoice, BuyerInfoRequest? buyer)
    {
        if (buyer is null) return;
        invoice.SetBuyer(
            buyer.BuyerType, buyer.LegalName, buyer.FullName, buyer.TaxCode,
            buyer.BudgetUnitCode, buyer.Address, buyer.Email, buyer.Phone);
    }

    private async Task<VatReductionWindow> ResolveVatWindowAsync(CancellationToken ct)
    {
        if (_taxSettings is null) return VatReductionWindow.Legal;
        try
        {
            var settings = await _taxSettings.GetAsync(ct);
            return VatReductionWindow.FromSettings(settings, out _);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không đọc được cấu hình thuế GTGT — dùng hằng số luật định.");
            return VatReductionWindow.Legal;
        }
    }
}
