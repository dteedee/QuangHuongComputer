using System.Security.Cryptography;
using System.Text;

namespace Identity.Services;

/// <summary>
/// Hashing at rest for every bearer-like secret Identity hands out that is NOT a
/// password: refresh tokens, 2FA challenge tokens and 2FA backup codes.
///
/// Why: a refresh token in the database is a password-equivalent. Until W1-2 the
/// `RefreshTokens.Token` column held the 64-byte token in clear text, so a single
/// SELECT on that table (a read-only DB account, a backup file, a leaked dump)
/// handed the reader a working session for every logged-in staff account.
/// The token is 512 bits of CSPRNG output, so an unsalted SHA-256 is enough - it
/// is not guessable and needs no work factor; the point is only that the stored
/// form is useless as a credential.
/// </summary>
public static class TokenHasher
{
    /// <summary>Base64 SHA-256 of the presented secret. 44 chars.</summary>
    public static string Hash(string? value) =>
        Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(value ?? string.Empty)));

    /// <summary>A new URL-safe CSPRNG secret. 64 bytes = the previous refresh-token strength.</summary>
    public static string NewSecret(int bytes = 64) =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(bytes));

    /// <summary>
    /// Constant-time comparison of a stored hash with the hash of what was
    /// presented. Short-circuiting here would leak the stored hash byte by byte.
    /// </summary>
    public static bool Verify(string? storedHash, string? presented)
    {
        if (string.IsNullOrEmpty(storedHash) || string.IsNullOrEmpty(presented)) return false;
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(storedHash),
            Encoding.UTF8.GetBytes(Hash(presented)));
    }
}
