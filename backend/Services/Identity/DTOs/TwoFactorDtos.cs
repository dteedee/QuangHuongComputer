namespace Identity.DTOs;

/// <summary>Confirms a pending 2FA setup with a code from the authenticator app.</summary>
public record TwoFactorVerifyRequest(string Code);

/// <summary>
/// Turning 2FA off. Both the password AND a live code are required: an attacker
/// holding only a hijacked session must not be able to strip the second factor,
/// and an attacker holding only the password must not either. The old endpoint
/// asked for neither - a POST with an empty body disabled it.
/// </summary>
public record TwoFactorDisableDto(string Password, string? Code, string? BackupCode);

/// <summary>Step 2 of login. Exactly one of <see cref="Code"/> / <see cref="BackupCode"/> is used.</summary>
public record LoginTwoFactorDto(string ChallengeToken, string? Code, string? BackupCode);

/// <summary>
/// Step-1 login answer when the account has 2FA on. Deliberately shaped so a
/// client that does not know about 2FA cannot mistake it for a successful login:
/// there is no `token` field at all.
/// </summary>
public record TwoFactorRequiredDto
{
    public bool RequiresTwoFactor { get; init; } = true;
    public string ChallengeToken { get; init; } = string.Empty;
    public int ExpiresInSeconds { get; init; }
    public string Message { get; init; } = "Vui lòng nhập mã xác thực 2 lớp từ ứng dụng Authenticator.";
}

public record TwoFactorStatusDto
{
    public bool IsEnabled { get; init; }
    public DateTime? EnabledDate { get; init; }
    public int BackupCodesRemaining { get; init; }
}
