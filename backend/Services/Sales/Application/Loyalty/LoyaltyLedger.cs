using BuildingBlocks.Configuration;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Application.Loyalty;

/// <summary>
/// SỔ ĐIỂM THƯỞNG — bên ghi duy nhất của <c>LoyaltyAccounts</c> + <c>LoyaltyTransactions</c>
/// (phase-48 bước 5).
///
/// Trước track này điểm KHÔNG BAO GIỜ được cộng: không có đường nào gọi <c>EarnPoints</c>, nên
/// mọi tài khoản đứng ở 0 điểm vĩnh viễn, còn <c>/loyalty/redeem</c> thì trừ điểm mà không gắn
/// vào bất kỳ đơn nào — điểm bốc hơi, khách không được giảm một đồng nào.
///
/// Ba bảo đảm:
///  · CỘNG đúng một lần cho mỗi đơn (khoá theo <c>LoyaltyTransactions.OrderId</c> + Type=Earn).
///  · ĐẢO đúng một lần cho mỗi bút toán gốc (shadow property <c>ReversalOf</c> trỏ về bút toán đã đảo).
///  · Số dư KHÔNG BAO GIỜ âm — kể cả khi quản trị viên điều chỉnh tay.
///
/// Là lớp static nhận <c>SalesDbContext</c> làm tham số, KHÔNG phải service đăng ký DI: file
/// <c>DependencyInjection.cs</c> thuộc W2-3. Xem integration request để đưa vào DI sau.
/// </summary>
public static class LoyaltyLedger
{
    /// <summary>Khoá cấu hình động (admin sửa được ở back office). 1% giá trị đơn.</summary>
    public const string EarnPercentKey = "Loyalty:EarnPercent";
    public const decimal DefaultEarnPercent = 1.0m;

    /// <summary>1 điểm = 100đ khi đổi. Giữ nguyên hằng số cũ để số dư đang có không đổi nghĩa.</summary>
    public const decimal DongPerPoint = 100m;

    /// <summary>Số điểm cộng cho một đơn: <c>total × percent% ÷ 100đ/điểm × hệ số hạng</c>.</summary>
    public static int PointsFor(decimal orderTotal, decimal earnPercent, decimal tierMultiplier)
    {
        if (orderTotal <= 0m || earnPercent <= 0m) return 0;
        var value = orderTotal * earnPercent / 100m;
        var points = (int)Math.Floor(value / DongPerPoint * tierMultiplier);
        return points < 0 ? 0 : points;
    }

    public static async Task<LoyaltyAccount> GetOrCreateAsync(
        SalesDbContext db, string userId, CancellationToken ct)
    {
        var account = await db.LoyaltyAccounts.FirstOrDefaultAsync(a => a.UserId == userId, ct);
        if (account != null) return account;

        account = new LoyaltyAccount(userId);
        db.LoyaltyAccounts.Add(account);
        return account;
    }

    /// <summary>
    /// CỘNG ĐIỂM cho một đơn đã hoàn tất. Idempotent theo đơn: gọi lại (đơn hoàn tất hai lần,
    /// sự kiện gửi lại) không cộng thêm lần nữa và trả về 0.
    /// Khách vãng lai (<c>CustomerId == Guid.Empty</c>) không có tài khoản nên không tích điểm.
    /// </summary>
    public static async Task<int> EarnForOrderAsync(
        SalesDbContext db, IAppSettings settings, Order order, CancellationToken ct)
    {
        if (order.CustomerId == Guid.Empty) return 0;

        var userId = order.CustomerId.ToString();
        var already = await db.LoyaltyTransactions.AnyAsync(
            t => t.OrderId == order.Id && t.Type == LoyaltyTransactionType.Earn, ct);
        if (already) return 0;

        var account = await GetOrCreateAsync(db, userId, ct);
        var percent = settings.GetDecimal(EarnPercentKey, DefaultEarnPercent);
        var points = PointsFor(order.TotalAmount, percent, account.GetPointsMultiplier());
        if (points <= 0) return 0;

        account.EarnPoints(points, $"Tích điểm đơn {order.OrderNumber}", order.Id);
        var transaction = new LoyaltyTransaction(
            account.Id, LoyaltyTransactionType.Earn, points,
            $"Tích điểm đơn {order.OrderNumber}", order.Id);
        transaction.SetBalanceAfter(account.AvailablePoints);
        db.LoyaltyTransactions.Add(transaction);

        await db.SaveChangesAsync(ct);
        return points;
    }

    /// <summary>
    /// ĐẢO điểm đã cộng cho một đơn (huỷ đơn / trả hàng). Trừ đúng số đã cộng, không bao giờ để
    /// số dư âm, và ghi <c>ReversalOf</c> trỏ về bút toán gốc nên gọi lại là no-op.
    /// </summary>
    public static async Task<int> ReverseForOrderAsync(
        SalesDbContext db, Guid orderId, string reason, CancellationToken ct)
    {
        var earns = await db.LoyaltyTransactions
            .Where(t => t.OrderId == orderId && t.Type == LoyaltyTransactionType.Earn)
            .ToListAsync(ct);
        if (earns.Count == 0) return 0;

        var earnIds = earns.Select(e => e.Id).ToList();
        var reversedIds = await db.LoyaltyTransactions
            .Where(t => t.OrderId == orderId)
            .Select(t => EF.Property<Guid?>(t, "ReversalOf"))
            .Where(id => id != null && earnIds.Contains(id!.Value))
            .ToListAsync(ct);

        var pending = earns.Where(e => !reversedIds.Contains(e.Id)).ToList();
        if (pending.Count == 0) return 0;

        var total = 0;
        foreach (var earn in pending)
        {
            var account = await db.LoyaltyAccounts.FirstOrDefaultAsync(a => a.Id == earn.AccountId, ct);
            if (account == null) continue;

            // Khách đã tiêu mất điểm rồi thì chỉ thu hồi được phần còn lại — số dư âm là dữ liệu hỏng.
            var take = Math.Min(earn.Points, account.AvailablePoints);
            if (take < 0) take = 0;

            // take == 0 (số dư đã tiêu hết) VẪN phải ghi một bút toán đảo 0 điểm: nếu không,
            // bút toán gốc mãi mãi ở trạng thái "chưa đảo" và lần gọi sau — khi khách đã tích
            // điểm từ MỘT ĐƠN KHÁC — sẽ trừ số điểm đó, tức là phạt khách hai lần.
            if (take > 0) account.AdjustPoints(-take, reason, "system");
            var reversal = new LoyaltyTransaction(
                account.Id, LoyaltyTransactionType.Adjustment, -take, reason, orderId);
            reversal.SetBalanceAfter(account.AvailablePoints);
            db.LoyaltyTransactions.Add(reversal);
            db.Entry(reversal).Property("ReversalOf").CurrentValue = earn.Id;
            total += take;
        }

        await db.SaveChangesAsync(ct);
        return total;
    }
}
