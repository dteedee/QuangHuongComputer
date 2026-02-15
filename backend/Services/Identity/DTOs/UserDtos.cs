namespace Identity.DTOs;

public record RegisterDto(string Email, string Password, string FullName);

public record LoginDto(string Email, string Password);

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

public record UserQueryParams
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Search { get; set; }
    public string? Role { get; set; }
    public string? SortBy { get; set; } = "Email";
    public bool? SortDescending { get; set; } = false;
    public bool? IncludeInactive { get; set; } = false;

    public int Skip => (Page - 1) * PageSize;
    public int Take => PageSize;
    public bool SortDesc => SortDescending ?? false;
    public bool ShowInactive => IncludeInactive ?? false;
}

public record LoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
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
