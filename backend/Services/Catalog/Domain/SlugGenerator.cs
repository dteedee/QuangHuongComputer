namespace Catalog.Domain;

public static class SlugGenerator
{
    public static string Generate(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return string.Empty;

        var result = name.ToLower().Trim();

        // Special Vietnamese: đ must be replaced before diacritic normalization (already lowercase)
        result = result.Replace("đ", "d");

        // Normalize and remove diacritics (handles Vietnamese vowels like ê, ô, ơ, ư, etc.)
        var normalized = result.Normalize(System.Text.NormalizationForm.FormD);
        var sb = new System.Text.StringBuilder();
        foreach (var c in normalized)
        {
            var category = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c);
            if (category != System.Globalization.UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }
        result = sb.ToString().Normalize(System.Text.NormalizationForm.FormC);

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
        if (!slugExists(baseSlug)) return baseSlug;

        var counter = 2;
        while (slugExists($"{baseSlug}-{counter}"))
            counter++;

        return $"{baseSlug}-{counter}";
    }
}
