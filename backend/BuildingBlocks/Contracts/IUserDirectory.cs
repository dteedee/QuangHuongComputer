namespace BuildingBlocks.Contracts;

/// <summary>
/// The only fields a non-Identity module may know about a person. Deliberately narrow: no password
/// state, no roles, no claims, no lockout - a module that needs those is doing authorization, which
/// belongs to the permission policies, not to a lookup.
/// </summary>
/// <param name="Id">ASP.NET Identity user id (string form of the GUID).</param>
/// <param name="FullName">Display name. Falls back to the e-mail local part when unset.</param>
/// <param name="Email">May be null for a walk-in customer provisioned at the POS.</param>
/// <param name="PhoneNumber">Vietnamese subscriber number, digits only, no country code.</param>
/// <param name="IsActive">False once the account is disabled; such a user still resolves, so
/// historical orders can still print a name.</param>
public sealed record UserDirectoryEntry(
    string Id,
    string FullName,
    string? Email,
    string? PhoneNumber,
    bool IsActive);

/// <summary>
/// Read-and-provision access to the user directory for modules that are NOT Identity.
///
/// Why it exists: CRM, Sales/POS and Reporting all need "who is this customer" and today each one
/// reaches for its own answer - a duplicated customer table, a join across DbContexts, or a name
/// copied onto the order row and never updated. One narrow contract, implemented once inside
/// Identity (W1-2), keeps the account the single source of truth without letting other modules see
/// credentials or roles.
///
/// Declared in BuildingBlocks because a module may not reference another module; only the host wires
/// the implementation.
/// </summary>
public interface IUserDirectory
{
    /// <summary>
    /// Resolves many users in ONE round trip. Takes a collection precisely so a list screen does not
    /// issue one query per row - the N+1 this interface exists to prevent.
    /// Unknown ids are omitted from the result rather than returned as null entries.
    /// </summary>
    Task<IReadOnlyList<UserDirectoryEntry>> GetByIdsAsync(
        IReadOnlyCollection<string> userIds,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Type-ahead over name / e-mail / phone, for the customer picker in POS, CRM and order entry.
    /// <paramref name="limit"/> is capped by the implementation; callers must not rely on getting
    /// every match, and must never use this to enumerate the directory.
    /// </summary>
    Task<IReadOnlyList<UserDirectoryEntry>> SearchCustomersAsync(
        string query,
        int limit = 20,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns the existing customer account for <paramref name="phoneNumber"/>/<paramref name="email"/>,
    /// or creates one with no password (the walk-in POS case) and returns it.
    ///
    /// Idempotent by contract: two concurrent POS terminals ringing up the same phone number must end
    /// up with ONE account, not two, and never with a 409 surfaced to the cashier.
    /// </summary>
    Task<UserDirectoryEntry> ProvisionCustomerAsync(
        string fullName,
        string? phoneNumber,
        string? email,
        CancellationToken cancellationToken = default);
}
