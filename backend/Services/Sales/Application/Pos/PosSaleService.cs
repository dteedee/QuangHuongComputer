using BuildingBlocks.Configuration;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Sales.Application.Checkout;
using Sales.Application.Loyalty;
using Sales.Application.Orders;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Application.Pos;

/// <summary>
/// CHỐT ĐƠN TẠI QUẦY — `POST /api/sales/pos/orders` (phase-48 bước 2).
///
/// Lỗi được sửa: màn hình POS đang POST vào `/api/sales/checkout` của KHÁCH. Hệ quả đo được:
/// hình thức thanh toán, cờ nhận tại quầy và kênh bán bị bỏ, phí ship 30.000đ bị cộng lén vào
/// mọi đơn bán tại quầy, đơn nằm lại ở Pending/Unpaid nên không có hoá đơn và không có bảo hành,
/// và ca bán hàng không nhận được đồng tiền mặt nào.
///
/// Đường đi ở đây dùng LẠI toàn bộ hạ tầng đã có, không dựng đơn riêng:
///   giỏ tạm → <see cref="CheckoutOrchestrator"/> (channel = Pos, giá + khuyến mãi + VAT + trừ tồn)
///   → <see cref="OrderLifecycleService.RecordTenderAsync"/> cho từng dòng tender (IR w2#17)
///   → chuyển <c>Fulfilled</c> khi đã thu đủ → tích điểm.
/// Sự kiện <c>OrderPaid</c> / <c>OrderDelivered</c> (⇒ <c>InvoiceRequested</c>) do
/// <c>OrderEventPublisher</c> phát khi thu đủ — đơn quầy bàn giao ngay nên không có bước giao hàng.
/// </summary>
public sealed class PosSaleService
{
    private readonly SalesDbContext _db;
    private readonly InventoryDbContext _inventoryDb;
    private readonly CheckoutOrchestrator _checkout;
    private readonly PosQuoteService _quotes;
    private readonly OrderLifecycleService _lifecycle;
    private readonly IAppSettings _settings;

    public PosSaleService(
        SalesDbContext db,
        InventoryDbContext inventoryDb,
        CheckoutOrchestrator checkout,
        PosQuoteService quotes,
        OrderLifecycleService lifecycle,
        IAppSettings settings)
    {
        _db = db;
        _inventoryDb = inventoryDb;
        _checkout = checkout;
        _quotes = quotes;
        _lifecycle = lifecycle;
        _settings = settings;
    }

    public sealed record Outcome(PosSaleResult? Result, string? Error, int StatusCode);

    public async Task<Outcome> SellAsync(
        PosSaleRequest req, string cashierId, bool mayTakeDeposit, CancellationToken ct)
    {
        // 1. CỬA HÀNG — không có cửa hàng thì không biết trừ kho nào và ca nào nhận tiền (D09).
        var storeExists = await _inventoryDb.Warehouses.AnyAsync(w => w.Id == req.StoreId, ct);
        if (!storeExists)
            return new Outcome(null, "Cửa hàng/kho bán không tồn tại. Chọn lại điểm bán.", 409);

        // 2. GIỎ TẠM — giá lấy từ CSDL, không nhận đơn giá từ màn hình quầy.
        var (cart, cartError, products) = await _quotes.BuildCartAsync(req.Lines, ct);
        if (cart == null) return new Outcome(null, cartError, 400);

        PosQuoteResult quote;
        try
        {
            quote = await _quotes.QuoteAsync(
                cart, products, req.ManualDiscount, req.ApprovedBy, cashierId,
                req.PromotionCodes, req.CustomerId, ct);
        }
        catch (PosDiscountRejectedException ex)
        {
            return new Outcome(null, ex.Message, 400);
        }

        // 3. TIỀN — kiểm trước khi tạo đơn: tender sai thì không được để lại đơn rác đã trừ tồn.
        var plan = PosTenderPlan.Build(req.Tenders, quote.Total, $"POS-{DateTime.UtcNow:yyyyMMddHHmmss}");
        if (plan.Error != null) return new Outcome(null, plan.Error, 400);
        if (plan.IsDeposit && !mayTakeDeposit)
            return new Outcome(null,
                $"Thu {plan.Collected:#,##0}đ chưa đủ tổng đơn {quote.Total:#,##0}đ. "
                + "Nhận đặt cọc cần quyền Sales.TakeDeposit.", 403);

        // 4. Giỏ phải nằm trong CSDL trước khi orchestrator đọc nó.
        _db.Carts.Add(cart);
        await _db.SaveChangesAsync(ct);

        CheckoutResult checkout;
        try
        {
            checkout = await _checkout.ExecuteAsync(
                PosCheckoutRequestFactory.Build(req, cart, cashierId, quote.ManualDiscountApplied), ct);
        }
        finally
        {
            await DiscardTempCartAsync(cart.Id, ct);
        }

        if (!checkout.Success || !checkout.OrderId.HasValue)
            return new Outcome(null, checkout.ErrorMessage ?? "Không chốt được đơn tại quầy.", 400);

        var orderId = checkout.OrderId.Value;

        // Tổng đơn lưu xuống PHẢI khớp con số đã đọc cho khách ở bước tạm tính. Lệch = một khuyến
        // mãi vừa hết hạn giữa hai bước, hoặc một lỗi tính tiền — cả hai đều phải nói ra, không
        // được im lặng biến thành "thu thiếu" rồi treo đơn ở PartiallyPaid.
        if (checkout.TotalAmount.HasValue && checkout.TotalAmount.Value != quote.Total)
        {
            return new Outcome(null,
                $"Tổng đơn đã đổi giữa lúc tạm tính ({quote.Total:#,##0}đ) và lúc chốt "
                + $"({checkout.TotalAmount.Value:#,##0}đ). Bấm tạm tính lại trước khi thu tiền.", 409);
        }

        // 5. THU TIỀN qua lối vào duy nhất — nó ghi OrderPayments, đổi PaymentStatus, ghi lịch sử
        //    và phát sự kiện hoá đơn khi đủ tiền (IR w2#17).
        decimal collected = 0m, due = quote.Total;
        foreach (var line in plan.Lines)
        {
            var tender = await _lifecycle.RecordTenderAsync(
                orderId, line.Method, line.Amount, line.Reference, cashierId,
                line.Tendered, req.ShiftId, ct);
            collected = tender.Collected;
            due = tender.Due;
        }

        // 6. BÀN GIAO — khách cầm hàng về ngay. Đặt cọc thì KHÔNG: hàng ở lại quầy (D10 quy tắc 9).
        var order = await _lifecycle.LoadAsync(orderId, ct);
        if (due <= 0m)
        {
            order = await _lifecycle.TransitionAsync(
                orderId, OrderStatus.Fulfilled, cashierId, "Giao hàng tại quầy", ct: ct);
        }

        await RecordDiscountTrailAsync(order, quote, req, cashierId, ct);
        await ResumeHeldOrderAsync(req.HeldOrderId, orderId, ct);

        var points = due <= 0m
            ? await LoyaltyLedger.EarnForOrderAsync(_db, _settings, order, ct)
            : 0;

        return new Outcome(new PosSaleResult(
            OrderId: order.Id,
            OrderNumber: order.OrderNumber,
            Total: order.TotalAmount,
            Collected: collected,
            AmountDue: due,
            ChangeDue: plan.ChangeDue,
            Status: order.Status.ToString(),
            PaymentStatus: order.PaymentStatus.ToString(),
            FulfillmentStatus: order.FulfillmentStatus.ToString(),
            IsDeposit: plan.IsDeposit,
            LoyaltyPointsEarned: points), null, 201);
    }

    /// <summary>Giỏ tạm của quầy là rác sau khi chốt — không để nó nằm lẫn với giỏ thật của khách.</summary>
    private async Task DiscardTempCartAsync(Guid cartId, CancellationToken ct)
    {
        var temp = await _db.Carts.Include(c => c.Items).FirstOrDefaultAsync(c => c.Id == cartId, ct);
        if (temp == null) return;
        _db.Carts.Remove(temp);
        await _db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Giảm giá tay phải quy được trách nhiệm: ai giảm, giảm bao nhiêu, ai duyệt (Security
    /// Considerations của phase-48). Ghi vào <c>OrderHistories</c> vì đó là sổ không xoá được.
    /// </summary>
    private async Task RecordDiscountTrailAsync(
        Order order, PosQuoteResult quote, PosSaleRequest req, string cashierId, CancellationToken ct)
    {
        if (quote.ManualDiscountApplied <= 0m) return;

        _db.OrderHistories.Add(new OrderHistory(
            order.Id, order.Status, order.Status, cashierId,
            $"Giảm giá tay {quote.ManualDiscountApplied:#,##0}đ tại quầy. "
            + $"Lý do: {req.ManualDiscountReason ?? "(không ghi)"}. "
            + $"Người duyệt: {req.ApprovedBy ?? cashierId}."));
        await _db.SaveChangesAsync(ct);
    }

    private async Task ResumeHeldOrderAsync(Guid? heldOrderId, Guid orderId, CancellationToken ct)
    {
        if (!heldOrderId.HasValue) return;
        var held = await _db.HeldOrders.FirstOrDefaultAsync(h => h.Id == heldOrderId.Value, ct);
        if (held == null) return;
        held.Resume(orderId);
        await _db.SaveChangesAsync(ct);
    }
}
