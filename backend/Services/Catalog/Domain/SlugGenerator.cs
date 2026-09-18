namespace Catalog.Domain;

public static class SlugGenerator
{
    public static string Generate(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return string.Empty;

        // Bỏ dấu + hạ chữ thường (dùng chung VietnameseTextNormalizer với phần tìm kiếm - DRY).
        var result = VietnameseTextNormalizer.Fold(name);

        // Remove non-alphanumeric characters (keep hyphens and spaces)
        result = System.Text.RegularExpressions.Regex.Replace(result, @"[^a-z0-9\s-]", "");
        // Collapse whitespace/hyphens into single hyphen
        result = System.Text.RegularExpressions.Regex.Replace(result, @"[\s-]+", "-");
        result = result.Trim('-');

        return result;
    }

    public static string GenerateUnique(string name, Func<string, bool> slugExists)
    {
        var baseSlug = Generate(name);
        if (string.IsNullOrEmpty(baseSlug)) return string.Empty;
        if (!slugExists(baseSlug)) return baseSlug;

        var counter = 2;
        while (slugExists($"{baseSlug}-{counter}"))
            counter++;

        return $"{baseSlug}-{counter}";
    }
}
