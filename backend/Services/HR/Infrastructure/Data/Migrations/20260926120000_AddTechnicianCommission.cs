using System;
using HR.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HR.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    /// <summary>
    /// Hoa hồng kỹ thuật: mức riêng theo nhân viên (có lịch sử hiệu lực) + sổ hoa hồng phát sinh từ
    /// phiếu sửa đã thu tiền, trả qua bảng lương. [Migration]/[DbContext] gắn trực tiếp (không có
    /// Designer.cs) theo quy ước của Content 20260926090000_AddUrlRedirects: qh-build.sh không có
    /// sub-command cho `dotnet ef`, model snapshot được cập nhật tay cho khớp.
    /// </summary>
    [DbContext(typeof(HRDbContext))]
    [Migration("20260926120000_AddTechnicianCommission")]
    public partial class AddTechnicianCommission : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CommissionPolicies",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    LaborPercent = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    FixedAmountPerJob = table.Column<decimal>(type: "numeric(18,0)", precision: 18, scale: 0, nullable: false),
                    EffectiveFrom = table.Column<DateOnly>(type: "date", nullable: false),
                    Note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommissionPolicies", x => x.Id);
                    table.CheckConstraint("CK_CommissionPolicies_FixedAmount", "\"FixedAmountPerJob\" >= 0");
                    table.CheckConstraint("CK_CommissionPolicies_LaborPercent", "\"LaborPercent\" >= 0 AND \"LaborPercent\" <= 100");
                });

            migrationBuilder.CreateTable(
                name: "CommissionEntries",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    SourceType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SourceId = table.Column<Guid>(type: "uuid", nullable: false),
                    SourceReference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    BaseAmount = table.Column<decimal>(type: "numeric(18,0)", precision: 18, scale: 0, nullable: false),
                    RatePercent = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    FixedAmount = table.Column<decimal>(type: "numeric(18,0)", precision: 18, scale: 0, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,0)", precision: 18, scale: 0, nullable: false),
                    Period = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false),
                    EarnedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ApprovedBy = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ReversedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ReversalReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    PayrollId = table.Column<Guid>(type: "uuid", nullable: true),
                    PaidAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommissionEntries", x => x.Id);
                    table.CheckConstraint("CK_CommissionEntries_AmountSign", "(\"SourceType\" = 'RepairWorkOrderClawback' AND \"Amount\" < 0) OR (\"SourceType\" <> 'RepairWorkOrderClawback' AND \"Amount\" > 0)");
                    table.CheckConstraint("CK_CommissionEntries_Period", "\"Period\" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'");
                });

            migrationBuilder.CreateIndex(
                name: "IX_CommissionPolicies_Employee_EffectiveFrom",
                schema: "hr",
                table: "CommissionPolicies",
                columns: new[] { "EmployeeId", "EffectiveFrom" });

            migrationBuilder.CreateIndex(
                name: "IX_CommissionEntries_Employee_Status",
                schema: "hr",
                table: "CommissionEntries",
                columns: new[] { "EmployeeId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_CommissionEntries_PayrollId",
                schema: "hr",
                table: "CommissionEntries",
                column: "PayrollId");

            migrationBuilder.CreateIndex(
                name: "IX_CommissionEntries_Period_Status",
                schema: "hr",
                table: "CommissionEntries",
                columns: new[] { "Period", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_CommissionEntries_Source_Unique",
                schema: "hr",
                table: "CommissionEntries",
                columns: new[] { "SourceType", "SourceId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CommissionEntries",
                schema: "hr");

            migrationBuilder.DropTable(
                name: "CommissionPolicies",
                schema: "hr");
        }
    }
}
