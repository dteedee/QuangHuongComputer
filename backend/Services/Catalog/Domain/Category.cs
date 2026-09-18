namespace Catalog.Domain;

using BuildingBlocks.SharedKernel;

public class Category : Entity<Guid>
{
    public string Name { get; private set; }
    public string Description { get; private set; }
    public string Slug { get; set; } = string.Empty;

    /// <summary>
    /// Thuế suất VAT theo LUẬT (statutory). Mức giảm 8% của kỳ giảm thuế KHÔNG nằm ở đây,
    /// nó đến từ cửa sổ giảm thuế trong cấu hình (D01).
    /// </summary>
    public decimal VatRate { get; set; } = 0.10m; // Default 10% for computer hardware

    /// <summary>D01: ngành hàng có thuộc diện được giảm VAT theo nghị quyết giảm thuế hay không.</summary>
    public bool VatReductionEligible { get; private set; } = true;

    /// <summary>D08: hàng của ngành này quản lý bảo hành theo số serial.</summary>
    public bool IsSerialTracked { get; private set; }

    // ------- Cây danh mục (mega menu, chính sách bảo hành hiệu lực theo nhánh - D08) -------
    public Guid? ParentId { get; private set; }
    public virtual Category? Parent { get; private set; }

    public string? ImageUrl { get; private set; }
    public string? Icon { get; private set; }
    public int DisplayOrder { get; private set; }

    // SEO
    public string? MetaTitle { get; private set; }
    public string? MetaDescription { get; private set; }

    public bool IsActive { get; private set; }
    public DateTime? DeactivatedAt { get; private set; }
    public string? DeactivatedBy { get; private set; }

    public Category(string name, string description, Guid? parentId = null)
    {
        Id = Guid.NewGuid();
        Name = name;
        Description = description;
        ParentId = parentId;
        // Slug sinh ngay trong ctor: không bao giờ còn danh mục slug rỗng (URL /danh-muc/<slug> chết).
        Slug = SlugGenerator.Generate(name);
        IsActive = true;
        CreatedAt = DateTime.UtcNow;
    }

    public void UpdateDetails(string name, string description)
    {
        Name = name;
        Description = description;
        // Đổi tên mà slug đang rỗng thì sinh lại; slug đã có thì GIỮ NGUYÊN (đổi slug = gãy URL/SEO).
        if (string.IsNullOrWhiteSpace(Slug))
            Slug = SlugGenerator.Generate(name);
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Đổi slug có chủ đích (admin). Tính duy nhất do tầng endpoint kiểm tra.</summary>
    public void SetSlug(string slug)
    {
        var normalized = SlugGenerator.Generate(slug);
        if (string.IsNullOrEmpty(normalized))
            throw new ArgumentException("Slug không hợp lệ", nameof(slug));
        Slug = normalized;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Cập nhật phần trình bày + vị trí trong cây. Chỉ ghi đè trường được truyền vào.</summary>
    public void UpdatePresentation(
        Guid? parentId = null,
        bool clearParent = false,
        string? imageUrl = null,
        string? icon = null,
        int? displayOrder = null,
        string? metaTitle = null,
        string? metaDescription = null)
    {
        if (clearParent) ParentId = null;
        else if (parentId.HasValue)
        {
            if (parentId.Value == Id)
                throw new InvalidOperationException("Danh mục không thể là cha của chính nó");
            ParentId = parentId.Value;
        }

        if (imageUrl != null) ImageUrl = imageUrl;
        if (icon != null) Icon = icon;
        if (displayOrder.HasValue) DisplayOrder = displayOrder.Value;
        if (metaTitle != null) MetaTitle = metaTitle;
        if (metaDescription != null) MetaDescription = metaDescription;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>D01/D08: chính sách thuế + quản lý serial của ngành hàng.</summary>
    public void UpdatePolicy(decimal? vatRate = null, bool? vatReductionEligible = null, bool? isSerialTracked = null)
    {
        if (vatRate.HasValue)
        {
            if (vatRate.Value < 0 || vatRate.Value > 1)
                throw new ArgumentException("Thuế suất VAT phải nằm trong khoảng 0..1", nameof(vatRate));
            VatRate = vatRate.Value;
        }
        if (vatReductionEligible.HasValue) VatReductionEligible = vatReductionEligible.Value;
        if (isSerialTracked.HasValue) IsSerialTracked = isSerialTracked.Value;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Activate()
    {
        if (!IsActive)
        {
            IsActive = true;
            DeactivatedAt = null;
            DeactivatedBy = null;
            UpdatedAt = DateTime.UtcNow;
        }
    }

    public void Deactivate(string? deactivatedBy = null)
    {
        if (IsActive)
        {
            IsActive = false;
            DeactivatedAt = DateTime.UtcNow;
            DeactivatedBy = deactivatedBy;
            UpdatedAt = DateTime.UtcNow;
        }
    }

    protected Category() {}
}
