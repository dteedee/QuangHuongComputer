namespace BuildingBlocks.Spreadsheet;

/// <summary>
/// One column of an import template: how it is labelled in the sheet, whether it must be filled, and
/// how its text becomes a property on <typeparamref name="TRow"/>.
///
/// The binder returns a Vietnamese error message instead of throwing, so a whole file is validated in
/// one pass and the operator gets every problem at once rather than one per re-upload.
/// </summary>
/// <typeparam name="TRow">The strongly typed row the module wants back.</typeparam>
public sealed class ExcelImportColumn<TRow>
{
    /// <param name="header">Exact header text written into the template and matched on upload
    /// (trimmed, case-insensitive). Vietnamese, because the operator reads it.</param>
    /// <param name="bind">Applies the cell's trimmed text to the row. Returns null on success, or a
    /// Vietnamese message describing what is wrong with this cell.</param>
    /// <param name="required">When true, a blank cell is an error before <paramref name="bind"/> runs.</param>
    /// <param name="hint">Shown in the template's instruction row, e.g. "yyyy-MM-dd" or "VND, không dấu phân cách".</param>
    public ExcelImportColumn(
        string header,
        Func<TRow, string?, string?> bind,
        bool required = false,
        string? hint = null)
    {
        if (string.IsNullOrWhiteSpace(header))
        {
            throw new ArgumentException("Column header must not be empty.", nameof(header));
        }

        Header = header.Trim();
        Bind = bind ?? throw new ArgumentNullException(nameof(bind));
        Required = required;
        Hint = hint;
    }

    public string Header { get; }

    public bool Required { get; }

    public string? Hint { get; }

    public Func<TRow, string?, string?> Bind { get; }

    /// <summary>Column that only needs the raw text stored - the common case.</summary>
    public static ExcelImportColumn<TRow> Text(
        string header,
        Action<TRow, string?> set,
        bool required = false,
        string? hint = null)
        => new(header, (row, value) => { set(row, value); return null; }, required, hint);
}

/// <summary>One problem found in one cell (or, with <see cref="Column"/> null, in a whole row).</summary>
/// <param name="RowNumber">1-based row number AS SHOWN IN EXCEL, so the operator can jump to it.</param>
/// <param name="Column">Header of the offending column, or null for a row-level rule.</param>
/// <param name="Message">Vietnamese explanation of what to fix.</param>
public sealed record ExcelImportError(int RowNumber, string? Column, string Message);

/// <summary>Outcome of reading an uploaded workbook: the rows that parsed, and every problem found.</summary>
/// <typeparam name="TRow">The module's row type.</typeparam>
public sealed class ExcelImportResult<TRow>
{
    /// <summary>Rows with no error. A row with any error is NOT here - partial imports corrupt data.</summary>
    public List<TRow> Rows { get; } = new();

    /// <summary>Every problem, in sheet order. Empty means the file is importable as-is.</summary>
    public List<ExcelImportError> Errors { get; } = new();

    /// <summary>
    /// Raw cell text of the rows that failed, keyed by their Excel row number. Kept so
    /// <c>BuildErrorWorkbook</c> can hand the operator their own row back with a "Lỗi" column
    /// appended, instead of a bare list of row numbers.
    /// </summary>
    public Dictionary<int, Dictionary<string, string?>> FailedRowCells { get; } = new();

    /// <summary>Data rows seen, excluding the header. Errors + Rows can be fewer (a row can hold several errors).</summary>
    public int TotalRows { get; set; }

    public bool IsValid => Errors.Count == 0;
}
