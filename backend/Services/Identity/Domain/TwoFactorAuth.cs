using BuildingBlocks.SharedKernel;

namespace Identity.Domain;

/// <summary>Per-user TOTP configuration. One row per user (unique index on UserId).</summary>
public class TwoFactorConfig : Entity<Guid>
{
    public string UserId { get; set; } = "";

    /// <summary>Base32 shared secret. Present while 2FA is pending AND while it is enabled.</summary>
    public string TotpSecret { get; set; } = "";

    public bool IsEnabled { get; set; }
    public DateTime? EnabledDate { get; set; }

    /// <summary>JSON array of SHA-256 hashes of the unspent backup codes. Never clear text.</summary>
    public string BackupCodes { get; set; } = "";

    /// <summary>
    /// Highest TOTP time step already accepted for this user. A code is valid for
    /// up to 90 seconds across the +/-1 window; without this, one observed code
    /// could be replayed for its whole window.
    /// </summary>
    public long LastUsedTimeStep { get; set; }

    /// <summary>Consecutive wrong codes. Caps brute force over the 1.000.000 code space.</summary>
    public int FailedAttempts { get; set; }

    public DateTime? LockedUntil { get; set; }
}

/// <summary>
/// A login that has passed the password check but still owes a TOTP code.
///
/// The challenge token is a 64-byte CSPRNG secret stored ONLY as a hash, single
/// use, and short lived (<c>Jwt:TwoFactorChallengeMinutes</c>, default 5). It is
/// deliberately NOT a JWT: a JWT could not be invalidated after use, and this
/// row has to die the instant it is redeemed.
///
/// D12/decisions note: because this lives in the database, no data-protection
/// key ring volume is needed for 2FA.
/// </summary>
public class TwoFactorChallenge : Entity<Guid>
{
    public string UserId { get; set; } = "";

    /// <summary>Base64 SHA-256 of the challenge token handed to the client.</summary>
    public string TokenHash { get; set; } = "";

    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; }

    /// <summary>Wrong codes presented against THIS challenge; the row dies at 5.</summary>
    public int Attempts { get; set; }

    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
}
