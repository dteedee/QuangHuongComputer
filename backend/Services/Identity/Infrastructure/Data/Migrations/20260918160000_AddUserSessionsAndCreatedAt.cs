using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Identity.Infrastructure.Data.Migrations
{
    /// <summary>
    /// W1-2 - real sessions, real 2FA, revocable tokens, and a CreatedAt users actually have.
    ///
    /// Six changes, all additive except the last:
    ///   1. `AspNetUsers.CreatedAt` - the user-admin DTO had the field, the table
    ///      never had the column, so every account showed 0001-01-01 and
    ///      "sort by createdAt" secretly sorted by a random GUID. Backfilled from
    ///      the oldest refresh token, else the last login, else now.
    ///   2. `RefreshTokens.TokenHash` + `SessionId`, and `Token` becomes NULLABLE.
    ///      The clear-text 64-byte token is no longer stored. Existing rows keep
    ///      their `Token` so the owner's open sessions are NOT force-logged-out;
    ///      they converge on the hashed form at their next rotation. The unique
    ///      index moves from `Token` to `TokenHash`.
    ///   3. `UserSessions` revocation columns - the session row now records who
    ///      ended it and why (User / Admin / Logout / PasswordChange / TokenReuse).
    ///   4. `TwoFactorConfigs` replay + brute-force columns.
    ///   5. `TwoFactorChallenges` - the short-lived, single-use ticket between
    ///      "password accepted" and "TOTP accepted".
    ///   6. `IdentityCustomerAddresses` is DROPPED. It was a second address book
    ///      next to the Sales one that checkout reads. Verified empty in both
    ///      `quanghuongdb` and `quanghuongdb_test` on 2026-09-18 (0 rows each),
    ///      so nothing had to be copied; the guard below refuses the drop anyway
    ///      if any row exists when this runs somewhere else.
    ///
    /// Plus the two `AuditLogs` indexes W1-11 cannot add from the other modules'
    /// contexts (the audit table lives in IdentityDbContext).
    /// </summary>
    /// <remarks>
    /// The [DbContext] and [Migration] attributes normally live in a generated
    /// `.Designer.cs`. They are declared here instead because D12 forbids running
    /// `dotnet ef` (every build goes through scripts/qh-build.sh), so this
    /// migration is hand-written. EF's MigrationsAssembly needs exactly these two
    /// attributes to discover it - wherever they live.
    /// </remarks>
    [DbContext(typeof(IdentityDbContext))]
    [Migration("20260918160000_AddUserSessionsAndCreatedAt")]
    public partial class AddUserSessionsAndCreatedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ------------------------------------------------ 1. users.CreatedAt
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "AspNetUsers",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "(NOW() AT TIME ZONE 'utc')");

            migrationBuilder.Sql(@"
                UPDATE ""AspNetUsers"" u
                SET ""CreatedAt"" = COALESCE(
                    (SELECT MIN(rt.""CreatedAt"") FROM ""RefreshTokens"" rt WHERE rt.""UserId"" = u.""Id""),
                    u.""LastLoginAt"",
                    (NOW() AT TIME ZONE 'utc'));");

            // -------------------------------------- 2. refresh tokens: hash + family
            migrationBuilder.DropIndex(name: "IX_RefreshTokens_Token", table: "RefreshTokens");

            migrationBuilder.AlterColumn<string>(
                name: "Token",
                table: "RefreshTokens",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500);

            migrationBuilder.AlterColumn<string>(
                name: "ReplacedByToken",
                table: "RefreshTokens",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500,
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TokenHash",
                table: "RefreshTokens",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SessionId",
                table: "RefreshTokens",
                type: "uuid",
                nullable: true);

            // NULLs do not collide in a Postgres unique index, so the legacy rows
            // (TokenHash NULL) coexist with the hashed ones.
            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_TokenHash", table: "RefreshTokens", column: "TokenHash", unique: true);
            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_Token", table: "RefreshTokens", column: "Token");
            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_SessionId", table: "RefreshTokens", column: "SessionId");

            // --------------------------------------- 3. sessions: revocation trail
            migrationBuilder.AddColumn<DateTime>(
                name: "RevokedAt", table: "UserSessions", type: "timestamp without time zone", nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "RevokedByIp", table: "UserSessions", type: "character varying(50)", maxLength: 50, nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "RevokedReason", table: "UserSessions", type: "character varying(50)", maxLength: 50, nullable: true);

            // ------------------------------------------- 4. 2FA replay + lockout
            migrationBuilder.AddColumn<long>(
                name: "LastUsedTimeStep", table: "TwoFactorConfigs", type: "bigint", nullable: false, defaultValue: 0L);
            migrationBuilder.AddColumn<int>(
                name: "FailedAttempts", table: "TwoFactorConfigs", type: "integer", nullable: false, defaultValue: 0);
            migrationBuilder.AddColumn<DateTime>(
                name: "LockedUntil", table: "TwoFactorConfigs", type: "timestamp without time zone", nullable: true);

            // Every pre-W1-2 2FA enrolment was accepted without ever verifying a
            // code against the secret, and its "backup codes" were clear text.
            // Neither can be trusted, so they are switched off; the user re-enrols.
            migrationBuilder.Sql(@"
                UPDATE ""TwoFactorConfigs""
                SET ""IsEnabled"" = FALSE, ""TotpSecret"" = '', ""BackupCodes"" = ''
                WHERE ""IsEnabled"" = TRUE;");
            migrationBuilder.Sql(@"UPDATE ""AspNetUsers"" SET ""TwoFactorEnabled"" = FALSE WHERE ""TwoFactorEnabled"" = TRUE;");

            // ------------------------------------------- 5. 2FA login challenges
            migrationBuilder.CreateTable(
                name: "TwoFactorChallenges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsUsed = table.Column<bool>(type: "boolean", nullable: false),
                    Attempts = table.Column<int>(type: "integer", nullable: false),
                    IpAddress = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table => table.PrimaryKey("PK_TwoFactorChallenges", x => x.Id));

            migrationBuilder.CreateIndex(
                name: "IX_TwoFactorChallenges_TokenHash", table: "TwoFactorChallenges", column: "TokenHash", unique: true);
            migrationBuilder.CreateIndex(
                name: "IX_TwoFactorChallenges_UserId_IsUsed", table: "TwoFactorChallenges", columns: new[] { "UserId", "IsUsed" });

            // ------------------------------------------------- AuditLogs indexes
            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_EntityName_EntityId_Timestamp",
                table: "AuditLogs", columns: new[] { "EntityName", "EntityId", "Timestamp" });
            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_UserId_Timestamp",
                table: "AuditLogs", columns: new[] { "UserId", "Timestamp" });

            // ------------------------------- 6. drop the duplicate address book
            // Guarded: if this ever runs against a database where somebody did
            // save an address here, the migration fails loudly instead of
            // deleting customer data. Sales `CustomerAddresses` is the survivor.
            migrationBuilder.Sql(@"
                DO $$
                DECLARE row_count bigint;
                BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.tables
                               WHERE table_schema = 'public' AND table_name = 'IdentityCustomerAddresses') THEN
                        EXECUTE 'SELECT count(*) FROM ""IdentityCustomerAddresses""' INTO row_count;
                        IF row_count > 0 THEN
                            RAISE EXCEPTION 'IdentityCustomerAddresses still holds % row(s); copy them into the Sales address book before dropping.', row_count;
                        END IF;
                        DROP TABLE ""IdentityCustomerAddresses"";
                    END IF;
                END $$;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "TwoFactorChallenges");

            migrationBuilder.DropIndex(name: "IX_AuditLogs_EntityName_EntityId_Timestamp", table: "AuditLogs");
            migrationBuilder.DropIndex(name: "IX_AuditLogs_UserId_Timestamp", table: "AuditLogs");

            migrationBuilder.DropColumn(name: "LockedUntil", table: "TwoFactorConfigs");
            migrationBuilder.DropColumn(name: "FailedAttempts", table: "TwoFactorConfigs");
            migrationBuilder.DropColumn(name: "LastUsedTimeStep", table: "TwoFactorConfigs");

            migrationBuilder.DropColumn(name: "RevokedReason", table: "UserSessions");
            migrationBuilder.DropColumn(name: "RevokedByIp", table: "UserSessions");
            migrationBuilder.DropColumn(name: "RevokedAt", table: "UserSessions");

            migrationBuilder.DropIndex(name: "IX_RefreshTokens_SessionId", table: "RefreshTokens");
            migrationBuilder.DropIndex(name: "IX_RefreshTokens_Token", table: "RefreshTokens");
            migrationBuilder.DropIndex(name: "IX_RefreshTokens_TokenHash", table: "RefreshTokens");
            migrationBuilder.DropColumn(name: "SessionId", table: "RefreshTokens");
            migrationBuilder.DropColumn(name: "TokenHash", table: "RefreshTokens");

            // Rows written after the upgrade have no clear-text token to restore.
            migrationBuilder.Sql(@"DELETE FROM ""RefreshTokens"" WHERE ""Token"" IS NULL;");
            migrationBuilder.AlterColumn<string>(
                name: "Token", table: "RefreshTokens",
                type: "character varying(500)", maxLength: 500, nullable: false, defaultValue: "",
                oldClrType: typeof(string), oldType: "character varying(500)", oldMaxLength: 500, oldNullable: true);
            migrationBuilder.AlterColumn<string>(
                name: "ReplacedByToken", table: "RefreshTokens",
                type: "character varying(500)", maxLength: 500, nullable: true,
                oldClrType: typeof(string), oldType: "character varying(128)", oldMaxLength: 128, oldNullable: true);
            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_Token", table: "RefreshTokens", column: "Token", unique: true);

            migrationBuilder.DropColumn(name: "CreatedAt", table: "AspNetUsers");

            // IdentityCustomerAddresses is intentionally NOT recreated: it was an
            // empty duplicate of the Sales address book.
        }
    }
}
