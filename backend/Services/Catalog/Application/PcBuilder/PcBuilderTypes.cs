using System.Globalization;
using System.Text.Json;

namespace Catalog.Application.PcBuilder;

/// <summary>
/// Kết quả một luật tương thích. BA trạng thái, KHÔNG hai: <see cref="PcRuleVerdictKind.CannotVerify"/>
/// là câu trả lời trung thực khi thiếu dữ liệu - không bao giờ suy diễn thành "compatible" (Key
/// Insights của phase-47). <see cref="RuleId"/> ổn định (dùng để test/lọc), <see cref="Message"/>
/// luôn tiếng Việt cho người dùng cuối.
/// </summary>
public enum PcRuleVerdictKind { Compatible, Incompatible, CannotVerify }

public sealed record PcRuleVerdict(
    string RuleId,
    string RuleName,
    PcRuleVerdictKind Verdict,
    string Message,
    IReadOnlyList<string>? MissingKeys = null);

/// <summary>Một dòng trong build: sản phẩm + số lượng. Dùng cho request lẫn payload add-to-cart.</summary>
public sealed record PcBuildLineDto(Guid ProductId, int Quantity);

/// <summary>
/// Thông số đã phân giải của một sản phẩm, đọc từ cột jsonb <c>Products.Attributes</c> theo hình
/// dạng đo được ở W0-6 (<c>spec-keys.md</c>): <c>{ subCategory, filterAttributes: {...} }</c>.
/// KHÔNG đọc <c>ProductSpecificationValues</c> - bảng đó rỗng, xem báo cáo track.
/// </summary>
public sealed record PcComponentSpec(string? SubCategory, IReadOnlyDictionary<string, string> FilterAttributes)
{
    public static readonly PcComponentSpec Empty = new(null, new Dictionary<string, string>());

    public static PcComponentSpec Parse(string? attributesJson)
    {
        if (string.IsNullOrWhiteSpace(attributesJson)) return Empty;
        try
        {
            using var doc = JsonDocument.Parse(attributesJson);
            var root = doc.RootElement;
            string? subCategory = root.TryGetProperty("subCategory", out var sc) && sc.ValueKind == JsonValueKind.String
                ? sc.GetString()
                : null;

            var filters = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (root.TryGetProperty("filterAttributes", out var fa) && fa.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in fa.EnumerateObject())
                {
                    filters[prop.Name] = prop.Value.ValueKind == JsonValueKind.String
                        ? prop.Value.GetString() ?? string.Empty
                        : prop.Value.GetRawText();
                }
            }
            return new PcComponentSpec(subCategory, filters);
        }
        catch (JsonException)
        {
            // Attributes hỏng định dạng -> coi như không có dữ liệu, KHÔNG throw (một sản phẩm lỗi
            // không được làm sập cả trang candidates/check).
            return Empty;
        }
    }

    /// <summary>Rút số đầu tiên trong giá trị (vd "410" từ "410", "750W" -&gt; 750). Không có/không parse được -&gt; false.</summary>
    public bool TryGetNumber(string key, out decimal value)
    {
        value = 0;
        if (!FilterAttributes.TryGetValue(key, out var raw) || string.IsNullOrWhiteSpace(raw)) return false;
        var digits = new string(raw.Where(c => char.IsDigit(c) || c == '.').ToArray());
        return decimal.TryParse(digits, NumberStyles.Any, CultureInfo.InvariantCulture, out value) && digits.Length > 0;
    }
}

/// <summary>Một linh kiện đã gắn slot + thông số, sẵn sàng đưa vào bộ luật.</summary>
public sealed record PcResolvedComponent(
    Guid ProductId,
    string Name,
    string Sku,
    string SlotId,
    int Quantity,
    decimal UnitPrice,
    bool InStock,
    PcComponentSpec Spec);

/// <summary>Bọc danh sách linh kiện lại để các rule tra theo slot mà không lặp LINQ.</summary>
public sealed class PcBuildContext
{
    private readonly IReadOnlyList<PcResolvedComponent> _components;

    public PcBuildContext(IReadOnlyList<PcResolvedComponent> components) => _components = components;

    public IReadOnlyList<PcResolvedComponent> All => _components;

    public PcResolvedComponent? FirstOrDefault(string slotId)
        => _components.FirstOrDefault(c => string.Equals(c.SlotId, slotId, StringComparison.OrdinalIgnoreCase));

    public IReadOnlyList<PcResolvedComponent> AllOf(string slotId)
        => _components.Where(c => string.Equals(c.SlotId, slotId, StringComparison.OrdinalIgnoreCase)).ToList();
}
