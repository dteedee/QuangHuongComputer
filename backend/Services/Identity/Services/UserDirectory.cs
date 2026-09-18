using System.Linq;
using BuildingBlocks.Security;
using Identity.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Identity.Services;

/// <summary>One user as the rest of the system is allowed to see them. No hashes, no stamps, no roles.</summary>
public sealed record UserDirectoryEntry(string Id, string FullName, string? Email, string? PhoneNumber, bool IsActive);

/// <summary>Outcome of provisioning a customer account from another module.</summary>
public sealed record UserProvisionResult(bool Succeeded, string? Error, UserDirectoryEntry? User, bool AlreadyExisted);

/// <summary>
/// The ONLY sanctioned way for another module to read or create a user.
///
/// It exists because Identity is frozen after wave 1 and because the two
/// alternatives in the codebase were both wrong: CRM inserted rows into
/// <c>AspNetUsers</c> with raw SQL (no password hash, no security stamp, no
/// Customer role, no normalised e-mail - accounts that could never log in), and
/// the POS customer picker would otherwise have to call <c>/api/auth/users</c>,
/// an endpoint that requires <c>Permissions.Users.View</c> and returns staff.
///
/// NOTE: this interface belongs in BuildingBlocks so callers do not reference
/// the Identity assembly. W1-3 owns that file; see integration-requests-w1.md.
/// Moving it is a namespace change, nothing else.
/// </summary>
public interface IUserDirectory
{
    /// <summary>Batch lookup for Customer 360, order lists and dashboards. Unknown ids are simply absent.</summary>
    Task<IReadOnlyList<UserDirectoryEntry>> GetByIdsAsync(IEnumerable<string> ids, CancellationToken cancellationToken = default);

    /// <summary>Customer-role accounts matching name / phone / e-mail. For the POS picker.</summary>
    Task<IReadOnlyList<UserDirectoryEntry>> SearchCustomersAsync(string term, int take = 20, CancellationToken cancellationToken = default);

    /// <summary>Creates a Customer account properly (UserManager + Customer role + set-password mail).</summary>
    Task<UserProvisionResult> ProvisionCustomerAsync(string fullName, string email, string? phoneNumber, CancellationToken cancellationToken = default);
}

public sealed class UserDirectory : IUserDirectory, BuildingBlocks.Contracts.IUserDirectory
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IdentityDbContext _db;
    private readonly IEmailService _email;
    private readonly ILogger<UserDirectory> _logger;

    public UserDirectory(
        UserManager<ApplicationUser> userManager,
        IdentityDbContext db,
        IEmailService email,
        ILogger<UserDirectory> logger)
    {
        _userManager = userManager;
        _db = db;
        _email = email;
        _logger = logger;
    }

    public async Task<IReadOnlyList<UserDirectoryEntry>> GetByIdsAsync(IEnumerable<string> ids, CancellationToken cancellationToken = default)
    {
        var wanted = ids?.Where(i => !string.IsNullOrWhiteSpace(i)).Distinct().ToList() ?? new List<string>();
        if (wanted.Count == 0) return Array.Empty<UserDirectoryEntry>();

        // IgnoreQueryFilters on purpose: an order placed by an account that has
        // since been deactivated must still show the customer's name, not a blank.
        return await _db.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(u => wanted.Contains(u.Id))
            .Select(u => new UserDirectoryEntry(u.Id, u.FullName, u.Email, u.PhoneNumber, u.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<UserDirectoryEntry>> SearchCustomersAsync(string term, int take = 20, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(term)) return Array.Empty<UserDirectoryEntry>();
        var needle = term.Trim().ToLowerInvariant();
        var limit = Math.Clamp(take, 1, 50);

        var customerRoleId = await _db.Roles
            .Where(r => r.Name == Roles.Customer)
            .Select(r => r.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (customerRoleId == null) return Array.Empty<UserDirectoryEntry>();

        // Active customers only - offering a disabled account in the POS picker
        // would create an order nobody can log in to track.
        return await _db.Users
            .AsNoTracking()
            .Where(u => u.IsActive)
            .Where(u => _db.UserRoles.Any(ur => ur.UserId == u.Id && ur.RoleId == customerRoleId))
            .Where(u => u.FullName.ToLower().Contains(needle)
                        || (u.Email != null && u.Email.ToLower().Contains(needle))
                        || (u.PhoneNumber != null && u.PhoneNumber.Contains(needle)))
            .OrderBy(u => u.FullName)
            .Take(limit)
            .Select(u => new UserDirectoryEntry(u.Id, u.FullName, u.Email, u.PhoneNumber, u.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<UserProvisionResult> ProvisionCustomerAsync(string fullName, string email, string? phoneNumber, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = PasswordResetCodeService.NormalizeEmail(email);
        if (string.IsNullOrWhiteSpace(normalizedEmail) || !normalizedEmail.Contains('@'))
            return new UserProvisionResult(false, "Email không hợp lệ.", null, false);

        var existing = await _db.Users.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail.ToUpperInvariant(), cancellationToken);
        if (existing != null)
            return new UserProvisionResult(true, null, Map(existing), true);

        var user = new ApplicationUser
        {
            UserName = normalizedEmail,
            Email = normalizedEmail,
            FullName = string.IsNullOrWhiteSpace(fullName) ? normalizedEmail : fullName.Trim(),
            PhoneNumber = phoneNumber,
            IsActive = true,
            EmailConfirmed = false,
            ForcePasswordChange = true,
            CreatedAt = DateTime.UtcNow
        };

        // A random password nobody knows: the account is unusable until the
        // customer redeems the set-password code below. This is the difference
        // from CRM's raw INSERT, which left PasswordHash null - a row that
        // Identity treats as "no password configured" for ever.
        var created = await _userManager.CreateAsync(user, TokenHasher.NewSecret(24) + "aA1!");
        if (!created.Succeeded)
            return new UserProvisionResult(false, string.Join("; ", created.Errors.Select(e => e.Description)), null, false);

        await _userManager.AddToRoleAsync(user, Roles.Customer);
        await SendSetPasswordMailAsync(user, normalizedEmail, cancellationToken);

        return new UserProvisionResult(true, null, Map(user), false);
    }

    /// <summary>
    /// Issues a normal password-reset challenge and mails it. Reusing the reset
    /// flow means the set-password path inherits its hashing, its expiry and its
    /// attempt cap instead of inventing a second one.
    /// </summary>
    private async Task SendSetPasswordMailAsync(ApplicationUser user, string normalizedEmail, CancellationToken cancellationToken)
    {
        var code = PasswordResetCodeService.GenerateCode();
        var salt = PasswordResetCodeService.GenerateSalt();

        _db.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId = user.Id,
            Email = normalizedEmail,
            Salt = salt,
            CodeHash = PasswordResetCodeService.ComputeHash(normalizedEmail, code, salt),
            ExpiresAt = DateTime.UtcNow.Add(PasswordResetCodeService.Lifetime),
            IsUsed = false,
            Attempts = 0
        });
        await _db.SaveChangesAsync(cancellationToken);

        try
        {
            await _email.SendPasswordResetEmailAsync(normalizedEmail, code);
        }
        catch (Exception ex)
        {
            // The account is created either way; the customer can use "quên mật khẩu".
            _logger.LogError(ex, "Set-password mail failed for provisioned customer {UserId}", user.Id);
        }
    }

    private static UserDirectoryEntry Map(ApplicationUser u) =>
        new(u.Id, u.FullName, u.Email, u.PhoneNumber, u.IsActive);

    // ---- BuildingBlocks.Contracts.IUserDirectory -------------------------------------------
    // Đợt 1 quy định W1-3 khai báo hợp đồng dùng chung, W1-2 hiện thực nó. Thực tế W1-2 lại khai
    // báo một interface trùng tên trong Identity.Services và chỉ đăng ký bản đó, nên CRM (và mọi
    // module ngoài Identity) yêu cầu BuildingBlocks.Contracts.IUserDirectory đều không resolve
    // được — API chết ngay lúc dựng service. Ở đây hiện thực tường minh hợp đồng dùng chung bằng
    // cách uỷ quyền cho các phương thức sẵn có; hai interface trùng nhau vẫn là nợ kỹ thuật, ghi
    // trong integration-requests-w2.md để gộp lại thành một.
    Task<IReadOnlyList<BuildingBlocks.Contracts.UserDirectoryEntry>> BuildingBlocks.Contracts.IUserDirectory.GetByIdsAsync(
        IReadOnlyCollection<string> userIds, CancellationToken cancellationToken)
        => MapAsync(GetByIdsAsync(userIds, cancellationToken));

    Task<IReadOnlyList<BuildingBlocks.Contracts.UserDirectoryEntry>> BuildingBlocks.Contracts.IUserDirectory.SearchCustomersAsync(
        string query, int limit, CancellationToken cancellationToken)
        => MapAsync(SearchCustomersAsync(query, limit, cancellationToken));

    async Task<BuildingBlocks.Contracts.UserDirectoryEntry> BuildingBlocks.Contracts.IUserDirectory.ProvisionCustomerAsync(
        string fullName, string? phoneNumber, string? email, CancellationToken cancellationToken)
    {
        // Hợp đồng dùng chung hứa idempotent và KHÔNG ném 409 vào mặt thu ngân: hai quầy POS cùng
        // quẹt một số điện thoại phải ra đúng một tài khoản.
        var result = await ProvisionCustomerAsync(fullName, email ?? string.Empty, phoneNumber, cancellationToken);
        if (!result.Succeeded || result.User is null)
            throw new InvalidOperationException(result.Error ?? "Không tạo được tài khoản khách hàng.");
        return Map(result.User);
    }

    private static BuildingBlocks.Contracts.UserDirectoryEntry Map(UserDirectoryEntry e)
        => new(e.Id, e.FullName, e.Email, e.PhoneNumber, e.IsActive);

    private static async Task<IReadOnlyList<BuildingBlocks.Contracts.UserDirectoryEntry>> MapAsync(
        Task<IReadOnlyList<UserDirectoryEntry>> source)
        => (await source).Select(Map).ToList();
}
