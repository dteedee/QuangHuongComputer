using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using BuildingBlocks.Endpoints;

namespace Sales.Application.Inventory;

/// <summary>
/// ĐIỂM GIỮ CHỖ DUY NHẤT của Sales — reserve / commit / release, khoá theo
/// (<c>referenceId</c>, <c>productId</c>, <c>variantId</c>).
///
/// Vì sao phải gom về một chỗ: trước W2-3 có BA đường giữ chỗ khác nhau —
/// `/cart/items` tạo <c>StockReservation</c> cấp giỏ, `CheckoutSession` tạo reservation cấp phiên,
/// và <c>CheckoutOrchestrator</c> lại gọi thẳng <c>InventoryItem.ReserveStock</c> khi không có phiên.
/// Một đơn đi qua cả ba đường sẽ giữ chỗ HAI đến BA lần cho cùng một món, và huỷ đơn chỉ nhả được
/// một phần → tồn kho trôi dần khỏi thực tế.
///
/// Mô hình đúng (phase-21 "Key Insights"): thêm vào giỏ chỉ **kiểm tra** còn hàng; giữ chỗ xảy ra
/// ĐÚNG MỘT LẦN lúc tạo phiên checkout (có TTL); chốt đơn commit đúng phiên đó; huỷ/hết hạn nhả ra.
///
/// Lưu ý về giao dịch: service này chỉ thay đổi entity trong <see cref="InventoryDbContext"/>
/// đang theo dõi, KHÔNG tự gọi <c>SaveChanges</c>. Caller quyết định ranh giới giao dịch
/// (<c>CheckoutOrchestrator</c> gói tất cả vào một transaction dùng chung).
/// </summary>
public class InventoryReservationService
{
    /// <summary>Loại tham chiếu của reservation do luồng bán hàng tạo ra.</summary>
    public const string CheckoutSessionReference = "CheckoutSession";
    public const string OrderReference = "Order";

    private readonly InventoryDbContext _inventoryDb;
    private readonly ILogger<InventoryReservationService> _logger;

    public InventoryReservationService(InventoryDbContext inventoryDb, ILogger<InventoryReservationService> logger)
    {
        _inventoryDb = inventoryDb;
        _logger = logger;
    }

    /// <summary>
    /// Kiểm tra còn hàng KHÔNG giữ chỗ — dùng cho `/cart/items` và trang sản phẩm.
    /// Trả về số lượng khả dụng; null nghĩa là sản phẩm không có dòng tồn kho nào.
    /// </summary>
    public async Task<int?> GetAvailableAsync(Guid productId, Guid? variantId, CancellationToken ct = default)
    {
        var items = await _inventoryDb.InventoryItems
            .Where(i => i.ProductId == productId && i.VariantId == variantId)
            .Select(i => i.AvailableQuantity)
            .ToListAsync(ct);

        return items.Count == 0 ? null : items.Sum();
    }

    /// <summary>
    /// Giữ chỗ cho một tham chiếu. IDEMPOTENT: gọi lại với cùng <paramref name="referenceId"/>
    /// và cùng dòng hàng sẽ ĐIỀU CHỈNH về số lượng mới thay vì giữ thêm lần nữa — đây chính là
    /// chốt chặn chống giữ chỗ hai lần.
    /// </summary>
    public async Task<ReservationOutcome> ReserveAsync(
        string referenceId,
        string referenceType,
        IReadOnlyList<ReservationLine> lines,
        int expirationHours = 1,
        CancellationToken ct = default)
    {
        var existing = await LoadActiveAsync(referenceId, ct);
        var created = new List<Guid>();

        foreach (var line in lines.Where(l => l.Quantity > 0))
        {
            // Một sản phẩm có thể nằm ở NHIỀU kho (nhiều dòng InventoryItems). Bản đầu lấy
            // FirstOrDefault → rơi trúng dòng kho đã hết là chốt đơn hỏng hẳn, dù tổng tồn còn
            // thừa (đo được trên :5050: sản phẩm 290.000đ có 2 dòng — 1/1 và 108/1 — mọi lần
            // chốt đơn trả "Không đủ hàng: (còn 0)"). GetAvailableAsync cộng tồn MỌI kho nên
            // giỏ hàng vẫn báo còn hàng → mâu thuẫn. Chọn dòng còn nhiều hàng nhất.
            var candidates = await _inventoryDb.InventoryItems
                .Where(i => i.ProductId == line.ProductId && i.VariantId == line.VariantId)
                .ToListAsync(ct);

            if (candidates.Count == 0)
                return ReservationOutcome.Failure($"Sản phẩm không có trong kho: {line.DisplayName}");

            var already = existing.FirstOrDefault(r =>
                r.ProductId == line.ProductId && r.VariantId == line.VariantId);
            var alreadyHeld = already?.Quantity ?? 0;
            var delta = line.Quantity - alreadyHeld;

            // Giữ chỗ cũ nằm ở kho nào thì điều chỉnh đúng kho đó, nếu không phần nhả ra
            // sẽ rơi vào kho khác và sổ giữ chỗ lệch khỏi tồn.
            var inventoryItem =
                (already != null ? candidates.FirstOrDefault(i => i.Id == already.InventoryItemId) : null)
                ?? candidates.OrderByDescending(i => i.AvailableQuantity).First();

            if (delta > 0)
            {
                if (inventoryItem.AvailableQuantity < delta)
                    return ReservationOutcome.Failure(
                        $"Không đủ hàng: {line.DisplayName} (còn {candidates.Sum(i => i.AvailableQuantity)})");

                try
                {
                    inventoryItem.ReserveStock(delta);
                }
                catch (InvalidOperationException ex)
                {
                    return ReservationOutcome.Failure(ClientSafeError.Message(ex));
                }
            }
            else if (delta < 0)
            {
                inventoryItem.ReleaseReservedStock(-delta);
            }

            if (already != null)
            {
                // Giữ chỗ cũ vẫn dùng được: chỉ cần số lượng khớp.
                if (delta != 0) already.Release("Điều chỉnh số lượng giữ chỗ");
                else { created.Add(already.Id); continue; }
            }

            var reservation = new StockReservation(
                inventoryItem.Id, line.ProductId, line.VariantId, line.Quantity,
                referenceId, referenceType, expirationHours,
                notes: $"Sales/{referenceType}");
            _inventoryDb.StockReservations.Add(reservation);
            created.Add(reservation.Id);
        }

        // Dòng đã bị bỏ khỏi giỏ giữa lúc tạo phiên và lúc chốt đơn vẫn còn giữ chỗ dưới cùng
        // tham chiếu. Phải NHẢ, nếu không CommitAsync (vốn commit MỌI giữ chỗ của tham chiếu)
        // sẽ xuất kho cho món khách đã bỏ ra khỏi giỏ.
        foreach (var stale in existing.Where(r =>
                     r.Status == ReservationStatus.Active && !created.Contains(r.Id)))
        {
            var staleItem = await _inventoryDb.InventoryItems
                .FirstOrDefaultAsync(i => i.Id == stale.InventoryItemId, ct);
            staleItem?.ReleaseReservedStock(stale.Quantity);
            stale.Release("Dòng đã bị bỏ khỏi giỏ trước khi chốt đơn");
        }

        return ReservationOutcome.Ok(created);
    }

    /// <summary>
    /// Chốt đơn: biến giữ chỗ thành xuất kho thật (<c>ConfirmReservedStock</c> + <c>Fulfill</c>).
    /// Idempotent — reservation đã Fulfilled bị bỏ qua.
    /// </summary>
    public async Task<ReservationOutcome> CommitAsync(string referenceId, CancellationToken ct = default)
    {
        var reservations = await LoadActiveAsync(referenceId, ct);
        if (reservations.Count == 0)
            return ReservationOutcome.Failure($"Không tìm thấy giữ chỗ nào cho {referenceId}");

        foreach (var reservation in reservations)
        {
            var inventoryItem = await _inventoryDb.InventoryItems
                .FirstOrDefaultAsync(i => i.Id == reservation.InventoryItemId, ct);
            if (inventoryItem == null)
                return ReservationOutcome.Failure("Dòng tồn kho của giữ chỗ không còn tồn tại");

            try
            {
                inventoryItem.ConfirmReservedStock(reservation.Quantity);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogError(ex, "Commit giữ chỗ thất bại cho {Reference}", referenceId);
                return ReservationOutcome.Failure($"Không thể xác nhận tồn kho: {ClientSafeError.Message(ex)}");
            }

            reservation.Fulfill();
        }

        return ReservationOutcome.Ok(reservations.Select(r => r.Id).ToList());
    }

    /// <summary>
    /// Nhả giữ chỗ (huỷ đơn, huỷ phiên, hết hạn). Idempotent và không bao giờ ném:
    /// nhả một thứ đã nhả là chuyện bình thường trong luồng huỷ.
    /// </summary>
    public async Task<int> ReleaseAsync(string referenceId, string reason, CancellationToken ct = default)
    {
        var reservations = await LoadActiveAsync(referenceId, ct);
        var released = 0;

        foreach (var reservation in reservations)
        {
            var inventoryItem = await _inventoryDb.InventoryItems
                .FirstOrDefaultAsync(i => i.Id == reservation.InventoryItemId, ct);

            inventoryItem?.ReleaseReservedStock(reservation.Quantity);
            reservation.Release(reason);
            released++;
        }

        return released;
    }

    /// <summary>
    /// Các lượt giữ chỗ đang hoạt động của một tham chiếu — GỘP cả bản ghi đã lưu trong CSDL
    /// và bản ghi vừa được thêm vào change tracker nhưng CHƯA <c>SaveChanges</c>.
    ///
    /// Vì sao phải gộp: trong một lần chốt đơn, <see cref="ReserveAsync"/> và
    /// <see cref="CommitAsync"/> chạy trong CÙNG một giao dịch chưa commit. Truy vấn LINQ chỉ đọc
    /// CSDL — EF Core không tự đẩy (auto-flush) như EF6/Hibernate — nên nếu chỉ query thì
    /// <c>CommitAsync</c> không thấy lượt giữ chỗ mà <c>ReserveAsync</c> vừa tạo và báo
    /// "không tìm thấy giữ chỗ nào". Đây chính là lỗi làm hỏng toàn bộ luồng khách vãng lai
    /// (giỏ vãng lai chưa từng có reservation nào được lưu trước đó).
    /// </summary>
    private async Task<List<StockReservation>> LoadActiveAsync(string referenceId, CancellationToken ct)
    {
        var persisted = await _inventoryDb.StockReservations
            .Where(r => r.ReferenceId == referenceId && r.Status == ReservationStatus.Active)
            .ToListAsync(ct);

        var pending = _inventoryDb.ChangeTracker
            .Entries<StockReservation>()
            .Where(e => e.State == EntityState.Added
                        && e.Entity.ReferenceId == referenceId
                        && e.Entity.Status == ReservationStatus.Active)
            .Select(e => e.Entity)
            .Where(r => persisted.All(p => p.Id != r.Id));

        persisted.AddRange(pending);
        return persisted;
    }
}

/// <summary>Một dòng cần giữ chỗ.</summary>
public readonly record struct ReservationLine(Guid ProductId, Guid? VariantId, int Quantity, string DisplayName);

/// <summary>Kết quả của một thao tác giữ chỗ — thất bại luôn kèm lý do hiển thị được cho khách.</summary>
public sealed record ReservationOutcome(bool Success, string? ErrorMessage, IReadOnlyList<Guid> ReservationIds)
{
    public static ReservationOutcome Ok(IReadOnlyList<Guid> ids) => new(true, null, ids);
    public static ReservationOutcome Failure(string reason) => new(false, reason, Array.Empty<Guid>());
}
