using BuildingBlocks.Spreadsheet;
using BuildingBlocks.Validation;
using InventoryModule.Domain;

namespace InventoryModule.Application.BulkOps;

/// <summary>Column definitions of the supplier-import template (phase-67 Implementation Steps
/// #4). <see cref="PaymentTermsColumnIndex"/> is 1-based and must stay in sync with the column
/// order below — <see cref="BulkOpsLookupSheets.BuildSupplierTemplate"/> puts the dropdown there.</summary>
internal static class SupplierImportColumns
{
    public const int PaymentTermsColumnIndex = 6;

    public static IReadOnlyList<ExcelImportColumn<SupplierImportRow>> Build() => new[]
    {
        ExcelImportColumn<SupplierImportRow>.Text("Tên nhà cung cấp", (r, v) => r.Name = v ?? "", required: true),

        ExcelImportColumn<SupplierImportRow>.Text(
            "Mã số thuế", (r, v) => r.TaxCode = string.IsNullOrWhiteSpace(v) ? null : v, required: false,
            hint: "Dùng để khớp nhà cung cấp đã có, tránh tạo trùng"),

        new ExcelImportColumn<SupplierImportRow>(
            "Số điện thoại",
            (r, v) => CommonValidators.IsValidPhone(v) ? Set(() => r.Phone = v ?? "") : "Số điện thoại không hợp lệ.",
            required: true),

        new ExcelImportColumn<SupplierImportRow>(
            "Email",
            (r, v) => CommonValidators.IsValidEmail(v) ? Set(() => r.Email = v ?? "") : "Email không hợp lệ.",
            required: true),

        ExcelImportColumn<SupplierImportRow>.Text("Địa chỉ", (r, v) => r.Address = v ?? "", required: true),

        new ExcelImportColumn<SupplierImportRow>(
            "Điều khoản thanh toán",
            (r, v) =>
            {
                if (string.IsNullOrWhiteSpace(v)) { r.PaymentTerms = PaymentTermType.COD; return null; }
                if (!Enum.TryParse<PaymentTermType>(v, ignoreCase: true, out var term))
                    return $"Điều khoản thanh toán không hợp lệ. Xem sheet DanhMuc: {string.Join(", ", Enum.GetNames<PaymentTermType>())}.";
                r.PaymentTerms = term;
                return null;
            },
            required: false,
            hint: "Xem sheet DanhMuc — bỏ trống = COD"),
    };

    /// <summary>A binder returns <c>string?</c>; this lets the true-branch above stay a one-liner.</summary>
    private static string? Set(Action assign) { assign(); return null; }
}
