namespace Catalog.Domain;

using BuildingBlocks.SharedKernel;

public class Brand : Entity<Guid>
{
    public string Name { get; private set; }
    public string Description { get; private set; }

    /// <summary>Slug SEO cho trang thương hiệu /thuong-hieu/&lt;slug&gt;. Unique có filter ở DB.</summary>
    public string Slug { get; private set; } = string.Empty;

    public string? LogoUrl { get; private set; }
    public string? Website { get; private set; }
    public int DisplayOrder { get; private set; }

    public bool IsActive { get; private set; }
    public DateTime? DeactivatedAt { get; private set; }
    public string? DeactivatedBy { get; private set; }

    public Brand(string name, string description)
    {
        Id = Guid.NewGuid();
        Name = name;
        Description = description;
        // Slug sinh ngay trong ctor: thương hiệu mới không bao giờ còn slug rỗng.
        Slug = SlugGenerator.Generate(name);
        IsActive = true;
        CreatedAt = DateTime.UtcNow;
    }

    public void UpdateDetails(string name, string description)
    {
        Name = name;
        Description = description;
        // Slug đã có thì giữ nguyên (đổi slug = gãy URL/SEO); chỉ sinh khi đang rỗng.
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

    /// <summary>Cập nhật phần trình bày (logo mega menu, website hãng, thứ tự). Chỉ ghi trường được truyền.</summary>
    public void UpdatePresentation(string? logoUrl = null, string? website = null, int? displayOrder = null)
    {
        if (logoUrl != null) LogoUrl = logoUrl;
        if (website != null) Website = website;
        if (displayOrder.HasValue) DisplayOrder = displayOrder.Value;
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

    // EF Core constructor
    protected Brand() { }
}
