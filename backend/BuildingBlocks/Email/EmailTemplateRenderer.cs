using System.Reflection;
using Scriban;

namespace BuildingBlocks.Email;

/// <summary>
/// Loads a Scriban template embedded from Email/Templates/*.scriban and renders it against a
/// model. One renderer so every transactional email shares the same mechanism instead of five
/// copy-pasted C# string-interpolated HTML blocks (the pre-W1-5 state of both EmailService.cs
/// files).
/// </summary>
public static class EmailTemplateRenderer
{
    private const string ResourcePrefix = "BuildingBlocks.Email.Templates.";
    private static readonly Assembly Assembly = typeof(EmailTemplateRenderer).Assembly;

    public static string Render(string templateName, object model)
    {
        var resourceName = $"{ResourcePrefix}{templateName}.scriban";
        using var stream = Assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException(
                $"Template Scriban không tồn tại (embedded resource thiếu): {resourceName}");
        using var reader = new StreamReader(stream);
        var templateText = reader.ReadToEnd();

        var template = Template.Parse(templateText, templateName);
        if (template.HasErrors)
        {
            throw new InvalidOperationException(
                $"Template '{templateName}' lỗi cú pháp Scriban: {string.Join("; ", template.Messages)}");
        }

        // Identity renamer: model property names are already the exact snake_case placeholders
        // used in the .scriban files (e.g. `customer_name`), so no member-name translation needed.
        return template.Render(model, member => member.Name);
    }
}
