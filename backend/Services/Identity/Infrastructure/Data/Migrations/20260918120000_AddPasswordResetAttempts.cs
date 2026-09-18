using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Identity.Infrastructure.Data.Migrations
{
    /// <summary>
    /// W0-1: closes the password-reset account takeover.
    ///
    /// The old table stored the 6-digit OTP in clear text in `Token` and the
    /// endpoint looked it up by code alone, so a code issued for one account
    /// reset whichever account owned the matching row. The code column is
    /// replaced by a salted hash, the challenge is bound to an e-mail, and a
    /// failed-attempt counter caps brute force.
    ///
    /// Every pending row is deleted first: those OTPs are exactly the ones the
    /// vulnerability applies to, and there is no safe way to migrate a clear-text
    /// code into the new scheme.
    /// </summary>
    public partial class AddPasswordResetAttempts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DELETE FROM \"PasswordResetTokens\";");

            migrationBuilder.DropIndex(
                name: "IX_PasswordResetTokens_Token",
                table: "PasswordResetTokens");

            migrationBuilder.DropColumn(
                name: "Token",
                table: "PasswordResetTokens");

            migrationBuilder.AddColumn<string>(
                name: "CodeHash",
                table: "PasswordResetTokens",
                type: "character varying(128)",
                maxLength: 128,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Salt",
                table: "PasswordResetTokens",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "PasswordResetTokens",
                type: "character varying(256)",
                maxLength: 256,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Attempts",
                table: "PasswordResetTokens",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_PasswordResetTokens_Email_IsUsed",
                table: "PasswordResetTokens",
                columns: new[] { "Email", "IsUsed" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DELETE FROM \"PasswordResetTokens\";");

            migrationBuilder.DropIndex(
                name: "IX_PasswordResetTokens_Email_IsUsed",
                table: "PasswordResetTokens");

            migrationBuilder.DropColumn(name: "Attempts", table: "PasswordResetTokens");
            migrationBuilder.DropColumn(name: "Email", table: "PasswordResetTokens");
            migrationBuilder.DropColumn(name: "Salt", table: "PasswordResetTokens");
            migrationBuilder.DropColumn(name: "CodeHash", table: "PasswordResetTokens");

            migrationBuilder.AddColumn<string>(
                name: "Token",
                table: "PasswordResetTokens",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_PasswordResetTokens_Token",
                table: "PasswordResetTokens",
                column: "Token");
        }
    }
}
