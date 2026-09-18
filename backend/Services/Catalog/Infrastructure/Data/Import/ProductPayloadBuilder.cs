using System.Text.Json;

namespace Catalog.Infrastructure.Data.Import;

/// <summary>
/// Builds the two jsonb payloads a product carries: the spec sheet and the extensibility blob.
/// </summary>
public static class ProductPayloadBuilder
{
    /// <summary>
    /// <c>Products.Specifications</c>:
    /// <c>[{ "group": "...", "label": "...", "value": "...", "source": "..." }]</c>.
    ///
    /// The storefront's legacy parser reads <c>label</c>/<c>value</c> and ignores every other key
    /// (<c>frontend/src/utils/parse-legacy-product-specifications.ts</c>), so the spec group and
    /// the URL each line was verified against ride along without breaking anything that renders
    /// today, and are there for whoever builds the grouped spec table.
    /// </summary>
    public static string Specifications(ProductImportRecord record)
        => JsonSerializer.Serialize(record.Specs.Select(s => new
        {
            group = s.Group,
            label = s.Name,
            value = s.Value,
            source = s.Source,
        }));

    /// <summary>
    /// <c>Products.Attributes</c>: everything verified that has no column of its own.
    /// <c>descriptionHtml</c> lives here rather than in <c>Description</c> because the PDP renders
    /// that column as plain text - see <see cref="ProductDescriptionFormatter"/>.
    /// </summary>
    public static string Attributes(ProductImportRecord record)
        => JsonSerializer.Serialize(new
        {
            subCategory = record.SubCategory,
            model = record.Model,
            officialUrl = record.OfficialUrl,
            highlights = record.Highlights,
            filterAttributes = record.FilterAttributes,
            descriptionHtml = record.DescriptionHtml,
            source = "seed:w0-6",
        });
}
