namespace BuildingBlocks.Seo;

/// <summary>
/// Nội dung thân trang mà SEO shell vẽ sẵn vào <c>#root</c> (docs/seo-shell.md "Body fragment").
/// Provider chỉ đưa DỮ LIỆU (chuỗi thuần, đường dẫn tương đối); <c>SeoShellBodyRenderer</c> ở
/// ApiGateway mới dựng markup và HTML-encode mọi thứ. Ngoại lệ duy nhất là <see cref="Article"/>:
/// HTML bài viết, chỉ tạo được qua <see cref="SeoHtmlSanitizer.Sanitize"/> nên không provider nào
/// nhét được HTML thô vào trang.
///
/// React mount bằng <c>createRoot</c> (không hydrate) nên toàn bộ khối này bị thay khi JS chạy —
/// nó chỉ tồn tại cho bot (Cốc Cốc, Bing) và vài trăm mili-giây trước khi SPA lên.
/// </summary>
public sealed record SeoBodyFragment
{
    /// <summary>Nội dung thẻ H1 (bắt buộc — một trang đúng một H1).</summary>
    public required string Heading { get; init; }

    /// <summary>Đường dẫn breadcrumb, gốc trước. Mục cuối thường có <c>Href = null</c> (trang hiện tại).</summary>
    public IReadOnlyList<SeoLink> Breadcrumbs { get; init; } = Array.Empty<SeoLink>();

    /// <summary>Các dòng "nhãn: giá trị" nổi bật ngay dưới H1 (giá, tình trạng kho, thương hiệu).</summary>
    public IReadOnlyList<SeoFact> Facts { get; init; } = Array.Empty<SeoFact>();

    /// <summary>Thông số chính (tối đa vài dòng) — vẽ thành danh sách dưới tiêu đề "Thông số chính".</summary>
    public IReadOnlyList<SeoFact> Specs { get; init; } = Array.Empty<SeoFact>();

    /// <summary>Đoạn mô tả ngắn / giới thiệu, văn bản thuần.</summary>
    public string? Summary { get; init; }

    /// <summary>Tiêu đề cho <see cref="Items"/> (ví dụ "Sản phẩm").</summary>
    public string? ItemsHeading { get; init; }

    /// <summary>Danh sách liên kết (sản phẩm trong danh mục, ...), mỗi mục có thể kèm giá.</summary>
    public IReadOnlyList<SeoListItem> Items { get; init; } = Array.Empty<SeoListItem>();

    public SeoLink? PreviousPage { get; init; }
    public SeoLink? NextPage { get; init; }

    /// <summary>Thân bài viết đã qua bộ lọc allow-list. Null = không có.</summary>
    public SanitizedHtml? Article { get; init; }
}

/// <summary>Liên kết nội bộ. <c>Href</c> phải là đường dẫn gốc ("/..."); renderer bỏ link nếu không phải.</summary>
public sealed record SeoLink(string Text, string? Href);

public sealed record SeoFact(string Label, string Value);

/// <summary>Một mục danh sách: chữ + link + chi tiết phụ (giá đã định dạng).</summary>
public sealed record SeoListItem(string Text, string Href, string? Detail);

/// <summary>
/// HTML đã được <see cref="SeoHtmlSanitizer"/> dựng lại từ đầu theo allow-list. Constructor
/// internal: ngoài BuildingBlocks không ai tạo được giá trị này từ chuỗi thô.
/// </summary>
public sealed class SanitizedHtml
{
    internal SanitizedHtml(string value) => Value = value;

    public string Value { get; }

    public override string ToString() => Value;
}
