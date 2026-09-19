using BuildingBlocks.Endpoints;
using BuildingBlocks.Messaging.IntegrationEvents;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Sales.Application.Loyalty;
using Sales.Domain;

namespace Sales.Application.Returns;

/// <summary>
/// Nửa sau của luồng đổi trả: SAU KHI ĐÃ KIỂM HÀNG — nhập lại kho, tính tiền hoàn, dựng đơn đổi,
/// phát sự kiện và đảo điểm thưởng. Tách khỏi nửa trước ("khách có được trả không") vì hai nửa
/// trả lời hai câu hỏi khác nhau và hỏng theo hai kiểu khác nhau.
/// </summary>
public partial class ReturnOrchestrator
{
    /// <summary>
    /// Sau khi kiểm hàng: nhập kho + xử lý tiền/đơn mới, Complete.
    /// Refund : hoàn tiền qua phương thức gốc → RefundAmount có thể trừ restocking fee.
    /// Exchange: tạo Order mới cho SP thay thế (giá hiện tại) → tính PriceDifference.
    /// Replace : xuất máy cùng SKU (chưa implement DeliveryNote real — trả metadata).
    /// </summary>
    public async Task<ProcessResult> ProcessAfterInspectionAsync(
        Guid returnRequestId,
        string processedBy,
        CancellationToken ct = default)
    {
        var rr = await _salesDb.ReturnRequests
            .FirstOrDefaultAsync(r => r.Id == returnRequestId, ct)
            ?? throw new InvalidOperationException("Không tìm thấy ReturnRequest.");

        if (rr.InspectedAt == null)
            throw new InvalidOperationException("Chưa kiểm hàng (chống gian lận): gọi RecordInspection trước.");

        // W4-5 (bảo mật): CHẶN TRƯỚC KHI NHẬP KHO. rr.Complete() cũng kiểm tra Status nhưng nó
        // chạy SAU bước 1, mà RestockService ghi vào InventoryDbContext bằng SaveChanges RIÊNG —
        // nên lần gọi thứ hai (double-click / retry) đã cộng tồn + sinh GRN trùng rồi mới ném lỗi.
        // Kết quả cũ: caller nhận 400 trong khi kho đã bị cộng khống vĩnh viễn.
        if (rr.Status != ReturnStatus.Approved)
            throw new ConflictException($"Chỉ hoàn tất yêu cầu đã duyệt. Hiện: {rr.Status}");

        // 1. Nhập lại kho (mọi luồng đều nhập lại hàng khách trả về).
        var restock = await _restockService.RestockAsync(rr.Id, ct);

        decimal finalRefund = 0m;
        Guid? exchangeOrderId = null;
        decimal priceDifference = 0m;

        // 2. Xử lý theo luồng.
        switch (rr.Type)
        {
            case ReturnType.Refund:
                finalRefund = await ComputeRefundAmountAsync(rr, ct);
                rr.Complete(processedBy, finalRefund);
                break;

            case ReturnType.Exchange:
                (exchangeOrderId, priceDifference) =
                    await ReturnExchangeOrderFactory.CreateAsync(_salesDb, _catalogDb, rr, ct);
                rr.AttachExchangeOrder(exchangeOrderId.Value, priceDifference);
                rr.Complete(processedBy);
                break;

            case ReturnType.Replace:
                // Cùng SKU, không phát sinh tiền. DeliveryNote sinh ở tầng endpoint hoặc phase sau.
                rr.Complete(processedBy);
                break;
        }

        await _salesDb.SaveChangesAsync(ct);

        var owner = await _salesDb.Orders.AsNoTracking()
            .Where(o => o.Id == rr.OrderId).Select(o => o.CustomerId).FirstOrDefaultAsync(ct);
        await _bus.Publish(new ReturnCompletedEvent(
            rr.Id, rr.OrderId, owner, finalRefund, DateTime.UtcNow), ct);

        // Trả hàng ⇒ ĐẢO điểm đã tích cho đơn đó (phase-48 bước 5).
        await LoyaltyLedger.ReverseForOrderAsync(
            _salesDb, rr.OrderId, $"Đảo điểm do trả hàng {rr.Id}", ct);

        return new ProcessResult(
            ReturnRequestId: rr.Id,
            Type: rr.Type,
            RefundAmount: rr.Type == ReturnType.Refund ? finalRefund : 0m,
            ExchangeOrderId: exchangeOrderId,
            PriceDifference: priceDifference,
            GoodsReceivedNoteId: restock.GoodsReceivedNoteId);
    }
}
