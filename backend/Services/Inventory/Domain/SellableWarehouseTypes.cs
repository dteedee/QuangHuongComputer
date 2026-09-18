namespace InventoryModule.Domain;

/// <summary>
/// D09 — những loại kho mà hàng trong đó ĐƯỢC PHÉP chào bán.
///
/// <para>
/// Kho <see cref="WarehouseType.Returns"/>, <see cref="WarehouseType.Defective"/> và
/// <see cref="WarehouseType.Transit"/> chứa hàng chưa bán được; nếu cộng chúng vào tồn
/// quảng cáo thì storefront hiển thị "còn hàng" cho máy đang nằm ở kho hàng lỗi.
/// </para>
///
/// <para>
/// Dùng ở hai chỗ: <c>StockLedgerService</c> tính số lượng công bố trong
/// <c>StockChangedEvent</c>, và các endpoint tồn kho công khai.
/// </para>
/// </summary>
public static class SellableWarehouseTypes
{
    public static readonly IReadOnlyList<WarehouseType> All = new[]
    {
        WarehouseType.Main,
        WarehouseType.Branch,
        WarehouseType.Showroom
    };

    public static bool IsSellable(WarehouseType type) =>
        type is WarehouseType.Main or WarehouseType.Branch or WarehouseType.Showroom;
}
