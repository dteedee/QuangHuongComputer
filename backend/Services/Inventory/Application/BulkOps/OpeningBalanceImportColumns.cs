using BuildingBlocks.Spreadsheet;

namespace InventoryModule.Application.BulkOps;

/// <summary>
/// Column definitions of the opening-balance template (phase-67 Requirements). Header text says
/// explicitly "chưa VAT" on the cost column — D01: cost here excludes VAT while the selling price
/// is VAT-inclusive, and mixing the two silently misstates margin by ~8 points.
/// </summary>
internal static class OpeningBalanceImportColumns
{
    public static IReadOnlyList<ExcelImportColumn<OpeningBalanceImportRow>> Build() => new[]
    {
        ExcelImportColumn<OpeningBalanceImportRow>.Text(
            "Mã SKU", (r, v) => r.Sku = v ?? "", required: true,
            hint: "Mã SKU đang hoạt động trong Catalog"),

        ExcelImportColumn<OpeningBalanceImportRow>.Text(
            "Mã kho", (r, v) => r.WarehouseCode = v ?? "", required: true,
            hint: "Xem sheet DanhMuc"),

        new ExcelImportColumn<OpeningBalanceImportRow>(
            "Số lượng",
            (r, v) =>
            {
                if (!int.TryParse(v, out var qty) || qty <= 0)
                    return "Số lượng phải là số nguyên lớn hơn 0.";
                r.Quantity = qty;
                return null;
            },
            required: true,
            hint: "Số nguyên dương"),

        new ExcelImportColumn<OpeningBalanceImportRow>(
            "Đơn giá vốn (chưa VAT)",
            (r, v) =>
            {
                var normalized = (v ?? string.Empty).Replace(".", "").Replace(",", "");
                if (!decimal.TryParse(normalized, out var cost) || cost < 0)
                    return "Đơn giá vốn phải là số không âm.";
                r.UnitCostExclVat = cost;
                return null;
            },
            required: true,
            hint: "VND, CHƯA gồm VAT — khác giá bán (đã gồm VAT)"),

        ExcelImportColumn<OpeningBalanceImportRow>.Text(
            "Serial (cách nhau bằng ;)", (r, v) => r.SerialsRaw = v, required: false,
            hint: "Bắt buộc & đúng số lượng nếu danh mục theo dõi serial"),
    };
}
