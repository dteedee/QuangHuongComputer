using BuildingBlocks.SharedKernel;

namespace Identity.Domain;

/// <summary>
/// One signed-in device. A session IS a refresh-token family: every rotation of
/// a refresh token stays inside the same <c>UserSessions</c> row, so revoking
/// the row kills the whole chain and the device has to log in again.
///
/// Why not a separate session store: the family already exists in
/// <c>RefreshTokens</c> (Id -> ReplacedByToken -> ...). A second store would have
/// to be kept consistent with it, and every inconsistency is a session that looks
/// revoked in the UI but still refreshes - which is precisely the bug W1-2 fixes
/// ("revoke session" used to set a flag nothing ever read).
/// </summary>
public class UserSession : Entity<Guid>
{
    public string UserId { get; set; } = "";

    /// <summary>Human-readable device summary derived from the User-Agent ("Chrome trên Windows").</summary>
    public string DeviceInfo { get; set; } = "";

    public string IpAddress { get; set; } = "";
    public string UserAgent { get; set; } = "";

    /// <summary>Touched on every successful refresh - this is what "hoạt động lần cuối" shows.</summary>
    public DateTime LastActiveAt { get; set; } = DateTime.UtcNow;

    public bool IsRevoked { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? RevokedByIp { get; set; }

    /// <summary>
    /// Why the session ended: <c>User</c>, <c>Admin</c>, <c>Logout</c>,
    /// <c>PasswordChange</c>, <c>TokenReuse</c>. <c>TokenReuse</c> means a
    /// retired refresh token was replayed, i.e. a suspected token theft.
    /// </summary>
    public string? RevokedReason { get; set; }

    /// <summary>Id of the refresh token currently at the head of the family. Diagnostics only.</summary>
    public string? RefreshTokenId { get; set; }
}
