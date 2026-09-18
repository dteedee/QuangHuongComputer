using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HR.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class W207EmployeeUserLinkPayrollRunCreatedBy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByUserId",
                schema: "hr",
                table: "PayrollRuns",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                schema: "hr",
                table: "Employees",
                type: "character varying(450)",
                maxLength: 450,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Employees_UserId_Unique",
                schema: "hr",
                table: "Employees",
                column: "UserId",
                unique: true,
                filter: "\"UserId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Employees_UserId_Unique",
                schema: "hr",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                schema: "hr",
                table: "PayrollRuns");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                schema: "hr",
                table: "Employees",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(450)",
                oldMaxLength: 450,
                oldNullable: true);
        }
    }
}
