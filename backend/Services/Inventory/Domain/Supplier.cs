using BuildingBlocks.SharedKernel;
using BuildingBlocks.Validation;

namespace InventoryModule.Domain;

/// <summary>
/// Loại nhà cung cấp
/// </summary>
public enum SupplierType
{
    Manufacturer,    // Nhà sản xuất
    Distributor,     // Nhà phân phối
    Wholesaler,      // Nhà bán buôn
    Agent,           // Đại lý
    Retailer,        // Nhà bán lẻ
    Importer         // Nhà nhập khẩu
}

/// <summary>
/// Điều khoản thanh toán
/// </summary>
public enum PaymentTermType
{
    COD,             // Thanh toán khi giao hàng
    NET7,            // Công nợ 7 ngày
    NET15,           // Công nợ 15 ngày
    NET30,           // Công nợ 30 ngày
    NET45,           // Công nợ 45 ngày
    NET60,           // Công nợ 60 ngày
    Prepaid,         // Thanh toán trước
    Custom           // Tùy chỉnh
}

public class Supplier : Entity<Guid>
{
    // === Thông tin cơ bản ===
    public string Code { get; private set; }                  // Mã nhà cung cấp (tự sinh: NCC-001)
    public string Name { get; private set; }                  // Tên công ty
    public string? ShortName { get; private set; }            // Tên viết tắt
    public SupplierType SupplierType { get; private set; }    // Loại nhà cung cấp
    public string? Description { get; private set; }          // Mô tả
    public string? Website { get; private set; }              // Website
    public string? LogoUrl { get; private set; }              // Logo

    // === Thông tin kinh doanh ===
    public string? TaxCode { get; private set; }              // Mã số thuế
    public string? BankAccount { get; private set; }          // Số tài khoản
    public string? BankName { get; private set; }             // Tên ngân hàng
    public string? BankBranch { get; private set; }           // Chi nhánh
    public PaymentTermType PaymentTerms { get; private set; } // Điều khoản thanh toán
    public int? PaymentDays { get; private set; }             // Số ngày công nợ (cho Custom)
    public decimal CreditLimit { get; private set; }          // Hạn mức công nợ (VND)
    public decimal CurrentDebt { get; private set; }          // Công nợ hiện tại (VND)

    // === Người liên hệ chính ===
    public string ContactPerson { get; private set; }         // Tên người liên hệ
    public string? ContactTitle { get; private set; }         // Chức vụ
    public string Email { get; private set; }                 // Email
    public string Phone { get; private set; }                 // Điện thoại
    public string? Fax { get; private set; }                  // Fax (nếu có)

    // === Địa chỉ ===
    public string Address { get; private set; }               // Địa chỉ
    public string? Ward { get; private set; }                 // Phường/Xã
    public string? District { get; private set; }             // Quận/Huyện
    public string? City { get; private set; }                 // Tỉnh/Thành phố
    public string? Country { get; private set; }              // Quốc gia (mặc định: Việt Nam)
    public string? PostalCode { get; private set; }           // Mã bưu điện

    // === Đánh giá và ghi chú ===
    public int Rating { get; private set; }                   // Đánh giá (1-5)
    public string? Notes { get; private set; }                // Ghi chú nội bộ
    public string? Categories { get; private set; }           // Danh mục sản phẩm cung cấp (JSON array hoặc comma separated)
    public string? Brands { get; private set; }               // Thương hiệu cung cấp

    // === Thống kê ===
    public int TotalOrders { get; private set; }              // Tổng số đơn mua hàng
    public decimal TotalPurchaseAmount { get; private set; }  // Tổng giá trị mua hàng
    public DateTime? LastOrderDate { get; private set; }      // Ngày đơn hàng gần nhất
    public DateTime? FirstOrderDate { get; private set; }     // Ngày đơn hàng đầu tiên

    // === Constructor ===
    public Supplier(
        string code,
        string name,
        string contactPerson,
        string email,
        string phone,
        string address,
        SupplierType supplierType = SupplierType.Distributor,
        PaymentTermType paymentTerms = PaymentTermType.COD)
    {
        Id = Guid.NewGuid();
        Code = code;
        Name = name;
        ContactPerson = contactPerson;
        Email = email;
        Phone = phone;
        Address = address;
        SupplierType = supplierType;
        PaymentTerms = paymentTerms;
        Rating = 0;
        CreditLimit = 0;
        CurrentDebt = 0;
        TotalOrders = 0;
        TotalPurchaseAmount = 0;
        Country = "Việt Nam";
    }

    protected Supplier() { }

    // === Update Methods ===
    public void UpdateBasicInfo(
        string name,
        string? shortName,
        SupplierType supplierType,
        string? description,
        string? website,
        string? logoUrl)
    {
        Name = name;
        ShortName = shortName;
        SupplierType = supplierType;
        Description = description;
        Website = website;
        LogoUrl = logoUrl;
    }

    public void UpdateBusinessInfo(
        string? taxCode,
        string? bankAccount,
        string? bankName,
        string? bankBranch,
        PaymentTermType paymentTerms,
        int? paymentDays,
        decimal creditLimit)
    {
        TaxCode = taxCode;
        BankAccount = bankAccount;
        BankName = bankName;
        BankBranch = bankBranch;
        PaymentTerms = paymentTerms;
        PaymentDays = paymentDays;
        CreditLimit = creditLimit;
    }

    public void UpdateContact(
        string contactPerson,
        string? contactTitle,
        string email,
        string phone,
        string? fax)
    {
        ContactPerson = contactPerson;
        ContactTitle = contactTitle;
        Email = email;
        Phone = phone;
        Fax = fax;
    }

    public void UpdateAddress(
        string address,
        string? ward,
        string? district,
        string? city,
        string? country,
        string? postalCode)
    {
        Address = address;
        Ward = ward;
        District = district;
        City = city;
        Country = country ?? "Việt Nam";
        PostalCode = postalCode;
    }

    public void UpdateNotes(int rating, string? notes, string? categories, string? brands)
    {
        Rating = Math.Clamp(rating, 0, 5);
        Notes = notes;
        Categories = categories;
        Brands = brands;
    }

    // Legacy update method for backward compatibility
    public void UpdateDetails(string name, string contactPerson, string email, string phone, string address)
    {
        Name = name;
        ContactPerson = contactPerson;
        Email = email;
        Phone = phone;
        Address = address;
    }

    // === Business Methods ===
    public void RecordOrder(decimal amount)
    {
        TotalOrders++;
        TotalPurchaseAmount += amount;
        LastOrderDate = DateTime.UtcNow;
        if (FirstOrderDate == null)
        {
            FirstOrderDate = DateTime.UtcNow;
        }
    }

    public void UpdateDebt(decimal change)
    {
        CurrentDebt += change;
    }

    public bool CanCreateOrder(decimal orderAmount)
    {
        if (CreditLimit <= 0) return true; // No limit
        return (CurrentDebt + orderAmount) <= CreditLimit;
    }

    public int GetPaymentDueDays()
    {
        return PaymentTerms switch
        {
            PaymentTermType.COD => 0,
            PaymentTermType.Prepaid => 0,
            PaymentTermType.NET7 => 7,
            PaymentTermType.NET15 => 15,
            PaymentTermType.NET30 => 30,
            PaymentTermType.NET45 => 45,
            PaymentTermType.NET60 => 60,
            PaymentTermType.Custom => PaymentDays ?? 30,
            _ => 30
        };
    }

    // === Validation ===
    public ValidationResult Validate()
    {
        var result = new ValidationResult();

        if (!CommonValidators.IsNotEmpty(Code))
        {
            result.AddError(nameof(Code), "Mã nhà cung cấp không được để trống");
        }

        if (!CommonValidators.IsNotEmpty(Name))
        {
            result.AddError(nameof(Name), "Tên nhà cung cấp không được để trống");
        }

        if (!CommonValidators.IsNotEmpty(ContactPerson))
        {
            result.AddError(nameof(ContactPerson), "Người liên hệ không được để trống");
        }

        if (!CommonValidators.IsValidEmail(Email))
        {
            result.AddError(nameof(Email), "Email không hợp lệ");
        }

        if (!CommonValidators.IsValidPhone(Phone))
        {
            result.AddError(nameof(Phone), "Số điện thoại không hợp lệ");
        }

        if (!CommonValidators.IsNotEmpty(Address))
        {
            result.AddError(nameof(Address), "Địa chỉ không được để trống");
        }

        if (CreditLimit < 0)
        {
            result.AddError(nameof(CreditLimit), "Hạn mức công nợ không được âm");
        }

        return result;
    }
}
