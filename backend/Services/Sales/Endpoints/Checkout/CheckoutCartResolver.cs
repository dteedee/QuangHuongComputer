using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Endpoints.Checkout;

/// <summary>
/// Chuyển hợp đồng CŨ của frontend ("gửi kèm danh sách dòng hàng khi chốt đơn") sang mô hình MỚI
/// ("chốt một giỏ hàng trên server"), mà KHÔNG phải đổi một dòng nào ở frontend đang chạy.
///
/// Chỉ lấy từ client ba thứ không ảnh hưởng tiền: <c>productId</c>, <c>variantId</c>, <c>quantity</c>.
/// Đơn giá client gửi lên bị BỎ QUA hoàn toàn — <c>CheckoutOrchestrator</c> đọc lại giá từ CSDL.
/// Đây là lý do khách không còn đặt được hàng 27 triệu với giá 0đ.
/// </summary>
internal static class CheckoutCartResolver
{
    /// <summary>Trần số lượng mỗi dòng — chặn đơn 2 tỷ cái do lỗi hoặc khai thác.</summary>
    private const int MaxQuantityPerLine = 99;

    /// <summary>Giỏ của khách đã đăng nhập; tạo mới nếu chưa có.</summary>
    public static async Task<Cart> ForCustomerAsync(SalesDbContext db, Guid customerId, CancellationToken ct)
    {
        var cart = await db.Carts.Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.CustomerId == customerId, ct);

        if (cart == null)
        {
            cart = new Cart(customerId);
            db.Carts.Add(cart);
        }

        return cart;
    }

    /// <summary>Giỏ của khách vãng lai, khoá theo cookie; tạo mới nếu chưa có.</summary>
    public static async Task<Cart> ForGuestAsync(SalesDbContext db, string anonymousId, CancellationToken ct)
    {
        var cart = await db.Carts.Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.AnonymousId == anonymousId, ct);

        if (cart == null)
        {
            cart = Cart.ForGuest(anonymousId);
            db.Carts.Add(cart);
        }

        return cart;
    }

    /// <summary>
    /// Đồng bộ giỏ về đúng danh sách dòng hàng khách gửi khi bấm "Đặt hàng".
    /// Giá truyền vào là 0 — giá thật do orchestrator ghi đè ngay sau đó.
    /// Trả về thông báo lỗi nếu danh sách không hợp lệ.
    /// </summary>
    public static string? SyncLines(Cart cart, IReadOnlyList<(Guid ProductId, Guid? VariantId, int Quantity)> lines,
        bool allowEmpty = false)
    {
        lines ??= Array.Empty<(Guid, Guid?, int)>();
        if (lines.Count == 0 && !allowEmpty)
            return "Đơn hàng phải có ít nhất một sản phẩm";

        foreach (var line in lines)
        {
            if (line.Quantity <= 0)
                return "Số lượng phải lớn hơn 0";
            if (line.Quantity > MaxQuantityPerLine)
                return $"Số lượng mỗi dòng tối đa {MaxQuantityPerLine}";
            if (line.ProductId == Guid.Empty)
                return "Mã sản phẩm không hợp lệ";
        }

        cart.Clear();
        foreach (var line in lines)
        {
            cart.AddItem(line.ProductId, string.Empty, 0m, line.Quantity, line.VariantId, null, null);
        }

        return null;
    }

    /// <summary>
    /// Giỏ vãng lai: thêm các combo khách gửi kèm (chỉ <c>bundleId</c> + số bộ). Món, số lượng và
    /// giá đều do server nạp từ Catalog — client không quyết định được gì về tiền.
    /// Gọi SAU <see cref="SyncLines"/> (nó xoá sạch giỏ trước).
    /// </summary>
    public static async Task<string?> SyncBundlesAsync(
        Cart cart,
        IReadOnlyList<GuestCheckoutBundleDto>? bundles,
        Catalog.Infrastructure.CatalogDbContext catalogDb,
        InventoryModule.Infrastructure.InventoryDbContext inventoryDb,
        CancellationToken ct)
    {
        if (bundles == null || bundles.Count == 0) return null;
        if (bundles.Select(b => b.BundleId).Distinct().Count() != bundles.Count)
            return "Mỗi combo chỉ được gửi một lần";

        foreach (var request in bundles)
        {
            var (bundle, error) = await Sales.Application.Pricing.Bundles.BundleCartComponentsLoader.LoadAsync(
                catalogDb, inventoryDb, request.BundleId, request.Quantity, cart, ct);
            if (bundle == null) return error;
            cart.AddBundle(bundle.BundleId, bundle.Name, bundle.Components, request.Quantity);
        }

        return cart.Items.Any(i => i.Quantity > MaxQuantityPerLine)
            ? $"Số lượng mỗi sản phẩm tối đa {MaxQuantityPerLine}"
            : null;
    }
}
