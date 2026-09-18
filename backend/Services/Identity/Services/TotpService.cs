using System.Security.Cryptography;
using System.Text;

namespace Identity.Services;

/// <summary>
/// RFC 6238 TOTP (HMAC-SHA1, 6 digits, 30-second step) and RFC 4648 base32.
///
/// Why hand-rolled instead of a package: the overhaul may not add NuGet
/// dependencies (no restore is sanctioned by D12's build wrapper), and TOTP is
/// 20 lines of HMAC that is fully specified by the RFC. The algorithm below is
/// the reference one - a Google Authenticator / Authy code verifies against it.
///
/// What it replaces: <c>TwoFactorEndpoints.verify-setup</c> used to accept ANY
/// six digits (`code.Length == 6 &amp;&amp; code.All(char.IsDigit)`), so "000000"
/// enabled two-factor authentication and the stored secret was never checked
/// against anything. 2FA was decorative.
/// </summary>
public static class TotpService
{
    public const int Digits = 6;
    public const int StepSeconds = 30;

    /// <summary>
    /// Accepted clock drift, in steps, either side of "now". +/-1 step = +/-30s,
    /// the value Google Authenticator itself assumes. A wider window multiplies
    /// the number of codes valid at any instant, so it is not a free knob.
    /// </summary>
    public const int WindowSteps = 1;

    private const string Base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    /// <summary>A new 20-byte (160-bit) shared secret, base32 encoded for the authenticator app.</summary>
    public static string GenerateSecretBase32() => Base32Encode(RandomNumberGenerator.GetBytes(20));

    /// <summary>The number of 30s steps since the Unix epoch.</summary>
    public static long CurrentTimeStep(DateTimeOffset? now = null) =>
        (now ?? DateTimeOffset.UtcNow).ToUnixTimeSeconds() / StepSeconds;

    /// <summary>
    /// Verifies <paramref name="code"/> against <paramref name="secretBase32"/>.
    /// Returns the matched time step so the caller can persist it and refuse a
    /// replay of the SAME code inside its 30-second life (a shoulder-surfed code
    /// is otherwise reusable for up to 90 seconds across the window).
    /// </summary>
    public static bool TryVerify(string? secretBase32, string? code, long lastUsedTimeStep, out long matchedStep, DateTimeOffset? now = null)
    {
        matchedStep = 0;
        if (string.IsNullOrWhiteSpace(secretBase32) || string.IsNullOrWhiteSpace(code)) return false;

        var trimmed = code.Trim().Replace(" ", string.Empty);
        if (trimmed.Length != Digits || !trimmed.All(char.IsAsciiDigit)) return false;

        byte[] key;
        try { key = Base32Decode(secretBase32); }
        catch (FormatException) { return false; }
        if (key.Length == 0) return false;

        var current = CurrentTimeStep(now);
        for (var offset = -WindowSteps; offset <= WindowSteps; offset++)
        {
            var step = current + offset;
            if (step <= lastUsedTimeStep) continue; // already spent - no replay
            var expected = ComputeCode(key, step);
            if (CryptographicOperations.FixedTimeEquals(
                    Encoding.ASCII.GetBytes(expected), Encoding.ASCII.GetBytes(trimmed)))
            {
                matchedStep = step;
                return true;
            }
        }
        return false;
    }

    /// <summary>The 6-digit code for one time step. Exposed so probes/tests can drive a real login.</summary>
    public static string ComputeCode(byte[] key, long timeStep)
    {
        var counter = BitConverter.GetBytes(timeStep);
        if (BitConverter.IsLittleEndian) Array.Reverse(counter);

        using var hmac = new HMACSHA1(key);
        var hash = hmac.ComputeHash(counter);

        // RFC 4226 dynamic truncation.
        var offset = hash[^1] & 0x0F;
        var binary = ((hash[offset] & 0x7F) << 24)
                     | ((hash[offset + 1] & 0xFF) << 16)
                     | ((hash[offset + 2] & 0xFF) << 8)
                     | (hash[offset + 3] & 0xFF);

        return (binary % 1_000_000).ToString("D6");
    }

    /// <summary>Convenience overload for callers holding the base32 secret.</summary>
    public static string ComputeCode(string secretBase32, long timeStep) =>
        ComputeCode(Base32Decode(secretBase32), timeStep);

    /// <summary>`otpauth://` provisioning URI the QR code encodes.</summary>
    public static string BuildOtpAuthUri(string issuer, string accountEmail, string secretBase32) =>
        $"otpauth://totp/{Uri.EscapeDataString(issuer)}:{Uri.EscapeDataString(accountEmail)}" +
        $"?secret={secretBase32}&issuer={Uri.EscapeDataString(issuer)}&algorithm=SHA1&digits={Digits}&period={StepSeconds}";

    public static string Base32Encode(byte[] data)
    {
        var result = new StringBuilder((data.Length * 8 + 4) / 5);
        int buffer = 0, bitsLeft = 0;
        foreach (var b in data)
        {
            buffer = (buffer << 8) | b;
            bitsLeft += 8;
            while (bitsLeft >= 5) { bitsLeft -= 5; result.Append(Base32Alphabet[(buffer >> bitsLeft) & 0x1F]); }
        }
        if (bitsLeft > 0) result.Append(Base32Alphabet[(buffer << (5 - bitsLeft)) & 0x1F]);
        return result.ToString();
    }

    public static byte[] Base32Decode(string encoded)
    {
        if (string.IsNullOrWhiteSpace(encoded)) return Array.Empty<byte>();
        var cleaned = encoded.Trim().TrimEnd('=').Replace(" ", string.Empty).ToUpperInvariant();

        var output = new List<byte>(cleaned.Length * 5 / 8);
        int buffer = 0, bitsLeft = 0;
        foreach (var c in cleaned)
        {
            var index = Base32Alphabet.IndexOf(c);
            if (index < 0) throw new FormatException($"'{c}' is not a base32 character.");
            buffer = (buffer << 5) | index;
            bitsLeft += 5;
            if (bitsLeft >= 8) { bitsLeft -= 8; output.Add((byte)((buffer >> bitsLeft) & 0xFF)); }
        }
        return output.ToArray();
    }
}
