namespace Identity;

// Auth-flow request payloads. They live in the `Identity` namespace (not
// `Identity.DTOs`) because that is where the endpoint files already resolved
// them from; `Identity.DTOs` keeps the user/profile/response shapes.

public record ForgotPasswordDto(string Email);

/// <summary>
/// Password reset. <see cref="Email"/> is REQUIRED: without it a code could be
/// redeemed against any account, which was the takeover bug. <see cref="Code"/>
/// is the 6-digit code; <see cref="Token"/> is the legacy field name the current
/// frontend still posts and is accepted as an alias for it.
/// </summary>
public record ResetPasswordDto(string? Email, string? Code, string? Token, string NewPassword)
{
    /// <summary>The submitted code, whichever field name carried it.</summary>
    public string? SubmittedCode => !string.IsNullOrWhiteSpace(Code) ? Code : Token;
}

public record CreateUserDto(string Email, string Password, string FullName, string[]? Roles);

/// <summary>Create-role request. Was bound from the query string, so every JSON call 400'd.</summary>
public record CreateRoleDto(string Name);

public record UpdateRoleDto(string Name);
