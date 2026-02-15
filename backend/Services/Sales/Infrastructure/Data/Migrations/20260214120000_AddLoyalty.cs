using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sales.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLoyalty : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Create LoyaltyAccounts table
            migrationBuilder.CreateTable(
                name: "LoyaltyAccounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    TotalPoints = table.Column<int>(type: "integer", nullable: false),
                    AvailablePoints = table.Column<int>(type: "integer", nullable: false),
                    LifetimePoints = table.Column<int>(type: "integer", nullable: false),
                    Tier = table.Column<int>(type: "integer", nullable: false),
                    LastActivityAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TierExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoyaltyAccounts", x => x.Id);
                });

            // Create LoyaltyTransactions table
            migrationBuilder.CreateTable(
                name: "LoyaltyTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Points = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReferenceCode = table.Column<string>(type: "text", nullable: true),
                    BalanceAfter = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoyaltyTransactions", x => x.Id);
                });

            // Create indexes for LoyaltyAccounts
            migrationBuilder.CreateIndex(
                name: "ix_loyalty_accounts_user_id",
                table: "LoyaltyAccounts",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_loyalty_accounts_tier",
                table: "LoyaltyAccounts",
                column: "Tier");

            // Create indexes for LoyaltyTransactions
            migrationBuilder.CreateIndex(
                name: "ix_loyalty_transactions_account_created",
                table: "LoyaltyTransactions",
                columns: new[] { "AccountId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "ix_loyalty_transactions_order_id",
                table: "LoyaltyTransactions",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "ix_loyalty_transactions_type",
                table: "LoyaltyTransactions",
                column: "Type");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "LoyaltyTransactions");
            migrationBuilder.DropTable(name: "LoyaltyAccounts");
        }
    }
}
