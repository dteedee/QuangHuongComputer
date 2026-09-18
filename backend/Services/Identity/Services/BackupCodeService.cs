using System.Security.Cryptography;
using System.Text.Json;

namespace Identity.Services;

/// <summary>
/// Single-use 2FA recovery codes.
///
/// What it replaces: the old <c>verify-setup</c> generated ten codes with
/// <c>RandomNumberGenerator.GetInt32(100000, 999999)</c> and stored the CLEAR
/// TEXT list in <c>TwoFactorConfigs.BackupCodes</c> - a column whose own comment
/// claimed the codes were hashed. A read of that column was a permanent 2FA
/// bypass for the account, and nothing ever marked a code as spent, so each one
/// worked for ever.
///
/// Now: 10 codes of 10 base32 characters (50 bits each), only SHA-256 hashes are
/// persisted, and redeeming a code removes its hash from the list.
/// </summary>
public static class BackupCodeService
{
    public const int CodeCount = 10;
    private const int CodeBytes = 7; // 7 bytes -> 11 base32 chars, trimmed to 10 (50 bits)

    /// <summary>Ten fresh codes in clear text. Shown to the user exactly once.</summary>
    public static List<string> Generate() =>
        Enumerable.Range(0, CodeCount)
            .Select(_ => TotpService.Base32Encode(RandomNumberGenerator.GetBytes(CodeBytes))[..10])
            .ToList();

    /// <summary>JSON array of hashes, the form stored in <c>TwoFactorConfigs.BackupCodes</c>.</summary>
    public static string SerializeHashes(IEnumerable<string> clearCodes) =>
        JsonSerializer.Serialize(clearCodes.Select(TokenHasher.Hash).ToList());

    private static List<string> Deserialize(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<string>();
        try { return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>(); }
        catch (JsonException) { return new List<string>(); }
    }

    /// <summary>How many codes are still unspent.</summary>
    public static int RemainingCount(string? storedJson) => Deserialize(storedJson).Count;

    /// <summary>
    /// Redeems <paramref name="presented"/>. On success <paramref name="updatedJson"/>
    /// is the stored list with that code's hash removed - a backup code is single use.
    /// </summary>
    public static bool TryRedeem(string? storedJson, string? presented, out string updatedJson)
    {
        var hashes = Deserialize(storedJson);
        updatedJson = storedJson ?? "[]";
        if (string.IsNullOrWhiteSpace(presented) || hashes.Count == 0) return false;

        var normalized = presented.Trim().Replace(" ", string.Empty).Replace("-", string.Empty).ToUpperInvariant();

        // Compare against EVERY entry (no early exit) so the time taken does not
        // depend on the position of the matching code in the list.
        var matchIndex = -1;
        for (var i = 0; i < hashes.Count; i++)
        {
            if (TokenHasher.Verify(hashes[i], normalized)) matchIndex = i;
        }
        if (matchIndex < 0) return false;

        hashes.RemoveAt(matchIndex);
        updatedJson = JsonSerializer.Serialize(hashes);
        return true;
    }
}
