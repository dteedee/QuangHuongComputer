using System.Globalization;

namespace BuildingBlocks.Localization;

/// <summary>
/// Helper class for Vietnamese date/time and number formatting
/// </summary>
public static class VietnameseFormatter
{
    private static readonly CultureInfo VietnameseCulture = new CultureInfo("vi-VN");

    /// <summary>
    /// Format date with Vietnamese style (dd/MM/yyyy)
    /// </summary>
    public static string FormatDate(DateTime date)
    {
        return date.ToString("dd/MM/yyyy", VietnameseCulture);
    }

    /// <summary>
    /// Format date time with Vietnamese style (dd/MM/yyyy HH:mm:ss)
    /// </summary>
    public static string FormatDateTime(DateTime dateTime)
    {
        return dateTime.ToString("dd/MM/yyyy HH:mm:ss", VietnameseCulture);
    }

    /// <summary>
    /// Format date with Vietnamese style and day of week
    /// </summary>
    public static string FormatDateWithDay(DateTime date)
    {
        return date.ToString("dddd, dd/MM/yyyy", VietnameseCulture);
    }

    /// <summary>
    /// Format time with Vietnamese style
    /// </summary>
    public static string FormatTime(DateTime time)
    {
        return time.ToString("HH:mm:ss", VietnameseCulture);
    }

    /// <summary>
    /// Format currency as VND (Vietnamese Đồng)
    /// </summary>
    public static string FormatCurrency(decimal amount)
    {
        return amount.ToString("#,0 'đ'", VietnameseCulture);
    }

    /// <summary>
    /// Format currency with thousands separator and VND symbol
    /// </summary>
    public static string FormatCurrencyFull(decimal amount)
    {
        return amount.ToString("#,0 VNĐ", VietnameseCulture);
    }

    /// <summary>
    /// Format currency for invoices with proper formatting
    /// </summary>
    public static string FormatCurrencyForInvoice(decimal amount)
    {
        return amount.ToString("#,##0.## 'đ'", VietnameseCulture);
    }

    /// <summary>
    /// Format number with Vietnamese thousand separator
    /// </summary>
    public static string FormatNumber(decimal number)
    {
        return number.ToString("N0", VietnameseCulture);
    }

    /// <summary>
    /// Format relative time in Vietnamese
    /// </summary>
    public static string FormatRelativeTime(DateTime date)
    {
        var now = DateTime.Now;
        var difference = now - date;

        if (difference.TotalMinutes < 1)
            return "Vừa xong";
        else if (difference.TotalMinutes < 60)
            return $"Cách đây {(int)difference.TotalMinutes} phút";
        else if (difference.TotalHours < 24)
            return $"Cách đây {(int)difference.TotalHours} giờ";
        else if (difference.TotalDays < 7)
            return $"Cách đây {(int)difference.TotalDays} ngày";
        else if (difference.TotalDays < 30)
            return $"Cách đây {(int)(difference.TotalDays / 7)} tuần";
        else if (difference.TotalDays < 365)
            return $"Cách đây {(int)(difference.TotalDays / 30)} tháng";
        else
            return $"Cách đây {(int)(difference.TotalDays / 365)} năm";
    }

    /// <summary>
    /// Get Vietnamese day name
    /// </summary>
    public static string GetDayName(DayOfWeek dayOfWeek)
    {
        return VietnameseCulture.DateTimeFormat.GetDayName(dayOfWeek);
    }

    /// <summary>
    /// Get Vietnamese month name
    /// </summary>
    public static string GetMonthName(int month)
    {
        return VietnameseCulture.DateTimeFormat.MonthNames[month - 1];
    }

    /// <summary>
    /// Format age in Vietnamese
    /// </summary>
    public static string FormatAge(DateTime birthDate)
    {
        var today = DateTime.Today;
        var age = today.Year - birthDate.Year;
        
        if (birthDate.Date > today.AddYears(-age))
            age--;

        return $"{age} tuổi";
    }

    /// <summary>
    /// Convert number to Vietnamese words for invoices
    /// </summary>
    public static string NumberToVietnameseWords(decimal number)
    {
        // Simple implementation for numbers up to billions
        // For a complete implementation, you would want to handle all cases
        if (number == 0) return "Không đồng";

        var wholeNumber = Math.Truncate(number);
        var decimalPart = number - wholeNumber;

        string result = ConvertWholeNumberToVietnamese((long)wholeNumber);
        
        if (decimalPart > 0)
        {
            var decimalWords = ConvertDecimalToVietnamese(decimalPart);
            result += $" phẩy {decimalWords}";
        }

        result += " đồng";
        return result;
    }

    private static string ConvertWholeNumberToVietnamese(long number)
    {
        if (number == 0) return "không";
        
        string[] units = { "", "nghìn", "triệu", "tỷ" };
        string[] ones = { "không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín" };
        
        string result = "";
        int unitIndex = 0;
        
        while (number > 0)
        {
            long chunk = number % 1000;
            number /= 1000;
            
            if (chunk > 0)
            {
                string chunkStr = "";
                int hundreds = (int)(chunk / 100);
                int remainder = (int)(chunk % 100);
                
                if (hundreds > 0)
                {
                    chunkStr += ones[hundreds] + " trăm";
                    if (remainder > 0) chunkStr += " ";
                }
                
                if (remainder > 0)
                {
                    if (remainder < 10)
                    {
                        chunkStr += ones[remainder];
                    }
                    else if (remainder == 10)
                    {
                        chunkStr += "mười";
                    }
                    else if (remainder < 20)
                    {
                        chunkStr += "một " + ones[remainder % 10];
                    }
                    else
                    {
                        int tens = remainder / 10;
                        int onesDigit = remainder % 10;
                        chunkStr += ones[tens] + " mươi";
                        if (onesDigit > 0)
                        {
                            if (onesDigit == 1) chunkStr += " mốt";
                            else if (onesDigit == 5) chunkStr += " lăm";
                            else chunkStr += " " + ones[onesDigit];
                        }
                    }
                }
                
                result = chunkStr + " " + units[unitIndex] + " " + result;
            }
            
            unitIndex++;
        }
        
        return result.Trim();
    }

    private static string ConvertDecimalToVietnamese(decimal decimalPart)
    {
        // Convert decimal part to words (simple implementation)
        decimalPart = Math.Round(decimalPart * 100);
        return ConvertWholeNumberToVietnamese((long)decimalPart);
    }
}