using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Content.Migrations
{
    /// <inheritdoc />
    public partial class W111ContentSchemaIntegrity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                schema: "content",
                table: "HomepageSections",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                schema: "content",
                table: "HomepageSections",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Coupons_DiscountValue_NonNegative",
                schema: "content",
                table: "Coupons",
                sql: "\"DiscountValue\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Coupons_MinOrderAmount_NonNegative",
                schema: "content",
                table: "Coupons",
                sql: "\"MinOrderAmount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Coupons_UsedCount_NonNegative",
                schema: "content",
                table: "Coupons",
                sql: "\"UsedCount\" >= 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Coupons_DiscountValue_NonNegative",
                schema: "content",
                table: "Coupons");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Coupons_MinOrderAmount_NonNegative",
                schema: "content",
                table: "Coupons");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Coupons_UsedCount_NonNegative",
                schema: "content",
                table: "Coupons");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                schema: "content",
                table: "HomepageSections",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                schema: "content",
                table: "HomepageSections",
                type: "timestamp without time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");
        }
    }
}
