using Accounting.Domain;
using Accounting.Infrastructure;
using BuildingBlocks.Documents;
using BuildingBlocks.Messaging.IntegrationEvents;
using BuildingBlocks.Time;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Accounting.Application.Consumers;

/// <summary>
/// Consumes POReceivedEvent from Inventory module to automatically create AP Invoice
/// when goods are received from a purchase order.
///
/// Phase 05 luồng B: xử lý hạn thanh toán theo Supplier.PaymentTerms
/// (COD/NET7/NET15/NET30/NET45/NET60/Prepaid/Custom) và idempotent theo (POId, GoodsReceiptId)
/// để tránh sinh Invoice trùng khi event replay.
/// </summary>
public class POReceivedConsumer : IConsumer<POReceivedEvent>
{
    private readonly AccountingDbContext _dbContext;
    private readonly IDocumentNumberService _documentNumbers;
    private readonly IBusinessClock _clock;
    private readonly ILogger<POReceivedConsumer> _logger;

    public POReceivedConsumer(
        AccountingDbContext dbContext,
        IDocumentNumberService documentNumbers,
        IBusinessClock clock,
        ILogger<POReceivedConsumer> logger)
    {
        _dbContext = dbContext;
        _documentNumbers = documentNumbers;
        _clock = clock;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<POReceivedEvent> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Creating AP Invoice for PO {PONumber} from Supplier {SupplierId}",
            msg.PONumber, msg.SupplierId);

        // Idempotency: đã có Invoice cho (POId, GoodsReceiptId) → bỏ qua để tránh trùng
        // khi consumer replay message hoặc GRN xác nhận nhiều lần.
        var existing = await _dbContext.Invoices
            .AsNoTracking()
            .Where(i => i.Type == InvoiceType.Payable
                        && i.PurchaseOrderId == msg.POId
                        && i.GoodsReceiptId == msg.GoodsReceiptId)
            .Select(i => new { i.Id, i.InvoiceNumber })
            .FirstOrDefaultAsync();
        if (existing != null)
        {
            _logger.LogInformation(
                "AP Invoice already exists for PO {PONumber} / GRN {GRNId}: {InvoiceNumber} — skip",
                msg.PONumber, msg.GoodsReceiptId, existing.InvoiceNumber);
            return;
        }

        // Tính hạn thanh toán theo Supplier.PaymentTerms (đọc trực tiếp bảng suppliers qua raw SQL
        // — không import Inventory module, chỉ dùng Guid supplierId).
        var (dueDays, termLabel) = await ResolvePaymentTermsAsync(msg.SupplierId, context.CancellationToken);
        var nowUtc = _clock.UtcNow.UtcDateTime;
        var dueDate = nowUtc.AddDays(dueDays);
        var number = await _documentNumbers.NextAsync(DocumentNumberTypes.Invoice, context.CancellationToken);

        var invoice = Invoice.CreatePayable(
            msg.SupplierId,
            number,
            nowUtc,
            dueDate,
            $"PO: {msg.PONumber} — điều khoản thanh toán: {termLabel}",
            msg.POId,
            msg.GoodsReceiptId
        );

        foreach (var item in msg.Items)
        {
            // Giá mua từ nhà cung cấp là giá CHƯA thuế: thuế được CỘNG THÊM
            // (ngược với giá bán lẻ trong nước, vốn đã gồm thuế và phải TÁCH ra — xem
            // OrderInvoiceLineBuilder). Đây là lý do hai đường dựng dòng không dùng chung công thức.
            var vatRatePercent = item.VatRate > 1m ? item.VatRate : item.VatRate * 100m;
            var net = Math.Round(item.UnitPrice * item.Quantity, 0, MidpointRounding.AwayFromZero);
            var vat = Math.Round(net * vatRatePercent / 100m, 0, MidpointRounding.AwayFromZero);

            invoice.AddLine(InvoiceLine.FromExtracted(
                description: item.ProductName,
                quantity: item.Quantity,
                vatRatePercent: vatRatePercent,
                grossBeforeDiscount: net + vat,
                lineDiscount: 0m,
                grossAmount: net + vat,
                netAmount: net,
                vatAmount: vat,
                unitName: "Cái"));
        }

        invoice.Issue(nowUtc);

        _dbContext.Invoices.Add(invoice);

        try
        {
            await _dbContext.SaveChangesAsync(context.CancellationToken);
        }
        catch (DbUpdateException ex) when (
            ex.InnerException?.Message.Contains("IX_Invoices_PO_GRN_Unique", StringComparison.OrdinalIgnoreCase) == true)
        {
            // W2-14 verify (lần 3): hai lần giao cùng một POReceivedEvent chạy song song đều qua
            // được bước kiểm tra ở trên. Unique index là lớp chặn thật; ở đây nuốt để message
            // không quay vòng error queue — hoá đơn mua vào đã do consumer kia lập.
            _dbContext.ChangeTracker.Clear();
            _logger.LogInformation(
                "Một consumer khác vừa lập hoá đơn mua vào cho PO {PONumber} / GRN {GRNId} — bỏ qua.",
                msg.PONumber, msg.GoodsReceiptId);
            return;
        }

        _logger.LogInformation(
            "AP Invoice {InvoiceNumber} created for PO {PONumber}, Total: {Total}, Due: {Due} ({Term})",
            invoice.InvoiceNumber, msg.PONumber, invoice.TotalAmount, dueDate, termLabel);
    }

    /// <summary>
    /// Đọc điều khoản thanh toán của Supplier từ bảng suppliers qua raw SQL.
    /// Không import entity Supplier — cross-module coupling chỉ qua Guid + primitive fields.
    /// Nếu không tìm thấy hoặc bảng chưa có (test in-memory) → mặc định NET30.
    /// </summary>
    private async Task<(int Days, string Label)> ResolvePaymentTermsAsync(Guid supplierId, CancellationToken ct)
    {
        try
        {
            var conn = _dbContext.Database.GetDbConnection();
            var opened = conn.State != System.Data.ConnectionState.Open;
            if (opened) await conn.OpenAsync(ct);
            try
            {
                using var cmd = conn.CreateCommand();
                cmd.CommandText =
                    "SELECT \"PaymentTerms\", \"PaymentDays\" FROM \"Suppliers\" WHERE \"Id\" = @id LIMIT 1";
                var p = cmd.CreateParameter();
                p.ParameterName = "@id";
                p.Value = supplierId;
                cmd.Parameters.Add(p);
                using var reader = await cmd.ExecuteReaderAsync(ct);
                if (await reader.ReadAsync(ct))
                {
                    // PaymentTerms lưu int (enum), hoặc string tuỳ EF config.
                    // Đọc như object để linh hoạt.
                    var term = reader.GetValue(0);
                    var customDays = reader.IsDBNull(1) ? (int?)null : reader.GetInt32(1);
                    var (days, label) = MapPaymentTerms(term, customDays);
                    return (days, label);
                }
            }
            finally
            {
                if (opened) await conn.CloseAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to resolve payment terms for supplier {SupplierId} — fallback NET30", supplierId);
        }
        return (30, "NET30");
    }

    private static (int Days, string Label) MapPaymentTerms(object termRaw, int? customDays)
    {
        // PaymentTermType: COD=0, NET7=1, NET15=2, NET30=3, NET45=4, NET60=5, Prepaid=6, Custom=7
        var termStr = termRaw?.ToString() ?? "COD";
        return termStr switch
        {
            "COD" or "0" => (0, "COD"),
            "NET7" or "1" => (7, "NET7"),
            "NET15" or "2" => (15, "NET15"),
            "NET30" or "3" => (30, "NET30"),
            "NET45" or "4" => (45, "NET45"),
            "NET60" or "5" => (60, "NET60"),
            "Prepaid" or "6" => (0, "Prepaid"),
            "Custom" or "7" => (customDays ?? 30, $"Custom({customDays ?? 30}d)"),
            _ => (30, "NET30")
        };
    }
}
