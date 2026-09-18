using InventoryModule.Domain;
using InventoryModule.DTOs;

namespace InventoryModule.Endpoints.Purchasing;

/// <summary>
/// Ánh xạ DTO ↔ aggregate của nhà cung cấp. Tách khỏi <see cref="SupplierEndpoints"/> để file
/// endpoint ở dưới 200 dòng; các handler được giữ NGUYÊN VĂN như khi còn nằm trong
/// <c>InventoryEndpoints.cs</c> (nhiệm vụ bàn giao cho W2-12).
/// </summary>
internal static class SupplierMapping
{
    /// <summary>Bốn lệnh Update* mà create và update gọi giống hệt nhau — gom lại để khỏi lặp.</summary>
    internal static void ApplyDetails(
        Supplier supplier,
        string name, string? shortName, SupplierType supplierType, string? description, string? website,
        string? logoUrl, string? taxCode, string? bankAccount, string? bankName, string? bankBranch,
        PaymentTermType paymentTerms, int? paymentDays, decimal creditLimit, string contactPerson,
        string? contactTitle, string email, string phone, string? fax, string address, string? ward,
        string? district, string? city, string? country, string? postalCode, int rating, string? notes,
        string? categories, string? brands)
    {
        supplier.UpdateBasicInfo(name, shortName, supplierType, description, website, logoUrl);
        supplier.UpdateBusinessInfo(taxCode, bankAccount, bankName, bankBranch, paymentTerms, paymentDays, creditLimit);
        supplier.UpdateContact(contactPerson, contactTitle, email, phone, fax);
        supplier.UpdateAddress(address, ward, district, city, country, postalCode);
        supplier.UpdateNotes(rating, notes, categories, brands);
    }

    public static SupplierResponse ToResponse(Supplier s)
    {
        return new SupplierResponse(
            s.Id,
            s.Code,
            s.Name,
            s.ShortName,
            s.SupplierType.ToString(),
            SupplierEnumHelper.GetSupplierTypeDisplay(s.SupplierType),
            s.Description,
            s.Website,
            s.LogoUrl,
            s.TaxCode,
            s.BankAccount,
            s.BankName,
            s.BankBranch,
            s.PaymentTerms.ToString(),
            SupplierEnumHelper.GetPaymentTermsDisplay(s.PaymentTerms),
            s.PaymentDays,
            s.CreditLimit,
            s.CurrentDebt,
            s.CreditLimit > 0 ? s.CreditLimit - s.CurrentDebt : 0,
            s.ContactPerson,
            s.ContactTitle,
            s.Email,
            s.Phone,
            s.Fax,
            s.Address,
            s.Ward,
            s.District,
            s.City,
            s.Country,
            s.PostalCode,
            SupplierEnumHelper.BuildFullAddress(s.Address, s.Ward, s.District, s.City, s.Country),
            s.Rating,
            s.Notes,
            s.Categories,
            s.Brands,
            s.TotalOrders,
            s.TotalPurchaseAmount,
            s.LastOrderDate,
            s.FirstOrderDate,
            s.IsActive,
            s.CreatedAt,
            s.UpdatedAt
        );
    }
}
