using System.Text;

namespace BuildingBlocks.Spreadsheet;

/// <summary>
/// Minimal RFC 4180 CSV reader/writer for the bulk-import pipeline. CSV is what an old website's
/// SEO plugin, a crawler (Screaming Frog, Ahrefs) or Google Sheets hands the shop when migrating
/// hundreds of URLs, so <see cref="ExcelImportPipeline{TRow}"/> accepts it next to XLSX.
///
/// Reading: quoted fields, doubled quotes, embedded newlines, CRLF/LF, and a delimiter sniffed from
/// the header line (comma, semicolon — Excel in vi-VN locale saves with ';' — or tab).
/// Writing: UTF-8 with BOM (so Excel opens Vietnamese text correctly), every cell quoted, and every
/// cell passed through <see cref="ExcelSafeText"/> — the file is opened by staff.
/// </summary>
public static class CsvTable
{
    public static IReadOnlyList<string[]> Parse(string text)
    {
        ArgumentNullException.ThrowIfNull(text);
        if (text.Length > 0 && text[0] == '﻿') text = text[1..];

        var delimiter = SniffDelimiter(text);
        var rows = new List<string[]>();
        var row = new List<string>();
        var field = new StringBuilder();
        var inQuotes = false;

        for (var i = 0; i < text.Length; i++)
        {
            var c = text[i];
            if (inQuotes)
            {
                if (c == '"' && i + 1 < text.Length && text[i + 1] == '"') { field.Append('"'); i++; }
                else if (c == '"') inQuotes = false;
                else field.Append(c);
                continue;
            }

            if (c == '"' && field.Length == 0) inQuotes = true;
            else if (c == delimiter) { row.Add(field.ToString()); field.Clear(); }
            else if (c == '\r') { /* CR of CRLF: the LF closes the row */ }
            else if (c == '\n') { row.Add(field.ToString()); field.Clear(); rows.Add(row.ToArray()); row.Clear(); }
            else field.Append(c);
        }

        if (field.Length > 0 || row.Count > 0)
        {
            row.Add(field.ToString());
            rows.Add(row.ToArray());
        }

        return rows;
    }

    /// <summary>UTF-8 (BOM) CSV bytes; <c>null</c> cells become empty, every cell is formula-neutralised.</summary>
    public static byte[] Write(IEnumerable<IReadOnlyList<string?>> rows)
    {
        var sb = new StringBuilder();
        foreach (var row in rows)
        {
            for (var i = 0; i < row.Count; i++)
            {
                if (i > 0) sb.Append(',');
                var value = ExcelSafeText.Neutralize(row[i]) ?? string.Empty;
                sb.Append('"').Append(value.Replace("\"", "\"\"")).Append('"');
            }
            sb.Append("\r\n");
        }

        return Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
    }

    /// <summary>Picks the delimiter that occurs most often (outside quotes) in the first line.</summary>
    private static char SniffDelimiter(string text)
    {
        int comma = 0, semicolon = 0, tab = 0;
        var inQuotes = false;
        foreach (var c in text)
        {
            if (c == '"') inQuotes = !inQuotes;
            if (inQuotes) continue;
            if (c == '\n') break;
            if (c == ',') comma++;
            else if (c == ';') semicolon++;
            else if (c == '\t') tab++;
        }

        if (semicolon > comma && semicolon >= tab) return ';';
        if (tab > comma && tab > semicolon) return '\t';
        return ',';
    }
}
