using System.Text.Json.Serialization;

namespace Catalog.Infrastructure.Data.Import;

/// <summary>
/// One curated product record, exactly as it is stored in
/// <c>Import/dataset/products/&lt;slug&gt;.json</c>. Every field was verified against the
/// manufacturer's own page on 2026-09-18; the importer never invents or defaults a value.
/// </summary>
public sealed class ProductImportRecord
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string Brand { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? SubCategory { get; set; }
    public string? Model { get; set; }
    public string? OfficialUrl { get; set; }

    public decimal PriceVnd { get; set; }
    public decimal? OldPriceVnd { get; set; }
    public decimal CostPriceVnd { get; set; }

    public int? WarrantyMonths { get; set; }
    public string? WarrantyInfo { get; set; }
    public decimal WeightKg { get; set; }
    public int StockQuantity { get; set; }

    public string? ShortDescription { get; set; }
    public string? DescriptionHtml { get; set; }
    public List<string> Highlights { get; set; } = new();
    public List<SpecImportRow> Specs { get; set; } = new();
    public Dictionary<string, string> FilterAttributes { get; set; } = new();
    public List<ImageImportRef> Images { get; set; } = new();

    /// <summary>
    /// The ONLY admission predicate for images. Must be exactly <c>"ok"</c>.
    /// <c>"partial"</c> / <c>"failed"</c> mean the curation pass could not find enough
    /// compliant manufacturer photographs - the record is reported, never imported,
    /// and never padded with a substitute picture.
    /// </summary>
    public string ImageStatus { get; set; } = string.Empty;

    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
    public string? Notes { get; set; }
    public string? ReplacedWith { get; set; }
}

public sealed class SpecImportRow
{
    public string Group { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Source { get; set; }
}

public sealed class ImageImportRef
{
    /// <summary>File name inside the curation workspace, e.g. <c>01.webp</c>.</summary>
    public string File { get; set; } = string.Empty;
    public string SourceUrl { get; set; } = string.Empty;
    public string Alt { get; set; } = string.Empty;
}

// ----------------------------------------------------------------- taxonomy

public sealed class CategoryTaxonomyFile
{
    public List<CategoryTaxonomyEntry> Categories { get; set; } = new();
    public List<string> ReturnExcludedSkus { get; set; } = new();
}

public sealed class CategoryTaxonomyEntry
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsSerialTracked { get; set; }
    public decimal VatRate { get; set; } = 0.10m;
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
}

// ----------------------------------------------------------------- media manifest

/// <summary>
/// Written by <c>scripts/product-media/publish-seed-media.cjs</c>. The importer treats it as
/// the allowlist of publishable image files: a file with no entry here never reaches the DB.
/// </summary>
public sealed class MediaManifestFile
{
    public string UrlPrefix { get; set; } = "/media/seed/products";
    public long TotalBytes { get; set; }
    public List<MediaManifestEntry> Files { get; set; } = new();
}

public sealed class MediaManifestEntry
{
    public string Path { get; set; } = string.Empty;
    public string Sha256 { get; set; } = string.Empty;
    public long Bytes { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }

    /// <summary><c>main</c> or <c>thumb</c>. Exactly two renditions exist (D02).</summary>
    public string Rendition { get; set; } = string.Empty;

    public string Slug { get; set; } = string.Empty;
    public string Alt { get; set; } = string.Empty;
    public string Brand { get; set; } = string.Empty;
    public string SourcePageUrl { get; set; } = string.Empty;
    public string SourceImageUrl { get; set; } = string.Empty;
    public string CapturedAt { get; set; } = string.Empty;
    public string LicenseBasis { get; set; } = string.Empty;
}

public sealed class OfficialSourceDomainsFile
{
    [JsonPropertyName("allowedHosts")]
    public List<string> AllowedHosts { get; set; } = new();
}
