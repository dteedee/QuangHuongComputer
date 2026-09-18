using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HR.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class W225StatutoryPayrollParameters : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "KeepSiOnUnpaidLeave",
                schema: "hr",
                table: "Payrolls",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateOnly>(
                name: "PayDate",
                schema: "hr",
                table: "Payrolls",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PitMethod",
                schema: "hr",
                table: "Payrolls",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StatutorySnapshotJson",
                schema: "hr",
                table: "Payrolls",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TaxableGrossIncome",
                schema: "hr",
                table: "Payrolls",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateOnly>(
                name: "PayDate",
                schema: "hr",
                table: "PayrollRuns",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "NightShiftHours",
                schema: "hr",
                table: "MonthlyTimesheets",
                type: "numeric(8,2)",
                precision: 8,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "OvertimeHoursNightHoliday",
                schema: "hr",
                table: "MonthlyTimesheets",
                type: "numeric(8,2)",
                precision: 8,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "OvertimeHoursNightRestDay",
                schema: "hr",
                table: "MonthlyTimesheets",
                type: "numeric(8,2)",
                precision: 8,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "OvertimeHoursNightWeekday",
                schema: "hr",
                table: "MonthlyTimesheets",
                type: "numeric(8,2)",
                precision: 8,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "IsStandaloneProbation",
                schema: "hr",
                table: "EmploymentContracts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasPitCommitment",
                schema: "hr",
                table: "Employees",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsTaxResident",
                schema: "hr",
                table: "Employees",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsUnionMember",
                schema: "hr",
                table: "Employees",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PitMethodOverride",
                schema: "hr",
                table: "Employees",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PublicHolidays",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    IsPaid = table.Column<bool>(type: "boolean", nullable: false),
                    IsConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    LegalBasis = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    Note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PublicHolidays", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "StatutoryParameters",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    EffectiveFrom = table.Column<DateOnly>(type: "date", nullable: false),
                    NumberValue = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true),
                    JsonValue = table.Column<string>(type: "jsonb", nullable: true),
                    Unit = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    LegalBasis = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false),
                    SourceUrl = table.Column<string>(type: "character varying(600)", maxLength: 600, nullable: false),
                    Note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IsSeed = table.Column<bool>(type: "boolean", nullable: false),
                    IsVerified = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StatutoryParameters", x => x.Id);
                    table.CheckConstraint("CK_StatutoryParameters_OneValue", "(\"NumberValue\" IS NULL) <> (\"JsonValue\" IS NULL)");
                });

            migrationBuilder.CreateIndex(
                name: "IX_PublicHolidays_Date",
                schema: "hr",
                table: "PublicHolidays",
                column: "Date",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StatutoryParameters_Code_EffectiveFrom",
                schema: "hr",
                table: "StatutoryParameters",
                columns: new[] { "Code", "EffectiveFrom" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PublicHolidays",
                schema: "hr");

            migrationBuilder.DropTable(
                name: "StatutoryParameters",
                schema: "hr");

            migrationBuilder.DropColumn(
                name: "KeepSiOnUnpaidLeave",
                schema: "hr",
                table: "Payrolls");

            migrationBuilder.DropColumn(
                name: "PayDate",
                schema: "hr",
                table: "Payrolls");

            migrationBuilder.DropColumn(
                name: "PitMethod",
                schema: "hr",
                table: "Payrolls");

            migrationBuilder.DropColumn(
                name: "StatutorySnapshotJson",
                schema: "hr",
                table: "Payrolls");

            migrationBuilder.DropColumn(
                name: "TaxableGrossIncome",
                schema: "hr",
                table: "Payrolls");

            migrationBuilder.DropColumn(
                name: "PayDate",
                schema: "hr",
                table: "PayrollRuns");

            migrationBuilder.DropColumn(
                name: "NightShiftHours",
                schema: "hr",
                table: "MonthlyTimesheets");

            migrationBuilder.DropColumn(
                name: "OvertimeHoursNightHoliday",
                schema: "hr",
                table: "MonthlyTimesheets");

            migrationBuilder.DropColumn(
                name: "OvertimeHoursNightRestDay",
                schema: "hr",
                table: "MonthlyTimesheets");

            migrationBuilder.DropColumn(
                name: "OvertimeHoursNightWeekday",
                schema: "hr",
                table: "MonthlyTimesheets");

            migrationBuilder.DropColumn(
                name: "IsStandaloneProbation",
                schema: "hr",
                table: "EmploymentContracts");

            migrationBuilder.DropColumn(
                name: "HasPitCommitment",
                schema: "hr",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "IsTaxResident",
                schema: "hr",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "IsUnionMember",
                schema: "hr",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "PitMethodOverride",
                schema: "hr",
                table: "Employees");
        }
    }
}
