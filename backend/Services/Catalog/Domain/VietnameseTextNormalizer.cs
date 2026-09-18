namespace Catalog.Domain;

using System.Globalization;
using System.Text;

/// <summary>
/// Chuẩn hoá chuỗi tiếng Việt: bỏ dấu (diacritics) và xử lý riêng ký tự "đ/Đ".
/// Unicode không coi nét ngang của "đ" là dấu tổ hợp (NonSpacingMark) nên NFD không tách được,
/// phải thay thủ công trước khi normalize.
///
/// Dùng chung cho hai chỗ:
///  - <see cref="SlugGenerator"/> khi sinh slug SEO;
///  - chuẩn hoá từ khoá tìm kiếm phía C# trước khi so khớp với `unaccent()` phía PostgreSQL,
///    để "asus" / "Asus" / "asús" cùng quy về một chuỗi.
/// </summary>
public static class VietnameseTextNormalizer
{
    /// <summary>Bỏ toàn bộ dấu tiếng Việt, giữ nguyên hoa/thường và mọi ký tự khác.</summary>
    public static string RemoveDiacritics(string? value)
    {
        if (string.IsNullOrEmpty(value)) return string.Empty;

        // "đ"/"Đ" phải thay trước: NFD không tách nét ngang thành dấu tổ hợp.
        var stripped = value.Replace("đ", "d").Replace("Đ", "D");

        var decomposed = stripped.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(decomposed.Length);
        foreach (var c in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }

        return sb.ToString().Normalize(NormalizationForm.FormC);
    }

    /// <summary>Bỏ dấu + hạ chữ thường + trim. Dạng dùng để so khớp tìm kiếm.</summary>
    public static string Fold(string? value)
        => RemoveDiacritics(value).ToLowerInvariant().Trim();
}
