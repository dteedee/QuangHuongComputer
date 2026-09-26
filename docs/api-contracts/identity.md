# Identity API contract (FROZEN by W1-2, 2026-09-18)

Identity is frozen after wave 1. Everything 40+ later tracks need is here. Read this, not the source.

Base paths: `/api/auth` (accounts, roles), `/api/identity/2fa`, `/api/identity/sessions`.

---

## 1. Login is now TWO-STEP when the account has 2FA on

`POST /api/auth/login` `{ email, password }` answers one of **two different shapes**:

```jsonc
// 2FA OFF - the refresh token is NOT in the body: it is set as the HttpOnly `qh_rt` cookie (see §3)
{ "token": "<jwt>", "user": { id, email, fullName, roles[], permissions[] } }

// 2FA ON - NO token field at all
{ "requiresTwoFactor": true, "challengeToken": "<opaque>", "expiresInSeconds": 300, "message": "..." }
```

Clients MUST branch on `requiresTwoFactor` before reading `token`.

`POST /api/auth/login/2fa` `{ challengeToken, code? , backupCode? }` -> the same success shape as above.
The challenge is **single use**, expires after `Jwt:TwoFactorChallengeMinutes` (default 5), dies after 5 wrong
codes, and carries **no roles and no permissions** - nothing can be done with it but finish the login.

Anonymous. Both routes are rate-limited by the `auth` policy.
**`/api/auth/login/2fa` must be added to `BuildingBlocks/Security/PublicEndpointAllowList.cs`** - see
integration-requests-w1.md (that file is not in W1-2's globs).

## 2. The access token carries two new claims

| claim | meaning |
|---|---|
| `stamp` | the user's ASP.NET Identity security stamp at issue time |
| `sid`   | the `UserSessions` row (device) the token belongs to |

`JwtBearerEvents.OnTokenValidated` (`Identity/Services/AccessTokenStateGuard.cs`) re-checks, on **every**
authenticated request, via `IUserStateCache` (Redis, 60s TTL, **database fallback**, never fail-open per D05 item 8):

1. the account still exists,
2. `IsActive` is still true,
3. the `sid` session is not revoked,
4. `stamp` still matches the account's.

Any "no" -> 401. Consequence for every other track: **deactivating a user, changing their roles, changing a
role's permissions, changing a password, or revoking a session takes effect on the next request (<= 60s worst
case across instances), not after the token expires.** Tokens issued before W1-2 carry no `stamp`; they are
still subject to checks 1-3 and expire within the access-token lifetime.

Access token lifetime: `Jwt:ExpireMinutes` (default 60, hard cap 1440).
Refresh lifetime: `Jwt:RefreshDays` (default 14; legacy key `Jwt:RefreshTokenLifetimeDays` still read).

## 3. A session is a refresh-token family

`UserSessions` = one row per device. Every `RefreshTokens` row carries that row's `SessionId`.

- Refresh tokens are **stored as SHA-256 hashes** (`RefreshTokens.TokenHash`). `Token` is nullable and holds
  clear text only on pre-W1-2 rows, which keep working and converge on the hashed form at their next rotation.
- **Reuse detection:** presenting a token that was already rotated away (`IsRevoked && ReplacedByToken != null`)
  revokes the whole family and stamps `UserSessions.RevokedReason = 'TokenReuse'`.
- `POST /api/auth/logout` closes the **device**, not just the one token.
- **Transport (fix/w1-auth-cookies):** the refresh token is only ever the cookie `qh_rt`
  (`HttpOnly; Secure; SameSite=Strict; Path=/api/auth`), set by login, `/login/2fa`, `/google` and
  `/refresh-token`, expired by `/logout`. `/refresh-token` and `/logout` read the cookie (a body token is
  ignored), require `X-Requested-With: XMLHttpRequest` (400 otherwise), and `/refresh-token` answers
  `{ token, user }` + a rotated cookie. A rejected refresh also expires the cookie. `/refresh-token` is on
  the general rate limit, not `auth` (the SPA refreshes on every page load; the token is unguessable).

| route | effect |
|---|---|
| `GET /api/identity/sessions` | own devices; `isCurrent` marks the caller's |
| `DELETE /api/identity/sessions/{id}` | kills that family; that device's access token is rejected too |
| `DELETE /api/identity/sessions/all-others` | every other device (by **session**, not by IP) |
| `POST /api/auth/revoke-all-tokens` | all devices + security-stamp bump |

## 4. Two-factor authentication is real

`POST /api/identity/2fa/setup` -> `{ secret (base32), qrUri }`, 2FA still off.
`POST /api/identity/2fa/verify-setup` `{ code }` -> RFC 6238 verify (HMAC-SHA1, 6 digits, 30s, window +-1)
against the stored secret. A wrong code **fails**. On success: `{ enabled: true, backupCodes: [10 strings] }`.
The clear-text backup codes exist only in that one response - only hashes are stored, and each is single use.
`POST /api/identity/2fa/disable` requires **password + a live code (or a backup code)**.
`GET /api/identity/2fa/status` -> `{ isEnabled, enabledDate, backupCodesRemaining }`.
5 wrong codes park the config for 15 minutes; an accepted time step cannot be replayed.

**Existing enrolments were switched off by the migration** - they had been accepted without ever verifying a
code, and their "backup codes" were clear text. Affected users re-enrol.

## 5. User administration

All under `/api/auth`, all on named permission policies (`Permissions.Users.*`, `Permissions.Roles.*`).

| route | permission | notes |
|---|---|---|
| `GET /users?page&pageSize&search&role&sortBy&sortDescending&includeInactive` | `Users.View` | `role` filters **before** paging, so `total` is correct; `includeInactive=true` now really shows disabled accounts; `sortBy=createdat` sorts by the real column |
| `POST /users` | `Users.Create` | only an Admin may grant Admin/Manager |
| `GET /users/{id}` · `PUT /users/{id}` | `Users.View` / `Users.Edit` | returns `UserDto`, never the entity |
| `DELETE /users/{id}` · `POST /users/{id}/deactivate` | `Users.Delete` | refuses self-deactivation and the last active Admin; revokes sessions + stamp |
| `POST /users/{id}/activate` · `/toggle-status` | `Users.Edit` | |
| `POST /users/{id}/roles` | `Users.ManageRoles` | validates names before removing anything; escalation + last-admin guards; bumps the stamp |
| `POST /users/{id}/reset-password` | `Users.Edit` | sets a CSPRNG temp password + `ForcePasswordChange`, revokes every session, mails it, and returns `temporaryPassword` so the shop can hand it over in person |
| `POST /users/{id}/revoke-sessions` | `Users.Edit` | |
| `PUT /roles/{id}/permissions` | `Roles.Edit` | bumps the stamp of **every member**, so a revoked permission stops working at once |

`UserDto` = `{ id, email, fullName, isActive, roles[], createdAt }`. `createdAt` is a real column now
(`AspNetUsers.CreatedAt`, backfilled from the oldest refresh token, else last login, else migration time).

## 6. Cross-module user access - `IUserDirectory`

`Identity.Services.IUserDirectory` is the **only** sanctioned way for another module to read or create a user.
Do not query `AspNetUsers` directly and never INSERT into it (CRM's raw-SQL insert produced accounts with no
password hash and no Customer role - they could never log in).

```csharp
Task<IReadOnlyList<UserDirectoryEntry>> GetByIdsAsync(IEnumerable<string> ids, CancellationToken ct = default);
Task<IReadOnlyList<UserDirectoryEntry>> SearchCustomersAsync(string term, int take = 20, CancellationToken ct = default);
Task<UserProvisionResult> ProvisionCustomerAsync(string fullName, string email, string? phoneNumber, CancellationToken ct = default);

record UserDirectoryEntry(string Id, string FullName, string? Email, string? PhoneNumber, bool IsActive);
record UserProvisionResult(bool Succeeded, string? Error, UserDirectoryEntry? User, bool AlreadyExisted);
```

- `GetByIdsAsync` includes deactivated users (an old order must still show its customer's name).
- `SearchCustomersAsync` returns **active Customer-role accounts only** - safe for the POS picker, and it does
  not expose staff the way `/api/auth/users` would.
- `ProvisionCustomerAsync` creates via `UserManager`, adds the `Customer` role, and mails a set-password code
  through the normal reset flow. Idempotent on an existing e-mail (`AlreadyExisted = true`).

Registered scoped in `Identity.DependencyInjection`. The interface should move to `BuildingBlocks` so callers
do not reference the Identity assembly - filed for W1-3; it is a namespace change only.

## 7. Removed

- **Identity's address book.** `IdentityCustomerAddresses` and `GET/POST/PUT/DELETE /api/auth/me/addresses` are
  gone. The table was empty in both `quanghuongdb` and `quanghuongdb_test` (0 rows, verified 2026-09-18), so
  nothing was migrated. **`/api/sales/addresses` is the surviving address book** - it is what checkout reads and
  what `frontend/src/pages/account/address-book-page.tsx` already uses. `GET /api/auth/me` no longer returns
  `defaultAddress`; it gained `createdAt`, `twoFactorEnabled` and `forcePasswordChange`.

## 8. Validation

Every write DTO has a FluentValidation validator with Vietnamese messages
(`Identity/Validators/*`), attached with `.WithValidation<T>()`. Failures are `400 { errors: [{ field, message }] }`.
Per **D03**, registration rejects `example.com/.net/.org` **in Production only** - Development must keep
accepting them because every probe and e2e test uses RFC 2606 addresses.
