using InventoryModule.Domain;

namespace InventoryModule.DTOs;

// ============================================
// CREATE SUPPLIER DTO
// ============================================
public record CreateSupplierDto(
    // Thông tin cơ bản
    string Name,
    string? ShortName,
    SupplierType SupplierType,
    string? Description,
    string? Website,
    string? LogoUrl,

    // Thông tin kinh doanh
    string? TaxCode,
    string? BankAccount,
    string? BankName,
    string? BankBranch,
    PaymentTermType PaymentTerms,
    int? PaymentDays,
    decimal CreditLimit,

    // Người liên hệ
    string ContactPerson,
    string? ContactTitle,
    string Email,
    string Phone,
    string? Fax,

    // Địa chỉ
    string Address,
    string? Ward,
    string? District,
    string? City,
    string? Country,
    string? PostalCode,

    // Đánh giá & ghi chú
    int Rating,
    string? Notes,
    string? Categories,
    string? Brands
);

// ============================================
// UPDATE SUPPLIER DTO
// ============================================
public record UpdateSupplierDto(
    // Thông tin cơ bản
    string Name,
    string? ShortName,
    SupplierType SupplierType,
    string? Description,
    string? Website,
    string? LogoUrl,

    // Thông tin kinh doanh
    string? TaxCode,
    string? BankAccount,
    string? BankName,
    string? BankBranch,
    PaymentTermType PaymentTerms,
    int? PaymentDays,
    decimal CreditLimit,

    // Người liên hệ
    string ContactPerson,
    string? ContactTitle,
    string Email,
    string Phone,
    string? Fax,

    // Địa chỉ
    string Address,
    string? Ward,
    string? District,
    string? City,
    string? Country,
    string? PostalCode,

    // Đánh giá & ghi chú
    int Rating,
    string? Notes,
    string? Categories,
    string? Brands
);

// ============================================
// SUPPLIER RESPONSE DTO
// ============================================
public record SupplierResponse(
    Guid Id,
    string Code,
    string Name,
    string? ShortName,
    string SupplierType,
    string SupplierTypeDisplay,
    string? Description,
    string? Website,
    string? LogoUrl,

    // Thông tin kinh doanh
    string? TaxCode,
    string? BankAccount,
    string? BankName,
    string? BankBranch,
    string PaymentTerms,
    string PaymentTermsDisplay,
    int? PaymentDays,
    decimal CreditLimit,
    decimal CurrentDebt,
    decimal AvailableCredit,

    // Người liên hệ
    string ContactPerson,
    string? ContactTitle,
    string Email,
    string Phone,
    string? Fax,

    // Địa chỉ
    string Address,
    string? Ward,
    string? District,
    string? City,
    string? Country,
    string? PostalCode,
    string FullAddress,

    // Đánh giá & ghi chú
    int Rating,
    string? Notes,
    string? Categories,
    string? Brands,

    // Thống kê
    int TotalOrders,
    decimal TotalPurchaseAmount,
    DateTime? LastOrderDate,
    DateTime? FirstOrderDate,

    // Trạng thái
    bool IsActive,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

// ============================================
// SUPPLIER LIST ITEM DTO (For table display)
// ============================================
public record SupplierListItem(
    Guid Id,
    string Code,
    string Name,
    string? ShortName,
    string SupplierType,
    string SupplierTypeDisplay,
    string ContactPerson,
    string Phone,
    string Email,
    string? City,
    string PaymentTerms,
    string PaymentTermsDisplay,
    decimal CreditLimit,
    decimal CurrentDebt,
    int Rating,
    int TotalOrders,
    decimal TotalPurchaseAmount,
    bool IsActive,
    DateTime CreatedAt
);

// ============================================
// SUPPLIER STATISTICS DTO
// ============================================
public record SupplierStatistics(
    int TotalSuppliers,
    int ActiveSuppliers,
    int InactiveSuppliers,
    decimal TotalDebt,
    decimal TotalCreditLimit,
    int SuppliersWithDebt,
    int SuppliersOverCreditLimit,
    Dictionary<string, int> ByType,
    Dictionary<string, int> ByPaymentTerms
);

// ============================================
// HELPER CLASS FOR DISPLAY NAMES
// ============================================
public static class SupplierEnumHelper
{
    public static string GetSupplierTypeDisplay(SupplierType type) => type switch
    {
        SupplierType.Manufacturer => "Nhà sản xuất",
        SupplierType.Distributor => "Nhà phân phối",
        SupplierType.Wholesaler => "Nhà bán buôn",
        SupplierType.Agent => "Đại lý",
        SupplierType.Retailer => "Nhà bán lẻ",
        SupplierType.Importer => "Nhà nhập khẩu",
        _ => type.ToString()
    };

    public static string GetPaymentTermsDisplay(PaymentTermType terms) => terms switch
    {
        PaymentTermType.COD => "Thanh toán khi giao hàng",
        PaymentTermType.NET7 => "Công nợ 7 ngày",
        PaymentTermType.NET15 => "Công nợ 15 ngày",
        PaymentTermType.NET30 => "Công nợ 30 ngày",
        PaymentTermType.NET45 => "Công nợ 45 ngày",
        PaymentTermType.NET60 => "Công nợ 60 ngày",
        PaymentTermType.Prepaid => "Thanh toán trước",
        PaymentTermType.Custom => "Tùy chỉnh",
        _ => terms.ToString()
    };

    public static string BuildFullAddress(string address, string? ward, string? district, string? city, string? country)
    {
        var parts = new List<string> { address };
        if (!string.IsNullOrEmpty(ward)) parts.Add(ward);
        if (!string.IsNullOrEmpty(district)) parts.Add(district);
        if (!string.IsNullOrEmpty(city)) parts.Add(city);
        if (!string.IsNullOrEmpty(country) && country != "Việt Nam") parts.Add(country);
        return string.Join(", ", parts);
    }
}
