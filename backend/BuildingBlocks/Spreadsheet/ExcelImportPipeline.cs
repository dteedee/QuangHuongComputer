using ClosedXML.Excel;

namespace BuildingBlocks.Spreadsheet;

/// <summary>
/// The one Excel import/export path for the whole back office (D10): generate a template, read an
/// upload, validate every row, and hand the operator back a workbook with a "Lỗi" column appended so
/// they can fix it in place and re-upload.
///
/// Why one pipeline: bulk price updates, stock counts, product imports and payroll imports were each
/// going to grow their own parser. They would each have to re-decide the same four things - what
/// happens on a missing header, what happens on row 5.001, what a blank required cell means, and
/// whether a cell starting with <c>=</c> is written back raw. Getting the last one wrong ships a
/// formula-injection vector to the shop's own staff (see <see cref="ExcelSafeText"/>).
///
/// Template and error-workbook generation live in <c>ExcelImportPipelineWorkbooks.cs</c>.
/// </summary>
/// <typeparam name="TRow">Row type the module wants; needs a parameterless constructor.</typeparam>
public sealed partial class ExcelImportPipeline<TRow> where TRow : new()
{
    /// <summary>5 MB. An XLSX is zipped, so this is a very large sheet; anything bigger is a mistake
    /// or a zip bomb, and it is refused BEFORE ClosedXML decompresses it.</summary>
    public const long DefaultMaxBytes = 5 * 1024 * 1024;

    /// <summary>Rows per upload. Bigger jobs are split, so one request cannot hold a transaction open
    /// for minutes or blow the audit trail (see <c>AuditScope.Bulk</c>).</summary>
    public const int DefaultMaxRows = 5_000;

    private readonly IReadOnlyList<ExcelImportColumn<TRow>> _columns;
    private readonly Func<TRow, IEnumerable<string>>? _validateRow;

    public ExcelImportPipeline(
        IReadOnlyList<ExcelImportColumn<TRow>> columns,
        Func<TRow, IEnumerable<string>>? validateRow = null,
        long maxBytes = DefaultMaxBytes,
        int maxRows = DefaultMaxRows)
    {
        if (columns is null || columns.Count == 0)
        {
            throw new ArgumentException("An import needs at least one column.", nameof(columns));
        }

        var duplicate = columns.GroupBy(c => c.Header, StringComparer.OrdinalIgnoreCase)
            .FirstOrDefault(g => g.Count() > 1);
        if (duplicate is not null)
        {
            throw new ArgumentException($"Duplicate column header '{duplicate.Key}'.", nameof(columns));
        }

        _columns = columns;
        _validateRow = validateRow;
        MaxBytes = maxBytes;
        MaxRows = maxRows;
    }

    public long MaxBytes { get; }

    public int MaxRows { get; }

    /// <summary>
    /// Reads an uploaded workbook. Never throws on bad DATA - data problems come back as
    /// <see cref="ExcelImportResult{TRow}.Errors"/>. It throws <see cref="InvalidDataException"/>
    /// only when the FILE itself cannot be used: too large, not a workbook, empty, too many rows, or
    /// missing a required header. Endpoints map that to 400 with the Vietnamese message verbatim.
    /// </summary>
    public ExcelImportResult<TRow> Read(Stream upload)
    {
        ArgumentNullException.ThrowIfNull(upload);

        // The cap must hold on BOTH shapes of stream. An IFormFile is seekable, so Length answers at
        // once; a raw request body (or any forwarded/network stream) is NOT, and checking only
        // CanSeek would hand that path straight to ClosedXML - i.e. the zip bomb this limit exists
        // for would be decompressed after all. So a non-seekable upload is copied through a hard
        // ceiling first and never reaches the decompressor whole.
        var source = upload.CanSeek ? upload : BufferWithinLimit(upload);
        if (source.CanSeek && source.Length > MaxBytes)
        {
            throw new InvalidDataException(
                $"Tệp vượt quá giới hạn {MaxBytes / (1024 * 1024)} MB. Vui lòng chia nhỏ tệp.");
        }

        var result = new ExcelImportResult<TRow>();

        using var workbook = OpenWorkbook(source);
        var sheet = workbook.Worksheets.FirstOrDefault()
            ?? throw new InvalidDataException("Tệp không có trang tính nào.");

        var headerRow = sheet.FirstRowUsed()
            ?? throw new InvalidDataException("Không tìm thấy dòng tiêu đề trong tệp.");

        var columnIndex = MapHeaders(headerRow);
        var headerRowNumber = headerRow.RowNumber();
        var lastRow = sheet.LastRowUsed()?.RowNumber() ?? headerRowNumber;

        for (var rowNumber = headerRowNumber + 1; rowNumber <= lastRow; rowNumber++)
        {
            var cells = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
            foreach (var column in _columns)
            {
                cells[column.Header] = sheet.Cell(rowNumber, columnIndex[column.Header]).GetString().Trim();
            }

            // A sheet's "used range" happily includes rows whose cells were only ever formatted.
            // Skipping them here is what stops a template from reporting 1.000 blank-row errors.
            if (cells.Values.All(string.IsNullOrEmpty)) continue;

            result.TotalRows++;
            if (result.TotalRows > MaxRows)
            {
                throw new InvalidDataException(
                    $"Tệp có nhiều hơn {MaxRows} dòng dữ liệu. Vui lòng chia nhỏ tệp.");
            }

            BindRow(result, rowNumber, cells);
        }

        return result;
    }

    private void BindRow(ExcelImportResult<TRow> result, int rowNumber, Dictionary<string, string?> cells)
    {
        var row = new TRow();
        var rowHadError = false;

        foreach (var column in _columns)
        {
            var value = cells[column.Header];

            if (column.Required && string.IsNullOrEmpty(value))
            {
                result.Errors.Add(new ExcelImportError(rowNumber, column.Header, "Bắt buộc nhập."));
                rowHadError = true;
                continue;
            }

            string? message;
            try
            {
                message = column.Bind(row, value);
            }
            catch (Exception ex)
            {
                // A binder is module code. Its bug must fail THIS ROW, not the whole upload, and the
                // operator must never see a stack trace.
                message = $"Giá trị không hợp lệ ({ex.GetType().Name}).";
            }

            if (message is not null)
            {
                result.Errors.Add(new ExcelImportError(rowNumber, column.Header, message));
                rowHadError = true;
            }
        }

        // Row-level rules only run on a row whose cells all parsed - "ngày kết thúc phải sau ngày bắt
        // đầu" cannot be judged when one of the two dates failed to bind.
        if (_validateRow is not null && !rowHadError)
        {
            foreach (var message in _validateRow(row))
            {
                result.Errors.Add(new ExcelImportError(rowNumber, null, message));
                rowHadError = true;
            }
        }

        if (rowHadError)
        {
            // Kept so BuildErrorWorkbook can hand the operator their own row back.
            result.FailedRowCells[rowNumber] = cells;
        }
        else
        {
            result.Rows.Add(row);
        }
    }

    private Dictionary<string, int> MapHeaders(IXLRow headerRow)
    {
        var found = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var lastColumn = headerRow.LastCellUsed()?.Address.ColumnNumber ?? 0;
        var sheet = headerRow.Worksheet;
        var rowNumber = headerRow.RowNumber();

        for (var c = 1; c <= lastColumn; c++)
        {
            // The template marks a required column with a trailing " *"; the operator may also have
            // reordered columns or left extra ones in. Match on the trimmed, star-less text.
            var text = sheet.Cell(rowNumber, c).GetString().Trim().TrimEnd('*').Trim();
            if (string.IsNullOrEmpty(text) || found.ContainsKey(text)) continue;
            found[text] = c;
        }

        var missing = _columns.Where(col => !found.ContainsKey(col.Header)).Select(col => col.Header).ToList();
        if (missing.Count > 0)
        {
            throw new InvalidDataException(
                $"Tệp thiếu cột: {string.Join(", ", missing)}. Vui lòng tải lại tệp mẫu.");
        }

        return _columns.ToDictionary(col => col.Header, col => found[col.Header], StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Copies a non-seekable upload into memory, refusing it the moment it exceeds
    /// <see cref="MaxBytes"/> - so an endless or oversized stream costs at most MaxBytes of RAM and
    /// is never handed to the XLSX decompressor.
    /// </summary>
    private MemoryStream BufferWithinLimit(Stream upload)
    {
        var buffer = new MemoryStream();
        var chunk = new byte[81920];
        int read;

        while ((read = upload.Read(chunk, 0, chunk.Length)) > 0)
        {
            if (buffer.Length + read > MaxBytes)
            {
                throw new InvalidDataException(
                    $"Tệp vượt quá giới hạn {MaxBytes / (1024 * 1024)} MB. Vui lòng chia nhỏ tệp.");
            }

            buffer.Write(chunk, 0, read);
        }

        buffer.Position = 0;
        return buffer;
    }

    private static XLWorkbook OpenWorkbook(Stream upload)
    {
        try
        {
            return new XLWorkbook(upload);
        }
        catch (Exception ex) when (ex is not InvalidDataException)
        {
            throw new InvalidDataException("Tệp không phải là tệp Excel (.xlsx) hợp lệ.", ex);
        }
    }
}
