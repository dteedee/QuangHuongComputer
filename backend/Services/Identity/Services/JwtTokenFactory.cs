using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Identity.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using BuildingBlocks.Security;

namespace Identity.Services;

/// <summary>
/// Single place where an access token is minted. Login, Google login and
/// refresh-token all went through their own copy of this code before; the
/// lifetime in particular was hardcoded to 7 days in every one of them.
/// </summary>
public static class JwtTokenFactory
{
    /// <summary>
    /// Fallback lifetime when `Jwt:ExpireMinutes` is absent or unparseable.
    ///
    /// 60 minutes, deliberately: the shop's staff are in the back office all day, and a
    /// <see cref="RefreshTokenService"/> rotation already keeps a session alive across the
    /// shift without ever re-typing a password. So the access token only has to survive a
    /// normal stretch of work, and every minute past that is a minute in which a
    /// deactivated account or a stripped role still works (an access token is not
    /// revocable - that is the whole reason the 7-day token was a hole). One hour is the
    /// longest window that costs nothing in usability and the shortest that does not make
    /// the refresh endpoint the hot path.
    /// </summary>
    public const int DefaultExpireMinutes = 60;

    /// <summary>Hard ceiling. Anything above this in config is a typo or a regression, not a choice.</summary>
    public const int MaxExpireMinutes = 1440;

    /// <summary>Claim carrying the <c>UserSessions</c> row (= refresh-token family) this token belongs to.</summary>
    public const string SessionClaimType = "sid";

    /// <summary>
    /// Access-token lifetime from configuration (`Jwt:ExpireMinutes`).
    /// A 7-day access token cannot be revoked - a deactivated account or a
    /// stripped role kept working for a week. The refresh-token rotation in
    /// <see cref="RefreshTokenService"/> is what keeps sessions alive now.
    /// </summary>
    public static int ResolveExpireMinutes(IConfiguration configuration)
    {
        var raw = configuration.GetSection("Jwt")["ExpireMinutes"];
        if (!int.TryParse(raw, out var minutes) || minutes <= 0)
            return DefaultExpireMinutes;

        // A config value of 10080 (7 days) is exactly the hole this replaced; clamp instead of
        // trusting it, so a bad deploy cannot silently reinstate a week-long access token.
        return Math.Min(minutes, MaxExpireMinutes);
    }

    /// <summary>
    /// Mints an access token.
    ///
    /// <paramref name="sessionId"/> and the user's security stamp are both
    /// embedded: the stamp lets <see cref="AccessTokenStateGuard"/> reject a
    /// token after a password/role/permission change or a "revoke all", and the
    /// session id lets a single revoked device be told apart from the others.
    /// Without them an access token is irrevocable for its whole lifetime.
    /// </summary>
    public static string Create(
        ApplicationUser user,
        IList<string> roles,
        IEnumerable<Claim> roleClaims,
        IConfiguration configuration,
        string jwtId,
        Guid? sessionId = null)
    {
        var jwtSettings = configuration.GetSection("Jwt");
        var key = new SymmetricSecurityKey(
            Encoding.ASCII.GetBytes(jwtSettings["Key"] ?? "super_secret_key_1234567890123456"));

        // `iat`/`nbf` are emitted explicitly. JwtSecurityToken only writes `exp` when it is given
        // nothing else, and a token that carries an expiry but no issue time cannot be checked:
        // nobody reading it (including the W0-1 gate probe) can tell a 60-minute token from a
        // 7-day one without trusting the reader's own clock.
        var issuedAt = DateTime.UtcNow;
        var expiresAt = issuedAt.AddMinutes(ResolveExpireMinutes(configuration));

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email!),
            new Claim("name", user.FullName),
            new Claim(JwtRegisteredClaimNames.Jti, jwtId),
            new Claim(JwtRegisteredClaimNames.Iat,
                EpochTime.GetIntDate(issuedAt).ToString(CultureInfo.InvariantCulture),
                ClaimValueTypes.Integer64)
        };

        if (!string.IsNullOrEmpty(user.SecurityStamp))
        {
            claims.Add(new Claim(AccessTokenStateGuard.StampClaimType, user.SecurityStamp));
        }

        if (sessionId.HasValue)
        {
            claims.Add(new Claim(SessionClaimType, sessionId.Value.ToString()));
        }

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        // Only PERMISSION claims travel in the token (integration request w1-1 #9).
        // The builder used to copy every claim a role carried, which put the
        // seeder's bookkeeping claim `PermissionSeedVersion` into every token
        // ever issued - dead weight on every request, and it grows with each
        // bookkeeping claim anyone adds to a role.
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var claim in roleClaims)
        {
            if (!string.Equals(claim.Type, Permissions.PermissionType, StringComparison.Ordinal)) continue;

            // Two roles can carry the same permission; emit it once.
            if (seen.Add(claim.Value) &&
                !claims.Any(c => c.Type == claim.Type && c.Value == claim.Value))
            {
                claims.Add(claim);
            }
        }

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"] ?? "QuangHuongComputer",
            audience: jwtSettings["Audience"] ?? "QuangHuongComputer",
            claims: claims,
            notBefore: issuedAt,
            expires: expiresAt,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>Permission values from a role's claim set, de-duplicated.</summary>
    public static List<string> ExtractPermissions(IEnumerable<Claim> roleClaims) =>
        roleClaims
            .Where(c => c.Type == Permissions.PermissionType)
            .Select(c => c.Value)
            .Distinct()
            .ToList();
}
