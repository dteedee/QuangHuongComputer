using Identity.Domain;
using Identity.DTOs;
using Identity.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Identity.Services;

public interface ITokenIssuer
{
    /// <summary>Starts a NEW session (device) and mints the first access/refresh pair for it.</summary>
    Task<LoginResponseDto> IssueAsync(ApplicationUser user, HttpContext httpContext);

    /// <summary>Rotates inside an EXISTING session: new pair, same device row, presented token retired.</summary>
    Task<LoginResponseDto> RotateAsync(ApplicationUser user, RefreshToken presented, string presentedToken, HttpContext httpContext);
}

/// <summary>
/// The single place that mints tokens.
///
/// Before W1-2 this block was copy-pasted into password login, Google login and
/// refresh-token, three times, each with its own idea of the lifetime (the
/// refresh path hardcoded 7 days) and none of them recording a session. A single
/// implementation is what makes "list my devices" and "revoke that device"
/// possible at all.
/// </summary>
public sealed class TokenIssuer : ITokenIssuer
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IRefreshTokenService _refreshTokens;
    private readonly IdentityDbContext _db;
    private readonly IConfiguration _configuration;

    public TokenIssuer(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        IRefreshTokenService refreshTokens,
        IdentityDbContext db,
        IConfiguration configuration)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _refreshTokens = refreshTokens;
        _db = db;
        _configuration = configuration;
    }

    public async Task<LoginResponseDto> IssueAsync(ApplicationUser user, HttpContext httpContext)
    {
        var ip = ClientIp(httpContext);
        var userAgent = UserAgent(httpContext);

        var session = new UserSession
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            IpAddress = ip,
            UserAgent = userAgent,
            DeviceInfo = DeviceDescription.FromUserAgent(userAgent),
            CreatedAt = DateTime.UtcNow,
            LastActiveAt = DateTime.UtcNow,
            IsRevoked = false
        };
        _db.UserSessions.Add(session);
        await _db.SaveChangesAsync();

        return await MintAsync(user, session, ip);
    }

    public async Task<LoginResponseDto> RotateAsync(ApplicationUser user, RefreshToken presented, string presentedToken, HttpContext httpContext)
    {
        var ip = ClientIp(httpContext);
        var userAgent = UserAgent(httpContext);

        var session = presented.SessionId.HasValue
            ? await _db.UserSessions.FirstOrDefaultAsync(s => s.Id == presented.SessionId.Value)
            : null;

        if (session == null)
        {
            // Pre-W1-2 refresh token: adopt it into a session on its first rotation,
            // so old clients converge on the new model without re-logging in.
            session = new UserSession
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                IpAddress = ip,
                UserAgent = userAgent,
                DeviceInfo = DeviceDescription.FromUserAgent(userAgent),
                CreatedAt = presented.CreatedAt,
                LastActiveAt = DateTime.UtcNow,
                IsRevoked = false
            };
            _db.UserSessions.Add(session);
        }
        else
        {
            session.LastActiveAt = DateTime.UtcNow;
            session.IpAddress = ip;
            if (!string.IsNullOrEmpty(userAgent)) session.UserAgent = userAgent;
        }
        await _db.SaveChangesAsync();

        var response = await MintAsync(user, session, ip);

        // Retire the presented token only AFTER the replacement exists, and record
        // the replacement's hash: a later presentation of this same token is then
        // provably a reuse rather than a lost race.
        await _refreshTokens.RevokeRefreshTokenAsync(presentedToken, ip, TokenHasher.Hash(response.RefreshToken));
        return response;
    }

    private async Task<LoginResponseDto> MintAsync(ApplicationUser user, UserSession session, string ip)
    {
        var roles = await _userManager.GetRolesAsync(user);
        var roleClaims = new List<System.Security.Claims.Claim>();
        foreach (var roleName in roles)
        {
            var role = await _roleManager.FindByNameAsync(roleName);
            if (role != null) roleClaims.AddRange(await _roleManager.GetClaimsAsync(role));
        }

        var jwtId = Guid.NewGuid().ToString();
        var accessToken = JwtTokenFactory.Create(user, roles, roleClaims, _configuration, jwtId, session.Id);
        var issued = await _refreshTokens.GenerateRefreshTokenAsync(user.Id, ip, jwtId, session.Id);

        session.RefreshTokenId = issued.Entity.Id.ToString();
        await _db.SaveChangesAsync();

        return new LoginResponseDto
        {
            Token = accessToken,
            RefreshToken = issued.Token,
            RefreshTokenExpiresAt = issued.Entity.ExpiresAt,
            User = new UserInfoDto
            {
                Id = user.Id,
                Email = user.Email ?? string.Empty,
                FullName = user.FullName,
                Roles = roles.ToList(),
                Permissions = JwtTokenFactory.ExtractPermissions(roleClaims)
            }
        };
    }

    public static string ClientIp(HttpContext httpContext) =>
        httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    public static string UserAgent(HttpContext httpContext)
    {
        var raw = httpContext.Request.Headers.UserAgent.ToString();
        return raw.Length > 1000 ? raw[..1000] : raw;
    }
}

/// <summary>
/// Turns a User-Agent into the short Vietnamese label the "thiết bị đang đăng
/// nhập" list shows. Deliberately crude: enough to tell a phone from the office
/// PC, with no UA-parsing dependency and no fingerprinting.
/// </summary>
public static class DeviceDescription
{
    public static string FromUserAgent(string? userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent)) return "Thiết bị không xác định";

        var ua = userAgent;
        var browser =
            ua.Contains("Edg/", StringComparison.OrdinalIgnoreCase) ? "Edge" :
            ua.Contains("OPR/", StringComparison.OrdinalIgnoreCase) ? "Opera" :
            ua.Contains("Chrome", StringComparison.OrdinalIgnoreCase) ? "Chrome" :
            ua.Contains("Firefox", StringComparison.OrdinalIgnoreCase) ? "Firefox" :
            ua.Contains("Safari", StringComparison.OrdinalIgnoreCase) ? "Safari" :
            ua.Contains("curl", StringComparison.OrdinalIgnoreCase) ? "curl" : "Trình duyệt khác";

        var platform =
            ua.Contains("Android", StringComparison.OrdinalIgnoreCase) ? "Android" :
            ua.Contains("iPhone", StringComparison.OrdinalIgnoreCase) ? "iPhone" :
            ua.Contains("iPad", StringComparison.OrdinalIgnoreCase) ? "iPad" :
            ua.Contains("Windows", StringComparison.OrdinalIgnoreCase) ? "Windows" :
            ua.Contains("Mac OS", StringComparison.OrdinalIgnoreCase) ? "macOS" :
            ua.Contains("Linux", StringComparison.OrdinalIgnoreCase) ? "Linux" : "Hệ điều hành khác";

        return $"{browser} trên {platform}";
    }
}
