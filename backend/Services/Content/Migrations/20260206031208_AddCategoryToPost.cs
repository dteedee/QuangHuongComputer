using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Content.Migrations
{
    /// <inheritdoc />
    public partial class AddCategoryToPost : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsPublished",
                schema: "content",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "EndDate",
                schema: "content",
                table: "Coupons");

            migrationBuilder.RenameColumn(
                name: "Value",
                schema: "content",
                table: "Coupons",
                newName: "DiscountValue");

            migrationBuilder.RenameColumn(
                name: "UsageCount",
                schema: "content",
                table: "Coupons",
                newName: "UsedCount");

            migrationBuilder.RenameColumn(
                name: "Type",
                schema: "content",
                table: "Coupons",
                newName: "DiscountType");

            migrationBuilder.RenameColumn(
                name: "StartDate",
                schema: "content",
                table: "Coupons",
                newName: "ValidTo");

            migrationBuilder.RenameColumn(
                name: "MaxDiscountAmount",
                schema: "content",
                table: "Coupons",
                newName: "MaxDiscount");

            migrationBuilder.AddColumn<string>(
                name: "Category",
                schema: "content",
                table: "Posts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                schema: "content",
                table: "Posts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AlterColumn<decimal>(
                name: "MinOrderAmount",
                schema: "content",
                table: "Coupons",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2,
                oldNullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ValidFrom",
                schema: "content",
                table: "Coupons",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Category",
                schema: "content",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "Status",
                schema: "content",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "ValidFrom",
                schema: "content",
                table: "Coupons");

            migrationBuilder.RenameColumn(
                name: "ValidTo",
                schema: "content",
                table: "Coupons",
                newName: "StartDate");

            migrationBuilder.RenameColumn(
                name: "UsedCount",
                schema: "content",
                table: "Coupons",
                newName: "UsageCount");

            migrationBuilder.RenameColumn(
                name: "MaxDiscount",
                schema: "content",
                table: "Coupons",
                newName: "MaxDiscountAmount");

            migrationBuilder.RenameColumn(
                name: "DiscountValue",
                schema: "content",
                table: "Coupons",
                newName: "Value");

            migrationBuilder.RenameColumn(
                name: "DiscountType",
                schema: "content",
                table: "Coupons",
                newName: "Type");

            migrationBuilder.AddColumn<bool>(
                name: "IsPublished",
                schema: "content",
                table: "Posts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<decimal>(
                name: "MinOrderAmount",
                schema: "content",
                table: "Coupons",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2);

            migrationBuilder.AddColumn<DateTime>(
                name: "EndDate",
                schema: "content",
                table: "Coupons",
                type: "timestamp with time zone",
                nullable: true);
        }
    }
}
