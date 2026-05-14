using System.Globalization;

namespace Reporting.Pdf;

public static class PdfCurrencyHelper
{
    private static readonly CultureInfo ViCulture = new("vi-VN");

    public static string FormatVnd(decimal amount)
    {
        return amount.ToString("#,##0", ViCulture) + " ₫";
    }

    public static string FormatVndCompact(decimal amount)
    {
        if (Math.Abs(amount) >= 1_000_000_000)
            return (amount / 1_000_000_000).ToString("#,##0.#", ViCulture) + " tỷ";
        if (Math.Abs(amount) >= 1_000_000)
            return (amount / 1_000_000).ToString("#,##0.#", ViCulture) + " tr";
        return FormatVnd(amount);
    }

    public static string FormatPercent(decimal value) => $"{value:0.#}%";

    public static string FormatPercent(double value) => $"{value:0.#}%";
}
