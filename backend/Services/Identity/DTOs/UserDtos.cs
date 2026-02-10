namespace Identity.DTOs;

public record RegisterDto(string Email, string Password, string FullName);

public record LoginDto(string Email, string Password);

public record GoogleLoginDto(string? IdToken);

public record UpdateUserDto(string Email, string FullName);

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
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public List<string> Roles { get; set; } = new();
    public List<string> Permissions { get; set; } = new();
}
