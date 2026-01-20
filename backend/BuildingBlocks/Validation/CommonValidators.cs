using System.Text.RegularExpressions;

namespace BuildingBlocks.Validation;

public static class CommonValidators
{
    private static readonly Regex EmailRegex = new(
        @"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly Regex PhoneRegex = new(
        @"^[\d\s\-\+\(\)]+$",
        RegexOptions.Compiled);

    public static bool IsValidEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return false;

        return EmailRegex.IsMatch(email);
    }

    public static bool IsValidPhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
            return false;

        var cleanPhone = phone.Trim();
        if (cleanPhone.Length < 10 || cleanPhone.Length > 20)
            return false;

        return PhoneRegex.IsMatch(cleanPhone);
    }

    public static bool IsNotEmpty(string? value)
    {
        return !string.IsNullOrWhiteSpace(value);
    }

    public static bool IsPositive(decimal value)
    {
        return value > 0;
    }

    public static bool IsNonNegative(decimal value)
    {
        return value >= 0;
    }

    public static bool IsInRange(int value, int min, int max)
    {
        return value >= min && value <= max;
    }

    public static bool IsMaxLength(string? value, int maxLength)
    {
        return string.IsNullOrEmpty(value) || value.Length <= maxLength;
    }

    public static bool IsMinLength(string? value, int minLength)
    {
        return !string.IsNullOrEmpty(value) && value.Length >= minLength;
    }
}
