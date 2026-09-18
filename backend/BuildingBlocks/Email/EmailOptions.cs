namespace BuildingBlocks.Email;

/// <summary>
/// Bound from "Email:Smtp" (Identity's key family - see D12: this wave unifies the two email
/// services behind one config family and one transport instead of the "Email:SmtpHost|..." family
/// BuildingBlocks/Email used before).
/// </summary>
public class EmailOptions
{
    public const string SectionName = "Email:Smtp";

    public string Host { get; set; } = "";
    public int Port { get; set; } = 587;
    public bool EnableSsl { get; set; } = true;
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string FromEmail { get; set; } = "";
    public string FromName { get; set; } = "Quang Huong Computer";

    /// <summary>
    /// D12: nothing in this codebase expands "${VAR}" placeholders, so a literal "${SMTP_PASSWORD}"
    /// in appsettings is NOT a password - it is "not configured". An empty value means the same
    /// thing. Either one must fall back to logging the email instead of attempting SMTP (Key
    /// Insight: "Null | Smtp" provider modes).
    /// </summary>
    public bool IsConfigured =>
        IsSet(Host) && IsSet(Username) && IsSet(Password) && IsSet(FromEmail);

    static bool IsSet(string? value) =>
        !string.IsNullOrWhiteSpace(value) && !(value.StartsWith("${", StringComparison.Ordinal) && value.EndsWith('}'));
}
