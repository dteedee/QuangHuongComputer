using BuildingBlocks.Endpoints;
using BuildingBlocks.Messaging.IntegrationEvents;
using Catalog.Infrastructure;
using InventoryModule.Infrastructure;
using MassTransit;
using Sales.Application.Loyalty;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Application.Returns;

/// <summary>
/// Phase 07: điều phối 3 luồng Refund / Exchange / Replace.
///  1. RequestAsync — khách gửi yêu cầu; verify OrderItem thuộc order của khách,
///     kiểm chính sách hạn theo Category, tạo ReturnRequest.
///  2. ProcessAfterInspectionAsync — sau kiểm hàng: gọi RestockService, xử lý tiền/đơn mới, Complete.
/// </summary>
public partial class ReturnOrchestrator
{
    private readonly SalesDbContext _salesDb;
    private readonly CatalogDbContext _catalogDb;
    private readonly RestockService _restockService;
    private readonly IPublishEndpoint _bus;

    public ReturnOrchestrator(
        SalesDbContext salesDb,
        CatalogDbContext catalogDb,
        RestockService restockService,
        IPublishEndpoint bus)
    {
        _salesDb = salesDb;
        _catalogDb = catalogDb;
        _restockService = restockService;
        _bus = bus;
    }

    public async Task<ReturnRequest> RequestAsync(
        CreateReturnRequestInput input,
        Guid customerId,
        CancellationToken ct = default)
    {
        // 1. Đơn phải thuộc khách đang yêu cầu (IDOR).
        var order = await _salesDb.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == input.OrderId && o.CustomerId == customerId, ct)
            ?? throw new NotFoundException("Đơn hàng không tồn tại hoặc không thuộc khách hàng.");

        var orderItem = order.Items.FirstOrDefault(i => i.Id == input.OrderItemId)
            ?? throw new NotFoundException("Sản phẩm trong đơn không tồn tại.");

        // 2. MỘT dòng đơn chỉ được có MỘT yêu cầu đang mở, và không bao giờ hoàn tiền hai lần.
        //    Trước đây không có kiểm tra nào: gửi cùng một yêu cầu ba lần thì hoàn tiền ba lần.
        var existing = await _salesDb.ReturnRequests
            .Where(r => r.OrderItemId == input.OrderItemId)
            .Select(r => new { r.Id, r.Status })
            .ToListAsync(ct);

        if (existing.Any(r => r.Status is ReturnStatus.Completed or ReturnStatus.Refunded))
            throw new ConflictException("Sản phẩm này đã được hoàn tiền/đổi trả xong — không yêu cầu lại được.");
        if (existing.Any(r => r.Status is ReturnStatus.Pending or ReturnStatus.Approved))
            throw new ConflictException("Sản phẩm này đang có một yêu cầu đổi trả chưa xử lý xong.");

        // 3. D08 — chính sách hiệu lực leo ngược cây danh mục + ma trận lý do.
        var resolution = await ReturnPolicyResolver.ResolveAsync(
            _salesDb, _catalogDb, orderItem.ProductId, ct);

        var assessment = ReturnReasonRules.Assess(
            input.ReasonCode, input.Type, resolution.Policy,
            resolution.ProductExcluded, resolution.WarrantyMonths,
            // D08: mốc tính hạn là NGÀY GIAO, không phải ngày đặt.
            order.DeliveredAt ?? order.CompletedAt,
            DateTime.UtcNow);

        if (!assessment.Allowed) throw new ConflictException(assessment.Reason!);

        // 4. Tiền hoàn lấy từ snapshot đã đóng băng trên dòng đơn (D01), không từ client.
        var originalAmount = orderItem.LineTotal;

        ReturnRequest rr = input.Type switch
        {
            ReturnType.Refund => ReturnRequest.RequestRefund(
                input.OrderId, input.OrderItemId, input.Reason, originalAmount,
                input.Description, input.AttachmentUrls, input.CustomerNotes),
            ReturnType.Exchange => ReturnRequest.RequestExchange(
                input.OrderId, input.OrderItemId,
                input.ExchangeProductId ?? throw new RequestValidationException(
                    "exchangeProductId", "Đổi sang sản phẩm khác thì phải chọn sản phẩm thay thế."),
                input.ExchangeVariantId,
                input.Reason, originalAmount,
                input.Description, input.AttachmentUrls, input.CustomerNotes),
            ReturnType.Replace => ReturnRequest.RequestReplace(
                input.OrderId, input.OrderItemId, input.Reason, originalAmount,
                input.Description, input.AttachmentUrls, input.CustomerNotes),
            _ => throw new RequestValidationException("type", "Loại yêu cầu đổi trả không hợp lệ."),
        };

        _salesDb.ReturnRequests.Add(rr);
        _salesDb.Entry(rr).Property("ReasonCode").CurrentValue = (int)input.ReasonCode;
        await _salesDb.SaveChangesAsync(ct);

        // Mở việc hoàn tiền cho Payments (W2-4) ngay khi khách gửi yêu cầu hoàn tiền.
        if (input.Type == ReturnType.Refund)
        {
            await _bus.Publish(new RefundRequestedEvent(
                rr.Id, order.Id, order.CustomerId, originalAmount,
                $"{input.ReasonCode}: {input.Reason}", DateTime.UtcNow), ct);
        }

        return rr;
    }

    /// <summary>Lý do trả hàng đã lưu của một yêu cầu (đọc từ cột shadow <c>ReasonCode</c>).</summary>
    public async Task<ReturnReasonCode> ReasonCodeOfAsync(Guid returnRequestId, CancellationToken ct = default)
    {
        var raw = await _salesDb.ReturnRequests
            .Where(r => r.Id == returnRequestId)
            .Select(r => EF.Property<int?>(r, "ReasonCode"))
            .FirstOrDefaultAsync(ct);

        return raw.HasValue && Enum.IsDefined(typeof(ReturnReasonCode), raw.Value)
            ? (ReturnReasonCode)raw.Value
            : ReturnReasonCode.ChangeOfMind;
    }

    /// <summary>
    /// D08 — chính sách hiệu lực cho một SẢN PHẨM (leo ngược cây danh mục đến gốc, 10 tầng).
    /// Thay hoàn toàn bản cũ chỉ khớp đúng danh mục lá.
    /// </summary>
    public Task<ReturnPolicyResolver.Resolution> GetEffectivePolicyAsync(
        Guid productId, CancellationToken ct = default)
        => ReturnPolicyResolver.ResolveAsync(_salesDb, _catalogDb, productId, ct);

    /// <summary>
    /// D08 + D01 — tiền hoàn = payable của dòng đơn gốc trừ phí khấu trừ.
    /// Phí CHỈ tồn tại với lý do "đổi ý"; mọi lý do thuộc nghĩa vụ người bán khấu trừ 0%.
    /// (Bản cũ trừ cứng 20% cho mọi ca thiếu phụ kiện — <c>baseAmount * 0.8m</c> — kể cả khi hàng
    /// giao sai; đó là trừ tiền khách trái D08.)
    /// </summary>
    private async Task<decimal> ComputeRefundAmountAsync(ReturnRequest rr, CancellationToken ct)
    {
        // AsNoTracking là BẮT BUỘC, không phải tối ưu: OrderItem là owned entity của Order, và
        // EF Core từ chối theo dõi một owned entity bị chiếu ra ngoài owner của nó
        // ("A tracking query is attempting to project an owned entity without a corresponding
        // owner"). Thiếu dòng này thì MỌI lần tính tiền hoàn đều ném exception lúc chạy.
        // Ở đây chỉ đọc để tính số tiền nên không cần tracking.
        var orderItem = await _salesDb.Orders
            .AsNoTracking()
            .Where(o => o.Id == rr.OrderId)
            .SelectMany(o => o.Items)
            .FirstOrDefaultAsync(i => i.Id == rr.OrderItemId, ct);

        if (orderItem == null) return 0m;

        var reasonCode = await ReasonCodeOfAsync(rr.Id, ct);
        var resolution = await ReturnPolicyResolver.ResolveAsync(
            _salesDb, _catalogDb, orderItem.ProductId, ct);

        var feePercent = resolution.Policy == null
            ? 0m
            : ReturnReasonRules.FeePercent(reasonCode, rr.ReceivedCondition, resolution.Policy);

        return RefundCalculator.ForWholeLine(orderItem, feePercent).Amount;
    }

}

public record CreateReturnRequestInput(
    Guid OrderId,
    Guid OrderItemId,
    ReturnType Type,
    string Reason,
    ReturnReasonCode ReasonCode = ReturnReasonCode.ChangeOfMind,
    string? Description = null,
    string? CustomerNotes = null,
    string? AttachmentUrls = null,
    Guid? ExchangeProductId = null,
    Guid? ExchangeVariantId = null);

public record ProcessResult(
    Guid ReturnRequestId,
    ReturnType Type,
    decimal RefundAmount,
    Guid? ExchangeOrderId,
    decimal PriceDifference,
    Guid GoodsReceivedNoteId);
