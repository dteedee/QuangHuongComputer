using Microsoft.AspNetCore.Identity;

namespace Identity.Infrastructure;

// Persistent types of the Identity module. Split out of IdentityDbContext.cs by
// W1-2 (that file was 270 lines and mixed six entity definitions with the model
// configuration). Same namespace, so nothing else changes.

public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// When the account was created. Added by W1-2: the user-admin list had a
    /// `createdAt` field in its DTO that was always `0001-01-01` because no such
    /// column existed, and "sort by createdat" secretly sorted by the GUID id.
    /// Backfilled from the oldest known signal per row by the migration.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Phase 1: Enhanced fields
    public string? AvatarUrl { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public string? LastLoginIp { get; set; }
    public bool ForcePasswordChange { get; set; }
    public DateTime? PasswordChangedAt { get; set; }
    /// <summary>
    /// Mirrors <c>TwoFactorConfigs.IsEnabled</c> so a login can answer "does this
    /// account owe a code?" without a second query. `new` is explicit: it maps to
    /// the same AspNetUsers column as the base member and the shadowing was
    /// previously silent (CS0114).
    /// </summary>
    public new bool TwoFactorEnabled { get; set; }
    public string? PreferredLanguage { get; set; } = "vi";
    public string? TimeZone { get; set; } = "Asia/Ho_Chi_Minh";
    public string? PhoneNumberVerified { get; set; }
    public DateTime? EmailVerifiedAt { get; set; }
    public DateTime? PhoneNumberVerifiedAt { get; set; }
}

/// <summary>
/// A pending password-reset challenge. The clear-text code is NEVER stored:
/// only <see cref="CodeHash"/> = SHA-256(Salt : Email : code). <see cref="Email"/>
/// binds the challenge to one account, which is what stops a code issued for one
/// user from resetting another. <see cref="Attempts"/> caps brute force.
/// </summary>
public class PasswordResetToken
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;

    /// <summary>Normalised (trimmed, lower-cased) e-mail the code was issued to.</summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>Base64 SHA-256 of "Salt:Email:code". Never the code itself.</summary>
    public string CodeHash { get; set; } = string.Empty;

    /// <summary>Per-row salt for <see cref="CodeHash"/>.</summary>
    public string Salt { get; set; } = string.Empty;

    /// <summary>Failed verification attempts; the row dies at 5.</summary>
    public int Attempts { get; set; }

    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser? User { get; set; }
}

public class UserProfile
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string? Gender { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? NationalId { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? District { get; set; }
    public string? Ward { get; set; }
    public string? PostalCode { get; set; }
    public string? CompanyName { get; set; }
    public string? TaxCode { get; set; }
    public string? BusinessType { get; set; }
    public CustomerType CustomerType { get; set; } = CustomerType.Retail;
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsActive { get; set; } = true;
    
    public ApplicationUser User { get; set; } = null!;
    // The address book lives in Sales (`/api/sales/addresses`) - it is what
    // checkout reads. Identity's duplicate table was empty in dev and test and
    // was dropped by W1-2; see docs/api-contracts/identity.md.
}

/// <summary>
/// One refresh token in a family. The family is the <see cref="SessionId"/>:
/// rotation issues a new row with the same SessionId and retires the old one.
///
/// W1-2 changed how the secret is stored. <see cref="TokenHash"/> holds the
/// SHA-256 of the token and carries the unique index; <see cref="Token"/> is now
/// nullable and is only populated on rows written before this migration, so the
/// owner's existing sessions keep working instead of being force-logged-out.
/// New rows never store the clear-text token.
/// </summary>
public class RefreshToken
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;

    /// <summary>LEGACY ONLY - clear-text token on pre-W1-2 rows. Never written again.</summary>
    public string? Token { get; set; }

    /// <summary>Base64 SHA-256 of the token. The only form new rows persist.</summary>
    public string? TokenHash { get; set; }

    /// <summary>The <c>UserSessions</c> row (= device) this family belongs to.</summary>
    public Guid? SessionId { get; set; }

    public string JwtId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public bool IsRevoked { get; set; } = false;
    public DateTime? RevokedAt { get; set; }
    public string? RevokedByIp { get; set; }

    /// <summary>Hash of the token that superseded this one. Its presence is what makes reuse detectable.</summary>
    public string? ReplacedByToken { get; set; }

    public string CreatedByIp { get; set; } = string.Empty;

    public ApplicationUser User { get; set; } = null!;

    public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
    public bool IsActive => !IsRevoked && !IsExpired;
}

public enum CustomerType
{
    Retail,
    Wholesale,
    Corporate
}
