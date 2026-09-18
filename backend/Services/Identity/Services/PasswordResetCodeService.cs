using System.Security.Cryptography;
using System.Text;

namespace Identity.Services;

/// <summary>
/// Generation and verification of the 6-digit password-reset code.
///
/// The previous implementation was an account takeover: the code was produced by
/// `new Random()` (predictable, seeded from the clock), stored in clear text, and
/// - worst of all - `/reset-password` looked the row up by the code ALONE, so a
/// code issued for attacker@example.com reset whichever account happened to own
/// that row. There was no attempt limit either, so all 900.000 codes could be
/// walked through.
///
/// Now: the code comes from the OS CSPRNG, only a salted SHA-256 hash of
/// (normalised e-mail + code) is persisted, and verification is a constant-time
/// comparison that can only ever match the e-mail the code was issued for.
/// </summary>
public static class PasswordResetCodeService
{
    public const int CodeLength = 6;
    public const int MaxAttempts = 5;
    public static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(15);

    /// <summary>Cryptographically secure 6-digit code, zero padded ("042317").</summary>
    public static string GenerateCode() =>
        RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");

    /// <summary>
    /// Lower-cased, trimmed e-mail. Both storage and lookup go through this so
    /// "Admin@X.com" and "admin@x.com " resolve to the same reset row.
    /// </summary>
    public static string NormalizeEmail(string? email) =>
        (email ?? string.Empty).Trim().ToLowerInvariant();

    /// <summary>
    /// Base64 SHA-256 of "salt:email:code". Binding the e-mail into the hashed
    /// material is what makes a code useless against any other account, even if
    /// the stored hash leaks.
    /// </summary>
    public static string ComputeHash(string email, string code, string salt)
    {
        var material = $"{salt}:{NormalizeEmail(email)}:{(code ?? string.Empty).Trim()}";
        return Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(material)));
    }

    /// <summary>Per-row salt, so two users with the same code do not share a hash.</summary>
    public static string GenerateSalt() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(16));

    /// <summary>
    /// Constant-time hash comparison - a length/short-circuit difference would
    /// otherwise leak how many leading digits of a guess were right.
    /// </summary>
    public static bool VerifyHash(string expectedHash, string email, string code, string salt)
    {
        if (string.IsNullOrEmpty(expectedHash)) return false;
        var actual = ComputeHash(email, code, salt);
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expectedHash),
            Encoding.UTF8.GetBytes(actual));
    }

    /// <summary>Basic shape check before touching the database.</summary>
    public static bool IsWellFormedCode(string? code) =>
        !string.IsNullOrWhiteSpace(code) &&
        code.Trim().Length == CodeLength &&
        code.Trim().All(char.IsAsciiDigit);
}
