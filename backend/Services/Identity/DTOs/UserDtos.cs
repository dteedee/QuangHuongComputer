namespace Identity.DTOs;

/// <param name="RecaptchaToken">Token reCAPTCHA v3 (action "register"), kiểm ở server qua IRecaptchaVerifier.</param>
public record RegisterDto(string Email, string Password, string FullName, string? RecaptchaToken = null);

/// <param name="RecaptchaToken">Token reCAPTCHA v3 (action "login"), kiểm ở server qua IRecaptchaVerifier.</param>
public record LoginDto(string Email, string Password, string? RecaptchaToken = null);

public record GoogleLoginDto(string? IdToken);

public record UpdateUserDto(string Email, string FullName);

public record UpdateProfileDto(string FullName, string? PhoneNumber, string? Address);

public record ChangePasswordDto(string CurrentPassword, string NewPassword);

public record UserProfileDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? Address { get; set; }
    public List<string> Roles { get; set; } = new();
    public DateTime? CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
}

public record AssignRolesDto(string[] Roles);

public record UserDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public List<string> Roles { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

public class UserQueryParams : HC.CORE.Base.BaseSearchParam
{
    public string? Role { get; set; }
    public string? SortBy { get; set; } = "Email";
    public bool? SortDescending { get; set; } = false;
    public bool? IncludeInactive { get; set; } = false;

    public int Skip => (PageNumber - 1) * PageSize;
    public int Take => PageSize;
    public bool SortDesc => SortDescending ?? false;
    public bool ShowInactive => IncludeInactive ?? false;
}

public record LoginResponseDto
{
    public string Token { get; set; } = string.Empty;

    /// <summary>
    /// Clear-text refresh token. NEVER serialised: it leaves the server only as the HttpOnly
    /// <c>qh_rt</c> cookie (<see cref="Identity.Services.RefreshTokenCookie"/>), so script on the page
    /// (an XSS payload included) can never read it.
    /// </summary>
    [System.Text.Json.Serialization.JsonIgnore]
    public string RefreshToken { get; set; } = string.Empty;

    /// <summary>Expiry of <see cref="RefreshToken"/>; becomes the cookie's Expires. Not serialised.</summary>
    [System.Text.Json.Serialization.JsonIgnore]
    public DateTime RefreshTokenExpiresAt { get; set; }

    public UserInfoDto User { get; set; } = new();
}

public record UserInfoDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public List<string> Roles { get; set; } = new();
    public List<string> Permissions { get; set; } = new();
}
