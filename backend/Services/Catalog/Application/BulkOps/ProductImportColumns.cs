using System.Globalization;
using BuildingBlocks.Spreadsheet;

namespace Catalog.Application.BulkOps;

/// <summary>
/// Column definitions for the `SanPham` sheet (phase-71 Architecture) - the same list is used to
/// build the blank template, read an upload and write the export, so template/import/export can
/// never drift apart (round-trip requirement of the Todo list).
/// </summary>
public static class ProductImportColumns
{
    public static IReadOnlyList<ExcelImportColumn<ProductImportRow>> Build() => new[]
    {
        ExcelImportColumn<ProductImportRow>.Text("Mã SKU", (r, v) => r.Sku = (v ?? "").Trim(), required: true),
        ExcelImportColumn<ProductImportRow>.Text("Tên sản phẩm", (r, v) => r.Name = (v ?? "").Trim(), required: true),
        ExcelImportColumn<ProductImportRow>.Text("Danh mục", (r, v) => r.CategoryText = (v ?? "").Trim(), required: true,
            hint: "Tên hoặc slug danh mục - xem trang DanhMuc"),
        ExcelImportColumn<ProductImportRow>.Text("Thương hiệu", (r, v) => r.BrandText = (v ?? "").Trim(), required: true,
            hint: "Tên thương hiệu - xem trang DanhMuc"),
        new ExcelImportColumn<ProductImportRow>("Giá bán (đã gồm VAT)", BindSellingPrice, required: true, hint: "VND, số nguyên, đã gồm VAT"),
        new ExcelImportColumn<ProductImportRow>("Giá niêm yết", (row, v) => BindOptionalMoney(v, d => row.ListPrice = d),
            hint: "VND, tuỳ chọn - giá gạch ngang"),
        new ExcelImportColumn<ProductImportRow>("Giá vốn tham khảo (chưa gồm VAT)", (row, v) => BindOptionalMoney(v, d => row.ReferenceCost = d),
            hint: "VND, tuỳ chọn - chưa gồm VAT"),
        ExcelImportColumn<ProductImportRow>.Text("Mã vạch", (r, v) => r.Barcode = string.IsNullOrWhiteSpace(v) ? null : v.Trim()),
        new ExcelImportColumn<ProductImportRow>("Bảo hành (tháng)", (row, v) => BindWarranty(v, row), hint: "Số tháng, số nguyên >= 0"),
        new ExcelImportColumn<ProductImportRow>("Hiện trên web (Y/N)", (row, v) => BindShowOnWeb(v, row), hint: "Y hoặc N"),
        ExcelImportColumn<ProductImportRow>.Text("Mô tả ngắn", (r, v) => r.ShortDescription = string.IsNullOrWhiteSpace(v) ? null : v),
    };

    private static string? BindSellingPrice(ProductImportRow row, string? value)
    {
        if (!TryParseMoney(value, out var money) || money < 0)
            return "Giá bán phải là số nguyên VND không âm.";
        row.SellingPrice = money;
        return null;
    }

    private static string? BindOptionalMoney(string? value, Action<decimal> set)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        if (!TryParseMoney(value, out var money) || money < 0) return "Phải là số nguyên VND không âm.";
        set(money);
        return null;
    }

    private static string? BindWarranty(string? value, ProductImportRow row)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var cleaned = value.Trim();
        if (!int.TryParse(cleaned, NumberStyles.Integer, CultureInfo.InvariantCulture, out var months) || months < 0)
            return "Số tháng bảo hành phải là số nguyên không âm.";
        row.WarrantyMonths = months;
        return null;
    }

    private static string? BindShowOnWeb(string? value, ProductImportRow row)
    {
        var cleaned = (value ?? "").Trim().ToUpperInvariant();
        row.ShowOnWeb = cleaned is "Y" or "YES" or "CO" or "CÓ" or "1" or "TRUE";
        if (cleaned.Length > 0 && row.ShowOnWeb == false && cleaned is not ("N" or "NO" or "KHONG" or "KHÔNG" or "0" or "FALSE"))
            return "Chỉ nhận Y hoặc N.";
        return null;
    }

    /// <summary>Accepts "1.500.000", "1500000" or "1500000.00" - the operator's Excel locale is
    /// unknown, so both thousands separators are tolerated and only the integer part is kept
    /// (VND has no decimal unit).</summary>
    private static bool TryParseMoney(string? value, out decimal money)
    {
        money = 0;
        if (string.IsNullOrWhiteSpace(value)) return false;
        var cleaned = value.Trim().Replace(".", "").Replace(",", "").Replace(" ", "").Replace("đ", "", StringComparison.OrdinalIgnoreCase);
        return decimal.TryParse(cleaned, NumberStyles.Integer, CultureInfo.InvariantCulture, out money);
    }
}
