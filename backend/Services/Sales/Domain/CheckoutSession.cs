using BuildingBlocks.SharedKernel;

namespace Sales.Domain;

/// <summary>
/// Phase 04: Phiên checkout giữ chỗ tồn kho 15 phút.
/// Khi khách bấm "Thanh toán" từ giỏ → tạo CheckoutSession + StockReservation cho từng dòng.
/// Hết hạn → ExpiredReservationCleanupService nhả tồn + đánh dấu session Expired.
/// Cho phép gia hạn ĐÚNG 1 LẦN (chống lạm dụng "khoá hàng vô hạn").
/// </summary>
public class CheckoutSession : Entity<Guid>
{
    public Guid CartId { get; private set; }
    public Guid? CustomerId { get; private set; }
    public DateTime ExpiresAt { get; private set; }
    public CheckoutSessionStatus Status { get; private set; }
    public bool WasExtended { get; private set; } // Chỉ cho gia hạn 1 lần.

    // Danh sách ReservationId (bảng InventoryModule.StockReservation).
    // Nhả reservation khi Cancel/Expire.
    private readonly List<Guid> _reservationIds = new();
    public IReadOnlyCollection<Guid> ReservationIds => _reservationIds.AsReadOnly();

    protected CheckoutSession() { }

    public static CheckoutSession Create(Guid cartId, Guid? customerId, int holdMinutes = 15)
    {
        if (holdMinutes <= 0 || holdMinutes > 60)
            throw new ArgumentException("holdMinutes phải trong khoảng 1..60", nameof(holdMinutes));

        return new CheckoutSession
        {
            Id = Guid.NewGuid(),
            CartId = cartId,
            CustomerId = customerId,
            ExpiresAt = DateTime.UtcNow.AddMinutes(holdMinutes),
            Status = CheckoutSessionStatus.Active,
            WasExtended = false,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void AttachReservation(Guid reservationId)
    {
        if (Status != CheckoutSessionStatus.Active)
            throw new InvalidOperationException($"Cannot attach reservation to session in status {Status}");
        _reservationIds.Add(reservationId);
        UpdatedAt = DateTime.UtcNow;
    }

    public void Extend(int additionalMinutes = 15)
    {
        if (Status != CheckoutSessionStatus.Active)
            throw new InvalidOperationException($"Cannot extend session in status {Status}");
        if (WasExtended)
            throw new InvalidOperationException("Session đã gia hạn 1 lần rồi, không thể gia hạn thêm");
        if (additionalMinutes <= 0 || additionalMinutes > 60)
            throw new ArgumentException("additionalMinutes phải trong 1..60", nameof(additionalMinutes));

        ExpiresAt = ExpiresAt.AddMinutes(additionalMinutes);
        WasExtended = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Complete()
    {
        if (Status != CheckoutSessionStatus.Active)
            throw new InvalidOperationException($"Cannot complete session in status {Status}");
        Status = CheckoutSessionStatus.Completed;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Cancel()
    {
        // Cho phép hủy từ bất kỳ trạng thái (idempotent).
        if (Status == CheckoutSessionStatus.Cancelled) return;
        Status = CheckoutSessionStatus.Cancelled;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkExpired()
    {
        if (Status != CheckoutSessionStatus.Active) return;
        Status = CheckoutSessionStatus.Expired;
        UpdatedAt = DateTime.UtcNow;
    }

    public bool IsExpired() => DateTime.UtcNow > ExpiresAt && Status == CheckoutSessionStatus.Active;
}

public enum CheckoutSessionStatus
{
    Active = 0,
    Completed = 1,   // Đơn tạo thành công, reservation → confirmed
    Cancelled = 2,   // Khách hủy chủ động
    Expired = 3      // Hết 15 phút, cleanup nhả tồn
}
