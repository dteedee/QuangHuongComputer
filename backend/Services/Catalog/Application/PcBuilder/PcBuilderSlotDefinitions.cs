namespace Catalog.Application.PcBuilder;

/// <summary>Một "khay" linh kiện trong build (CPU, Mainboard, RAM...).</summary>
public sealed record PcBuilderSlot(
    string Id,
    string Name,
    string CategorySlug,
    IReadOnlyList<string>? SubCategories,
    bool Required,
    bool AllowMultiple,
    int MaxQuantity);

/// <summary>
/// Cấu hình slot theo (category slug + <c>Attributes.subCategory</c>), KHÔNG so khớp theo tên sản
/// phẩm/danh mục (Implementation Steps #1). Danh mục Catalog hiện KHÔNG có cây con thật cho linh
/// kiện: cả 9 loại linh kiện PC (CPU..Tản nhiệt) đều nằm phẳng dưới MỘT danh mục
/// "Linh Kiện Máy Tính" (slug <c>linh-kien-may-tinh</c>), phân biệt bằng
/// <c>Attributes.subCategory</c> do W0-6 gán (đo trực tiếp trên DB dev 2026-09-18, xem báo cáo
/// track W2-9). Đây là sự lệch với "cây danh mục" mà Key Insights giả định - ghi nhận làm integration
/// note, không phải lỗi của track này.
/// </summary>
public static class PcBuilderSlotDefinitions
{
    private const string PartsCategorySlug = "linh-kien-may-tinh";
    private const string MonitorCategorySlug = "man-hinh-may-tinh";

    public static readonly IReadOnlyList<PcBuilderSlot> Slots = new[]
    {
        new PcBuilderSlot("cpu", "CPU", PartsCategorySlug, new[] { "CPU" }, Required: true, AllowMultiple: false, MaxQuantity: 1),
        new PcBuilderSlot("mainboard", "Bo mạch chủ", PartsCategorySlug, new[] { "Mainboard" }, Required: true, AllowMultiple: false, MaxQuantity: 1),
        new PcBuilderSlot("ram", "RAM", PartsCategorySlug, new[] { "RAM" }, Required: true, AllowMultiple: true, MaxQuantity: 4),
        new PcBuilderSlot("vga", "Card đồ hoạ (VGA)", PartsCategorySlug, new[] { "VGA" }, Required: false, AllowMultiple: false, MaxQuantity: 1),
        new PcBuilderSlot("storage", "Ổ cứng (SSD/HDD)", PartsCategorySlug, new[] { "SSD", "HDD" }, Required: true, AllowMultiple: true, MaxQuantity: 4),
        new PcBuilderSlot("psu", "Nguồn (PSU)", PartsCategorySlug, new[] { "PSU" }, Required: true, AllowMultiple: false, MaxQuantity: 1),
        new PcBuilderSlot("case", "Vỏ case", PartsCategorySlug, new[] { "Case" }, Required: true, AllowMultiple: false, MaxQuantity: 1),
        new PcBuilderSlot("cooler", "Tản nhiệt", PartsCategorySlug, new[] { "Tản nhiệt" }, Required: false, AllowMultiple: false, MaxQuantity: 1),
        // Màn hình: phụ kiện, không tham gia luật tương thích - chỉ để "chọn cả bộ" tiện cho khách.
        new PcBuilderSlot("monitor", "Màn hình", MonitorCategorySlug, SubCategories: null, Required: false, AllowMultiple: true, MaxQuantity: 3),
    };

    /// <summary>Các slot bắt buộc để một build được coi là "đầy đủ" (dùng cho gợi ý theo ngân sách, D10).</summary>
    public static readonly IReadOnlyList<string> RequiredSlotIds =
        Slots.Where(s => s.Required).Select(s => s.Id).ToList();

    public static PcBuilderSlot? Find(string slotId)
        => Slots.FirstOrDefault(s => string.Equals(s.Id, slotId, StringComparison.OrdinalIgnoreCase));

    /// <summary>Suy slot từ danh mục + subCategory đo được của sản phẩm. Không khớp -&gt; null ("khác").</summary>
    public static PcBuilderSlot? ResolveSlot(string? categorySlug, string? subCategory)
    {
        if (string.IsNullOrWhiteSpace(categorySlug)) return null;

        return Slots.FirstOrDefault(s =>
            string.Equals(s.CategorySlug, categorySlug, StringComparison.OrdinalIgnoreCase) &&
            (s.SubCategories == null ||
             (subCategory != null && s.SubCategories.Contains(subCategory, StringComparer.OrdinalIgnoreCase))));
    }
}
