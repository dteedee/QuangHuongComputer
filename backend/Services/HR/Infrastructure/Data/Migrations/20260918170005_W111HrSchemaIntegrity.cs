using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HR.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class W111HrSchemaIntegrity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // W1-11: giờ vào/ra là thời điểm thật -> timestamptz. Dùng SQL thuần thay cho
            // AlterColumn để ép `AT TIME ZONE 'UTC'`: ứng dụng ghi DateTime UTC không hậu tố,
            // nếu để PostgreSQL tự suy diễn theo múi giờ phiên thì giá trị lệch 7 tiếng.
            // 23 dòng hiện có đều do agent tạo ngày 2026-09-17/18 (không có dữ liệu chấm công thật).
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.columns
                                WHERE table_schema='hr' AND table_name='AttendanceRecords'
                                  AND column_name='CheckInTime'
                                  AND data_type='timestamp without time zone') THEN
                        ALTER TABLE hr.""AttendanceRecords""
                            ALTER COLUMN ""CheckInTime""  TYPE timestamptz USING ""CheckInTime""  AT TIME ZONE 'UTC',
                            ALTER COLUMN ""CheckOutTime"" TYPE timestamptz USING ""CheckOutTime"" AT TIME ZONE 'UTC';
                    END IF;
                END $$;");

            migrationBuilder.DropIndex(
                name: "IX_Payrolls_EmployeeId_Year_Month",
                schema: "hr",
                table: "Payrolls");

            migrationBuilder.DropIndex(
                name: "IX_Employees_Email",
                schema: "hr",
                table: "Employees");

            migrationBuilder.AlterColumn<decimal>(
                name: "TaxableIncome",
                schema: "hr",
                table: "Payrolls",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.AlterColumn<decimal>(
                name: "InsurableSalary",
                schema: "hr",
                table: "Payrolls",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.AlterColumn<decimal>(
                name: "GrossPay",
                schema: "hr",
                table: "Payrolls",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.AlterColumn<decimal>(
                name: "CheckInLongitude",
                schema: "hr",
                table: "AttendanceRecords",
                type: "numeric(9,6)",
                precision: 9,
                scale: 6,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "CheckInLatitude",
                schema: "hr",
                table: "AttendanceRecords",
                type: "numeric(9,6)",
                precision: 9,
                scale: 6,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "ApprovedOvertimeHours",
                schema: "hr",
                table: "AttendanceRecords",
                type: "numeric(8,2)",
                precision: 8,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.CreateIndex(
                name: "IX_Payrolls_Employee_Year_Month_Unique",
                schema: "hr",
                table: "Payrolls",
                columns: new[] { "EmployeeId", "Year", "Month" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Payrolls_PayrollRunId",
                schema: "hr",
                table: "Payrolls",
                column: "PayrollRunId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Payrolls_BaseSalary_NonNegative",
                schema: "hr",
                table: "Payrolls",
                sql: "\"BaseSalary\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Payrolls_GrossPay_NonNegative",
                schema: "hr",
                table: "Payrolls",
                sql: "\"GrossPay\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Payrolls_InsurableSalary_NonNegative",
                schema: "hr",
                table: "Payrolls",
                sql: "\"InsurableSalary\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Payrolls_Month_Range",
                schema: "hr",
                table: "Payrolls",
                sql: "\"Month\" >= 1 AND \"Month\" <= 12");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Payrolls_NetPay_NonNegative",
                schema: "hr",
                table: "Payrolls",
                sql: "\"NetPay\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Payrolls_TaxableIncome_NonNegative",
                schema: "hr",
                table: "Payrolls",
                sql: "\"TaxableIncome\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Payrolls_Year_Range",
                schema: "hr",
                table: "Payrolls",
                sql: "\"Year\" >= 2000 AND \"Year\" <= 2100");

            migrationBuilder.CreateIndex(
                name: "IX_Employees_Email_Unique",
                schema: "hr",
                table: "Employees",
                column: "Email",
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Employees_BaseSalary_NonNegative",
                schema: "hr",
                table: "Employees",
                sql: "\"BaseSalary\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Employees_HourlyRate_NonNegative",
                schema: "hr",
                table: "Employees",
                sql: "\"HourlyRate\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AttendanceRecords_CheckOut_AfterCheckIn",
                schema: "hr",
                table: "AttendanceRecords",
                sql: "\"CheckOutTime\" IS NULL OR \"CheckInTime\" IS NULL OR \"CheckOutTime\" >= \"CheckInTime\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AttendanceRecords_OvertimeHours_NonNegative",
                schema: "hr",
                table: "AttendanceRecords",
                sql: "\"OvertimeHours\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AttendanceRecords_WorkHours_NonNegative",
                schema: "hr",
                table: "AttendanceRecords",
                sql: "\"WorkHours\" >= 0");

            migrationBuilder.AddForeignKey(
                name: "FK_Payrolls_PayrollRuns_PayrollRunId",
                schema: "hr",
                table: "Payrolls",
                column: "PayrollRunId",
                principalSchema: "hr",
                principalTable: "PayrollRuns",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Payrolls_PayrollRuns_PayrollRunId",
                schema: "hr",
                table: "Payrolls");

            migrationBuilder.DropIndex(
                name: "IX_Payrolls_Employee_Year_Month_Unique",
                schema: "hr",
                table: "Payrolls");

            migrationBuilder.DropIndex(
                name: "IX_Payrolls_PayrollRunId",
                schema: "hr",
                table: "Payrolls");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Payrolls_BaseSalary_NonNegative",
                schema: "hr",
                table: "Payrolls");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Payrolls_GrossPay_NonNegative",
                schema: "hr",
                table: "Payrolls");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Payrolls_InsurableSalary_NonNegative",
                schema: "hr",
                table: "Payrolls");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Payrolls_Month_Range",
                schema: "hr",
                table: "Payrolls");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Payrolls_NetPay_NonNegative",
                schema: "hr",
                table: "Payrolls");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Payrolls_TaxableIncome_NonNegative",
                schema: "hr",
                table: "Payrolls");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Payrolls_Year_Range",
                schema: "hr",
                table: "Payrolls");

            migrationBuilder.DropIndex(
                name: "IX_Employees_Email_Unique",
                schema: "hr",
                table: "Employees");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Employees_BaseSalary_NonNegative",
                schema: "hr",
                table: "Employees");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Employees_HourlyRate_NonNegative",
                schema: "hr",
                table: "Employees");

            migrationBuilder.DropCheckConstraint(
                name: "CK_AttendanceRecords_CheckOut_AfterCheckIn",
                schema: "hr",
                table: "AttendanceRecords");

            migrationBuilder.DropCheckConstraint(
                name: "CK_AttendanceRecords_OvertimeHours_NonNegative",
                schema: "hr",
                table: "AttendanceRecords");

            migrationBuilder.DropCheckConstraint(
                name: "CK_AttendanceRecords_WorkHours_NonNegative",
                schema: "hr",
                table: "AttendanceRecords");

            migrationBuilder.AlterColumn<decimal>(
                name: "TaxableIncome",
                schema: "hr",
                table: "Payrolls",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2);

            migrationBuilder.AlterColumn<decimal>(
                name: "InsurableSalary",
                schema: "hr",
                table: "Payrolls",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2);

            migrationBuilder.AlterColumn<decimal>(
                name: "GrossPay",
                schema: "hr",
                table: "Payrolls",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CheckOutTime",
                schema: "hr",
                table: "AttendanceRecords",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CheckInTime",
                schema: "hr",
                table: "AttendanceRecords",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "CheckInLongitude",
                schema: "hr",
                table: "AttendanceRecords",
                type: "numeric",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(9,6)",
                oldPrecision: 9,
                oldScale: 6,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "CheckInLatitude",
                schema: "hr",
                table: "AttendanceRecords",
                type: "numeric",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(9,6)",
                oldPrecision: 9,
                oldScale: 6,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "ApprovedOvertimeHours",
                schema: "hr",
                table: "AttendanceRecords",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(8,2)",
                oldPrecision: 8,
                oldScale: 2);

            migrationBuilder.CreateIndex(
                name: "IX_Payrolls_EmployeeId_Year_Month",
                schema: "hr",
                table: "Payrolls",
                columns: new[] { "EmployeeId", "Year", "Month" });

            migrationBuilder.CreateIndex(
                name: "IX_Employees_Email",
                schema: "hr",
                table: "Employees",
                column: "Email");
        }
    }
}
