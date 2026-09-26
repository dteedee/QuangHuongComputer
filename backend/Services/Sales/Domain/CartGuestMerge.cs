namespace Sales.Domain;

/// <summary>Gộp giỏ vãng lai vào tài khoản khi đăng nhập (tách khỏi Cart.cs để giữ file dưới 200 dòng).</summary>
public partial class Cart
{
    /// <summary>
    /// Gộp giỏ khách vãng lai vào giỏ tài khoản khi đăng nhập.
    /// Quy tắc: cộng dồn số lượng theo (ProductId, VariantId); bỏ qua dòng quà (sẽ được
    /// <c>PricingEngine</c> sinh lại); giá lấy theo giỏ ĐÍCH vì giá được tính lại lúc chốt đơn.
    /// </summary>
    public void MergeFrom(Cart source)
    {
        if (source == null || source.Id == Id) return;

        foreach (var item in source.Items.Where(i => !i.IsGift && i.BundleId == null))
        {
            AddItem(item.ProductId, item.ProductName, item.Price, item.Quantity,
                item.VariantId, item.VariantName, item.VariantSku);
        }

        // Nhóm combo giữ nguyên là nhóm (giá combo được tính lại khi đọc giỏ/chốt đơn).
        foreach (var item in source.Items.Where(i => !i.IsGift && i.BundleId != null))
        {
            AddBundleLine(item.BundleId!.Value, item.BundleName, item.ProductId, item.ProductName,
                item.Price, item.Quantity, item.VariantId, item.VariantName, item.VariantSku);
        }

        // Mã giảm giá của giỏ vãng lai chỉ được giữ khi giỏ đích chưa có mã.
        if (string.IsNullOrWhiteSpace(CouponCode) && !string.IsNullOrWhiteSpace(source.CouponCode))
        {
            CouponCode = source.CouponCode;
            DiscountAmount = source.DiscountAmount;
        }

        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Gắn giỏ vãng lai vào tài khoản vừa đăng nhập/đăng ký.</summary>
    public void AssignToCustomer(Guid customerId)
    {
        if (customerId == Guid.Empty) return;
        CustomerId = customerId;
        AnonymousId = null;
        UpdatedAt = DateTime.UtcNow;
    }
}
