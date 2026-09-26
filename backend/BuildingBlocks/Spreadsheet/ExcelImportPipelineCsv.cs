using System.Text;
using ClosedXML.Excel;

namespace BuildingBlocks.Spreadsheet;

/// <summary>
/// CSV entry point of <see cref="ExcelImportPipeline{TRow}"/>. The CSV is parsed by
/// <see cref="CsvTable"/> into an in-memory worksheet (every cell stored as TEXT, so "0912" or
/// "1E5" is never coerced to a number) and then goes through exactly the same header mapping,
/// required-cell, binder and row-rule path as an XLSX upload — one set of rules, two file formats.
/// </summary>
public sealed partial class ExcelImportPipeline<TRow> where TRow : new()
{
    /// <summary>True when the upload's file name says CSV (the only signal a multipart upload gives reliably).</summary>
    public static bool IsCsvFileName(string? fileName) =>
        fileName is not null && fileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase);

    /// <summary>Same contract as <see cref="Read"/>: data problems come back as errors, file problems throw <see cref="InvalidDataException"/>.</summary>
    public ExcelImportResult<TRow> ReadCsv(Stream upload)
    {
        ArgumentNullException.ThrowIfNull(upload);

        var source = upload.CanSeek ? upload : BufferWithinLimit(upload);
        if (source.CanSeek && source.Length > MaxBytes)
        {
            throw new InvalidDataException(
                $"Tệp vượt quá giới hạn {MaxBytes / (1024 * 1024)} MB. Vui lòng chia nhỏ tệp.");
        }

        string text;
        try
        {
            using var reader = new StreamReader(source, new UTF8Encoding(false, throwOnInvalidBytes: true),
                detectEncodingFromByteOrderMarks: true, leaveOpen: true);
            text = reader.ReadToEnd();
        }
        catch (DecoderFallbackException ex)
        {
            throw new InvalidDataException("Tệp CSV phải được lưu với mã hoá UTF-8.", ex);
        }

        var rows = CsvTable.Parse(text);
        if (rows.Count == 0) throw new InvalidDataException("Không tìm thấy dòng tiêu đề trong tệp.");
        if (rows.Count - 1 > MaxRows)
        {
            throw new InvalidDataException($"Tệp có nhiều hơn {MaxRows} dòng dữ liệu. Vui lòng chia nhỏ tệp.");
        }

        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("CSV");
        for (var r = 0; r < rows.Count; r++)
        {
            for (var c = 0; c < rows[r].Length; c++)
            {
                if (rows[r][c].Length == 0) continue;
                sheet.Cell(r + 1, c + 1).Value = rows[r][c];
            }
        }

        return ReadWorkbook(workbook);
    }
}
