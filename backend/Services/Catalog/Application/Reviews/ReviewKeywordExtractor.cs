using System.Text.RegularExpressions;

namespace Catalog.Application.Reviews;

/// <summary>
/// Trích xuất từ khoá nổi bật từ nội dung đánh giá thật (Title + Comment) bằng tần suất từ đơn giản.
/// Không gọi AI ngoài — chỉ đếm tần suất, loại bỏ stopword tiếng Việt phổ biến (YAGNI).
/// </summary>
public static class ReviewKeywordExtractor
{
    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "và", "là", "có", "được", "của", "cho", "này", "rất", "thì", "một", "các", "khi",
        "để", "với", "không", "đã", "nên", "vẫn", "còn", "nhưng", "mà", "sản", "phẩm",
        "sau", "nếu", "tôi", "mình", "shop", "quá", "hơi", "cũng", "nó", "the", "a", "an"
    };

    /// <summary>
    /// Trả về tối đa <paramref name="take"/> từ/cụm từ xuất hiện nhiều nhất trong tập văn bản.
    /// </summary>
    public static string[] ExtractTopKeywords(IEnumerable<string> texts, int take = 6)
    {
        var frequency = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        foreach (var text in texts)
        {
            if (string.IsNullOrWhiteSpace(text)) continue;

            var words = Regex.Matches(text, @"[\p{L}]+")
                .Select(m => m.Value)
                .Where(w => w.Length >= 3 && !StopWords.Contains(w));

            foreach (var word in words)
            {
                frequency[word] = frequency.GetValueOrDefault(word) + 1;
            }
        }

        return frequency
            .Where(kv => kv.Value > 1) // bỏ từ chỉ xuất hiện 1 lần (nhiễu)
            .OrderByDescending(kv => kv.Value)
            .Take(take)
            .Select(kv => kv.Key)
            .ToArray();
    }
}
