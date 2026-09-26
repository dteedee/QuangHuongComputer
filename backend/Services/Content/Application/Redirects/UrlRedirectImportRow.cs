using BuildingBlocks.Spreadsheet;

namespace Content.Application.Redirects;

public enum UrlRedirectImportAction { None, Create, Update, Skip }

/// <summary>One CSV/XLSX row of the redirect import, plus the plan decided for it during validation.</summary>
public sealed class UrlRedirectImportRow
{
    public string? FromPath { get; set; }
    public string? ToPath { get; set; }
    public int StatusCode { get; set; } = 301;
    public string? Note { get; set; }
    public bool IsActive { get; set; } = true;

    public UrlRedirectImportAction Action { get; set; }
    public Guid? ExistingId { get; set; }
    public UrlRedirectValidated? Value { get; set; }

    public UrlRedirectInput ToInput() => new(FromPath, ToPath, StatusCode, Note, IsActive);
}

/// <summary>
/// Column layout shared by the import, the template and the export (so an export re-imports as-is).
/// Extra columns in an upload (hit count, source… from an export) are ignored by the pipeline.
/// </summary>
public static class UrlRedirectImportColumns
{
    public const string FromPath = "Đường dẫn cũ";
    public const string ToPath = "Đường dẫn mới";
    public const string StatusCode = "Mã chuyển hướng";
    public const string Note = "Ghi chú";
    public const string IsActive = "Kích hoạt";

    public static readonly string[] Headers = { FromPath, ToPath, StatusCode, Note, IsActive };

    private static readonly string[] Truthy = { "1", "true", "yes", "có", "co", "x" };
    private static readonly string[] Falsy = { "0", "false", "no", "không", "khong" };

    public static IReadOnlyList<ExcelImportColumn<UrlRedirectImportRow>> Build() => new[]
    {
        ExcelImportColumn<UrlRedirectImportRow>.Text(FromPath, (r, v) => r.FromPath = v, required: true,
            hint: "/duong-dan-cu.html hoặc URL đầy đủ của web cũ"),
        ExcelImportColumn<UrlRedirectImportRow>.Text(ToPath, (r, v) => r.ToPath = v,
            hint: "/san-pham/slug-moi hoặc https://… (bỏ trống nếu 410)"),
        new ExcelImportColumn<UrlRedirectImportRow>(StatusCode, (r, v) =>
        {
            if (string.IsNullOrWhiteSpace(v)) { r.StatusCode = 301; return null; }
            if (int.TryParse(v.Trim(), out var code) && code is 301 or 302 or 410) { r.StatusCode = code; return null; }
            return "Chỉ nhận 301, 302 hoặc 410.";
        }, hint: "301 (mặc định), 302 hoặc 410"),
        ExcelImportColumn<UrlRedirectImportRow>.Text(Note, (r, v) => r.Note = v),
        new ExcelImportColumn<UrlRedirectImportRow>(IsActive, (r, v) =>
        {
            var text = (v ?? string.Empty).Trim().ToLowerInvariant();
            if (text.Length == 0 || Truthy.Contains(text)) { r.IsActive = true; return null; }
            if (Falsy.Contains(text)) { r.IsActive = false; return null; }
            return "Nhập 1 (bật) hoặc 0 (tắt).";
        }, hint: "1 = bật (mặc định), 0 = tắt"),
    };
}
