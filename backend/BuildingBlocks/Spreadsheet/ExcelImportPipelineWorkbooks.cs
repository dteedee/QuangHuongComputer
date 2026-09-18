using ClosedXML.Excel;

namespace BuildingBlocks.Spreadsheet;

/// <summary>
/// Workbook GENERATION half of <see cref="ExcelImportPipeline{TRow}"/>: the blank template the
/// operator downloads, and the annotated copy they get back when rows fail. Split from the reading
/// half to keep both files under the 200-line limit.
/// </summary>
public sealed partial class ExcelImportPipeline<TRow> where TRow : new()
{
    /// <summary>
    /// Empty workbook with the headers, a grey hint row, and frozen panes. Text format on every data
    /// column, so an SKU like <c>0912</c> or <c>1E5</c> is not silently turned into a number by Excel
    /// before the file ever reaches us.
    /// </summary>
    public byte[] BuildTemplate(string sheetName = "Dữ liệu")
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add(SafeSheetName(sheetName));

        for (var i = 0; i < _columns.Count; i++)
        {
            var column = _columns[i];

            var header = sheet.Cell(1, i + 1);
            header.Value = column.Header + (column.Required ? " *" : string.Empty);
            header.Style.Font.Bold = true;

            var hint = sheet.Cell(2, i + 1);
            hint.Value = column.Hint ?? (column.Required ? "Bắt buộc" : string.Empty);
            hint.Style.Font.Italic = true;

            sheet.Column(i + 1).Style.NumberFormat.Format = "@";
            sheet.Column(i + 1).Width = Math.Min(40, Math.Max(14, column.Header.Length + 4));
        }

        sheet.SheetView.FreezeRows(2);

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    /// <summary>
    /// The FAILED rows exactly as uploaded, plus a trailing <c>Lỗi</c> column holding every message
    /// for that row - so the operator fixes the file they already have instead of cross-referencing a
    /// list of row numbers. Rows that imported cleanly are omitted; re-uploading this workbook
    /// therefore imports only what was still missing.
    ///
    /// Every value goes through <see cref="ExcelSafeText"/>: the content came from a user, and this
    /// workbook is opened by staff.
    /// </summary>
    public byte[] BuildErrorWorkbook(ExcelImportResult<TRow> result, string sheetName = "Lỗi")
    {
        ArgumentNullException.ThrowIfNull(result);

        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add(SafeSheetName(sheetName));
        var errorColumn = _columns.Count + 1;

        for (var i = 0; i < _columns.Count; i++)
        {
            sheet.Cell(1, i + 1).Value = _columns[i].Header;
            sheet.Cell(1, i + 1).Style.Font.Bold = true;
            sheet.Column(i + 1).Style.NumberFormat.Format = "@";
        }
        sheet.Cell(1, errorColumn).Value = "Lỗi";
        sheet.Cell(1, errorColumn).Style.Font.Bold = true;
        sheet.Column(errorColumn).Style.NumberFormat.Format = "@";
        sheet.Column(errorColumn).Width = 60;

        var messagesByRow = result.Errors
            .GroupBy(e => e.RowNumber)
            .ToDictionary(g => g.Key, g => string.Join(" | ", g.Select(FormatError)));

        var target = 2;
        foreach (var sourceRowNumber in result.FailedRowCells.Keys.OrderBy(n => n))
        {
            var cells = result.FailedRowCells[sourceRowNumber];

            for (var c = 0; c < _columns.Count; c++)
            {
                cells.TryGetValue(_columns[c].Header, out var value);
                sheet.Cell(target, c + 1).Value = ExcelSafeText.Neutralize(value) ?? string.Empty;
            }

            messagesByRow.TryGetValue(sourceRowNumber, out var messages);
            sheet.Cell(target, errorColumn).Value = ExcelSafeText.Neutralize(messages) ?? string.Empty;
            target++;
        }

        sheet.SheetView.FreezeRows(1);

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private static string FormatError(ExcelImportError error)
        => string.IsNullOrEmpty(error.Column) ? error.Message : $"{error.Column}: {error.Message}";

    /// <summary>Excel rejects a sheet name over 31 chars or containing <c>: \ / ? * [ ]</c>.</summary>
    private static string SafeSheetName(string name)
    {
        var cleaned = new string(name.Where(c => !":\\/?*[]".Contains(c)).ToArray()).Trim();
        if (cleaned.Length == 0) cleaned = "Dữ liệu";
        return cleaned.Length > 31 ? cleaned[..31] : cleaned;
    }
}
