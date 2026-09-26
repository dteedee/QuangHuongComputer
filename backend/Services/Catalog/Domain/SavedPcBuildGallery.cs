using System.Linq.Expressions;

namespace Catalog.Domain;

/// <summary>Nhãn nhu cầu của cấu hình mẫu — mã lưu DB (kebab-case) → nhãn hiển thị tiếng Việt.</summary>
public static class PcBuildUseCaseTags
{
    public static readonly IReadOnlyDictionary<string, string> Labels = new Dictionary<string, string>
    {
        ["gaming"] = "Gaming",
        ["van-phong"] = "Văn phòng",
        ["do-hoa"] = "Đồ họa",
        ["streaming"] = "Streaming",
    };

    public static bool IsKnown(string? tag) => tag != null && Labels.ContainsKey(tag);
    public static string LabelOf(string? tag) => tag != null && Labels.TryGetValue(tag, out var label) ? label : "Khác";
}

/// <summary>Phần "Cấu hình mẫu" (/cau-hinh-mau) của <see cref="SavedPcBuild"/>.</summary>
public partial class SavedPcBuild
{
    /// <summary>Nổi bật — đứng đầu gallery.</summary>
    public bool IsFeatured { get; private set; }
    /// <summary>Hiện trên /cau-hinh-mau. Chỉ nhân viên bật được (API quản trị).</summary>
    public bool IsPublic { get; private set; }
    /// <summary>Mã nhu cầu (<see cref="PcBuildUseCaseTags"/>). Null = không phải cấu hình mẫu.</summary>
    public string? UseCaseTag { get; private set; }
    public int SortOrder { get; private set; }

    public bool IsGalleryEntry => CustomerId == null && UseCaseTag != null;

    /// <summary>
    /// Tạo bản SAO thuộc cửa hàng từ một build đã lưu (của khách hoặc của nhân viên). Bản gốc giữ
    /// nguyên — khách không thấy build của mình bị đổi tên hay bị công khai. Mặc định CHƯA công khai.
    /// </summary>
    public static SavedPcBuild CreateGalleryCopy(SavedPcBuild source, string title, string useCaseTag, int sortOrder)
    {
        ArgumentNullException.ThrowIfNull(source);
        if (source.Items.Count == 0) throw new ArgumentException("Cấu hình nguồn không có linh kiện nào", nameof(source));

        var copy = new SavedPcBuild(customerId: null, name: title);
        foreach (var item in source.Items)
            copy.AddItem(item.ProductId, item.ComponentType, item.Quantity, item.UnitPrice);
        copy.UpdateCompatibility(source.IsCompatible, source.CompatibilityIssues, source.TotalWattage);
        copy.UpdateGallery(title, useCaseTag, sortOrder, isFeatured: false, isPublic: false);
        return copy;
    }

    public void UpdateGallery(string title, string useCaseTag, int sortOrder, bool isFeatured, bool isPublic)
    {
        if (CustomerId != null)
            throw new InvalidOperationException("Không được công khai build của khách — hãy tạo bản sao cấu hình mẫu.");
        if (string.IsNullOrWhiteSpace(title)) throw new ArgumentException("Tiêu đề là bắt buộc", nameof(title));
        if (title.Trim().Length > 150) throw new ArgumentException("Tiêu đề tối đa 150 ký tự", nameof(title));
        if (!PcBuildUseCaseTags.IsKnown(useCaseTag)) throw new ArgumentException("Nhu cầu không hợp lệ", nameof(useCaseTag));

        Name = title.Trim();
        UseCaseTag = useCaseTag;
        SortOrder = sortOrder;
        IsFeatured = isFeatured;
        IsPublic = isPublic;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>MỘT predicate hiển thị công khai — dùng chung cho API gallery, SEO shell và sitemap.</summary>
    public static Expression<Func<SavedPcBuild, bool>> IsPubliclyVisible =>
        b => b.IsActive && b.IsPublic && b.CustomerId == null && b.UseCaseTag != null;
}
