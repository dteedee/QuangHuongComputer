using BuildingBlocks.Messaging.IntegrationEvents;
using BuildingBlocks.Time;
using Catalog.Infrastructure;
using Content.Infrastructure;
using InventoryModule.Infrastructure;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Sales.Application.Inventory;
using Sales.Application.Pricing;
using Sales.Domain;
using Sales.Infrastructure;
using System.Text.Json;

namespace Sales.Application.Checkout;

/// <summary>
/// ĐƯỜNG CHỐT ĐƠN DUY NHẤT — web, khách vãng lai, POS và chuyển báo giá đều đi qua đây.
///
/// Trước W2-3 tồn tại HAI đường song song (`SalesEndpoints./checkout` inline và orchestrator này),
/// và đường mà frontend thật sự gọi lại là đường inline — nó bỏ qua <c>PricingEngine</c>, tự tính
/// tiền, và không giữ chỗ tồn kho. Hai đường ⇒ hai kết quả tiền khác nhau trên cùng giỏ hàng.
///
/// Bảo đảm của đường này:
///  · Giá LUÔN từ <see cref="IOrderPriceSource"/> (CSDL), không bao giờ từ client.
///  · Khuyến mãi + coupon được TÍNH LẠI tại thời điểm chốt đơn, không đọc lại snapshot của giỏ.
///  · Thuế tách THEO DÒNG theo thuế suất của danh mục tại ngày VN (D01).
///  · Giữ chỗ tồn kho đúng MỘT điểm (<see cref="InventoryReservationService"/>).
///  · Sales + Inventory + Content nằm trong MỘT giao dịch; hỏng ở đâu cũng không trừ nhầm tồn.
///  · Sự kiện chỉ phát SAU khi commit (chưa có outbox — xem docs/integration-events.md).
/// </summary>
public class CheckoutOrchestrator
{
    private readonly SalesDbContext _salesDb;
    private readonly InventoryDbContext _inventoryDb;
    private readonly CatalogDbContext _catalogDb;
    private readonly ContentDbContext _contentDb;
    private readonly IPricingEngine _pricingEngine;
    private readonly LineVatProfileResolver _vatResolver;
    private readonly InventoryReservationService _reservations;
    private readonly IOrderPriceSource _priceSource;
    private readonly IBusinessClock _clock;
    private readonly IPublishEndpoint _bus;
    private readonly Microsoft.Extensions.Configuration.IConfiguration _config;
    private readonly ILogger<CheckoutOrchestrator> _logger;

    public CheckoutOrchestrator(
        SalesDbContext salesDb,
        InventoryDbContext inventoryDb,
        CatalogDbContext catalogDb,
        ContentDbContext contentDb,
        IPricingEngine pricingEngine,
        LineVatProfileResolver vatResolver,
        InventoryReservationService reservations,
        IOrderPriceSource priceSource,
        IBusinessClock clock,
        IPublishEndpoint bus,
        Microsoft.Extensions.Configuration.IConfiguration config,
        ILogger<CheckoutOrchestrator> logger)
    {
        _salesDb = salesDb;
        _inventoryDb = inventoryDb;
        _catalogDb = catalogDb;
        _contentDb = contentDb;
        _pricingEngine = pricingEngine;
        _vatResolver = vatResolver;
        _reservations = reservations;
        _priceSource = priceSource;
        _clock = clock;
        _bus = bus;
        _config = config;
        _logger = logger;
    }

    /// <summary>
    /// Chốt đơn dưới EXECUTION STRATEGY của EF.
    ///
    /// Bắt buộc phải bọc như thế này: <c>AddSalesModule</c> bật <c>EnableRetryOnFailure</c>, và
    /// <c>NpgsqlRetryingExecutionStrategy</c> TỪ CHỐI giao dịch do người dùng tự mở
    /// ("does not support user-initiated transactions"). Không bọc thì mọi lần chốt đơn trả 400.
    ///
    /// Mỗi lần thử lại phải bắt đầu từ trạng thái sạch: <c>ChangeTracker.Clear()</c> ở đầu mỗi lượt.
    /// Nếu không, lượt hai sẽ thấy các entity đã bị lượt một sửa trong bộ nhớ (giỏ đã <c>Clear()</c>,
    /// tồn kho đã trừ) dù giao dịch đã rollback ở CSDL — và sinh ra một đơn sai.
    /// </summary>
    public async Task<CheckoutResult> ExecuteAsync(CheckoutRequest req, CancellationToken ct)
    {
        var strategy = _salesDb.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            _salesDb.ChangeTracker.Clear();
            _inventoryDb.ChangeTracker.Clear();
            _contentDb.ChangeTracker.Clear();
            return await ExecuteCoreAsync(req, ct);
        });
    }

    private async Task<CheckoutResult> ExecuteCoreAsync(CheckoutRequest req, CancellationToken ct)
    {
        var guard = CheckoutRequestGuard.Validate(req);
        if (guard != null) return CheckoutResult.Failure(guard);

        // Giao dịch phải mở TRƯỚC mọi truy vấn trên Inventory/Content để gộp được kết nối.
        await using var scope = await CheckoutTransactionScope.BeginAsync(
            _salesDb, new DbContext[] { _inventoryDb, _contentDb }, _logger, ct);
        if (!scope.IsAtomic) return CheckoutResult.Failure(scope.FailureReason!);

        var cart = await _salesDb.Carts.Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.Id == req.CartId, ct);
        if (cart == null) return CheckoutResult.Failure("Giỏ hàng không tồn tại");

        // IDOR: giỏ của người khác không bao giờ được chốt thành đơn của mình.
        var ownership = CheckoutRequestGuard.CheckCartOwnership(req, cart);
        if (ownership != null) return CheckoutResult.Failure(ownership);

        var payable = cart.Items.Where(i => !i.IsGift).ToList();
        if (payable.Count == 0) return CheckoutResult.Failure("Giỏ hàng trống");

        var session = await LoadSessionAsync(req, ct);
        if (session.Error != null) return CheckoutResult.Failure(session.Error);

        // 1. GIÁ — luôn từ nguồn giá của kênh, không bao giờ từ client.
        var priceQuery = new OrderPriceQuery(
            payable.Select(i => (i.ProductId, i.VariantId)).ToList(), req.QuotationId);
        var prices = await _priceSource.GetUnitPricesAsync(priceQuery, ct);

        var missingPrice = payable.FirstOrDefault(i => !prices.ContainsKey((i.ProductId, i.VariantId)));
        if (missingPrice != null)
            return CheckoutResult.Failure($"Không xác định được giá bán: {missingPrice.ProductName}");

        // Ghi giá server về giỏ trước khi tính khuyến mãi — nếu không, PricingEngine sẽ tính
        // mức giảm dựa trên giá client gửi lúc thêm vào giỏ (có thể đã cũ hoặc đã bị sửa).
        foreach (var item in payable)
        {
            var serverPrice = prices[(item.ProductId, item.VariantId)];
            if (item.Price != serverPrice)
            {
                cart.UpdateItemPrice(item.ProductId, item.VariantId, serverPrice);
            }
        }

        // 2. GIỮ CHỖ TỒN KHO — đúng một điểm, khoá theo phiên checkout hoặc theo giỏ.
        var reservationRef = (session.Session?.Id ?? cart.Id).ToString();
        var reserve = await _reservations.ReserveAsync(
            reservationRef,
            session.Session != null
                ? InventoryReservationService.CheckoutSessionReference
                : InventoryReservationService.OrderReference,
            payable.Select(i => new ReservationLine(i.ProductId, i.VariantId, i.Quantity, i.ProductName)).ToList(),
            expirationHours: 1,
            ct);
        if (!reserve.Success) return CheckoutResult.Failure(reserve.ErrorMessage!);

        // 3. KHUYẾN MÃI + COUPON — tính lại từ đầu tại thời điểm chốt đơn.
        var pricing = await CheckoutPricingStep.ApplyAsync(
            _pricingEngine, _contentDb, cart, req, ct);
        if (pricing.Error != null) return CheckoutResult.Failure(pricing.Error);

        // 3b. PHÍ SHIP — trên kênh khách, SERVER quyết định (W0-4 `ShippingFeePolicy` là nguồn duy nhất).
        //
        // Vá sau kiểm chứng đối kháng: `/api/sales/checkout` và `/public/guest-checkout` truyền
        // cứng 0đ (mọi đơn web thành miễn phí ship, trong khi `/cart/shipping-fee` vẫn báo khách
        // 30.000đ), còn `/checkout/orchestrate` + `/fast-checkout` lấy thẳng `shipping.shippingFee`
        // của client — đo được trên :5050: gửi 999.999 thì đơn lưu đúng 999.999. Đó chính là lỗ
        // W0-4 đã bịt ("khách tự set phí ship") mở lại. POS/Báo giá vẫn giữ phí do nhân viên nhập.
        if (req.Channel is CheckoutChannel.Web or CheckoutChannel.Guest)
        {
            var netSubtotal = payable.Sum(i => i.Subtotal) - pricing.OrderDiscount;
            req = req with
            {
                Shipping = req.Shipping with
                {
                    ShippingFee = ShippingFeePolicy.Calculate(
                        netSubtotal, req.Shipping.IsPickup, _config),
                },
            };
        }

        // 4. THUẾ theo dòng (D01) + dựng đơn.
        var vatProfiles = await _vatResolver.ResolveAsync(
            cart.Items.Select(i => i.ProductId).Distinct().ToList(), _clock.TodayVn, ct);

        var order = await CheckoutOrderFactory.BuildAsync(
            _catalogDb, cart, req, pricing, vatProfiles, _clock, ct);
        _salesDb.Orders.Add(order);
        _salesDb.OrderHistories.Add(new OrderHistory(
            order.Id, OrderStatus.Draft, order.Status,
            changedBy: req.ApprovedBy ?? req.CustomerId?.ToString() ?? "guest",
            notes: $"Tạo đơn qua kênh {req.Channel}"));

        // 5. CHỐT giữ chỗ thành xuất kho thật.
        var commit = await _reservations.CommitAsync(reservationRef, ct);
        if (!commit.Success) return CheckoutResult.Failure(commit.ErrorMessage!);

        session.Session?.Complete();
        cart.Clear();
        cart.RemoveCoupon();

        try
        {
            await scope.SaveAndCommitAsync(ct);
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Chốt đơn thất bại cho giỏ {CartId}", cart.Id);
            return CheckoutResult.Failure("Không thể lưu đơn hàng. Vui lòng thử lại.");
        }

        // 6. Sự kiện — CHỈ sau khi commit. Chưa có outbox nên đây là "at most once":
        //    giao dịch bị rollback sẽ không phát sự kiện ma, nhưng tiến trình chết ngay sau
        //    commit thì sự kiện mất. Ghi nhận ở docs/integration-events.md.
        await PublishOrderCreatedAsync(order, ct);

        return CheckoutResult.SuccessResult(
            order.Id, order.OrderNumber, order.TotalAmount, order.TaxAmount,
            order.Status.ToString(),
            requiresPaymentGateway: req.PaymentMethod is not (PaymentMethodChoice.COD
                or PaymentMethodChoice.Cash or PaymentMethodChoice.Credit));
    }

    private async Task<(CheckoutSession? Session, string? Error)> LoadSessionAsync(
        CheckoutRequest req, CancellationToken ct)
    {
        if (!req.CheckoutSessionId.HasValue)
        {
            // Không truyền mã phiên — đây là đường `/api/sales/checkout` mà frontend đang dùng.
            // Nếu giỏ này ĐANG có một phiên còn hiệu lực thì phải dùng LẠI nó: nếu không,
            // orchestrator giữ chỗ lần thứ hai dưới khoá `Order/{cartId}` và bỏ mồ côi phần giữ
            // chỗ của phiên. Đo được trên :5050 trước khi vá: tồn 88→86 (đúng) nhưng
            // ReservedQuantity vẫn 2 và StockReservations của phiên vẫn Active — tức là một đơn
            // 2 cái khoá 4 cái. phase-21 §Risk Assessment: đúng MỘT điểm giữ chỗ.
            var active = await _salesDb.CheckoutSessions
                .Where(s => s.CartId == req.CartId && s.Status == CheckoutSessionStatus.Active)
                .OrderByDescending(s => s.ExpiresAt)
                .FirstOrDefaultAsync(ct);

            return active != null && !active.IsExpired() ? (active, null) : (null, null);
        }

        var session = await _salesDb.CheckoutSessions
            .FirstOrDefaultAsync(s => s.Id == req.CheckoutSessionId.Value, ct);

        if (session == null) return (null, "Phiên checkout không tồn tại");
        // IDOR: phiên phải thuộc đúng giỏ đang chốt.
        if (session.CartId != req.CartId) return (null, "Phiên checkout không thuộc giỏ hàng này");
        if (session.IsExpired()) return (null, "Phiên checkout đã hết hạn, vui lòng tạo phiên mới");
        if (session.Status != CheckoutSessionStatus.Active)
            return (null, $"Phiên checkout ở trạng thái {session.Status}, không thể tiếp tục");

        return (session, null);
    }

    private async Task PublishOrderCreatedAsync(Order order, CancellationToken ct)
    {
        try
        {
            await _bus.Publish(new OrderCreatedIntegrationEvent(
                order.Id, order.CustomerId,
                order.CustomerEmail ?? string.Empty,
                order.TotalAmount, order.OrderNumber), ct);
        }
        catch (Exception ex)
        {
            // Đơn ĐÃ commit — không được ném lỗi về cho khách chỉ vì broker bận.
            _logger.LogError(ex, "Không phát được OrderCreated cho đơn {OrderNumber}", order.OrderNumber);
        }
    }
}
