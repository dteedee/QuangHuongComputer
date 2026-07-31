using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HR.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPhase06TaxEmployeeContract : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "GrossPay",
                schema: "hr",
                table: "Payrolls",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "InsurableSalary",
                schema: "hr",
                table: "Payrolls",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "NumberOfDependents",
                schema: "hr",
                table: "Payrolls",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "PayrollRunId",
                schema: "hr",
                table: "Payrolls",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TaxableIncome",
                schema: "hr",
                table: "Payrolls",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "IdCardIssueDate",
                schema: "hr",
                table: "Employees",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IdCardIssuePlace",
                schema: "hr",
                table: "Employees",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "NumberOfDependents",
                schema: "hr",
                table: "Employees",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "StoreId",
                schema: "hr",
                table: "Employees",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ApprovedOvertimeHours",
                schema: "hr",
                table: "AttendanceRecords",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "CheckInDeviceId",
                schema: "hr",
                table: "AttendanceRecords",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CheckInLatitude",
                schema: "hr",
                table: "AttendanceRecords",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CheckInLongitude",
                schema: "hr",
                table: "AttendanceRecords",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CheckInMethod",
                schema: "hr",
                table: "AttendanceRecords",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "EarlyLeaveMinutes",
                schema: "hr",
                table: "AttendanceRecords",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsManualEntry",
                schema: "hr",
                table: "AttendanceRecords",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "LateMinutes",
                schema: "hr",
                table: "AttendanceRecords",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "ManualBy",
                schema: "hr",
                table: "AttendanceRecords",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ManualReason",
                schema: "hr",
                table: "AttendanceRecords",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ShiftAssignmentId",
                schema: "hr",
                table: "AttendanceRecords",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "StoreId",
                schema: "hr",
                table: "AttendanceRecords",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Allowances",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    AllowanceTypeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    EffectiveDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Allowances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Allowances_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalSchema: "hr",
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AllowanceTypes",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    TaxFreeMonthlyLimit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    IsTaxable = table.Column<bool>(type: "boolean", nullable: false),
                    IsInsurable = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AllowanceTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AttendanceRules",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StoreId = table.Column<Guid>(type: "uuid", nullable: true),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    LateToleranceMinutes = table.Column<int>(type: "integer", nullable: false),
                    LateFineMoneyPerMinute = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    HalfDayThresholdMinutes = table.Column<int>(type: "integer", nullable: false),
                    EarlyLeaveToleranceMinutes = table.Column<int>(type: "integer", nullable: false),
                    OvertimeWeekdayRate = table.Column<decimal>(type: "numeric(6,4)", precision: 6, scale: 4, nullable: false),
                    OvertimeSundayRate = table.Column<decimal>(type: "numeric(6,4)", precision: 6, scale: 4, nullable: false),
                    OvertimeHolidayRate = table.Column<decimal>(type: "numeric(6,4)", precision: 6, scale: 4, nullable: false),
                    OvertimeNightBonus = table.Column<decimal>(type: "numeric(6,4)", precision: 6, scale: 4, nullable: false),
                    NightStartTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    NightEndTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    GpsRadiusMeters = table.Column<int>(type: "integer", nullable: false),
                    StandardWorkHoursPerDay = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    EffectiveFrom = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AttendanceRules", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Dependents",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    FullName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Relation = table.Column<int>(type: "integer", nullable: false),
                    BirthDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    TaxCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    DeductionStartDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    DeductionEndDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Dependents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Dependents_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalSchema: "hr",
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EmployeeAssets",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssetType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    AssetCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SerialNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    InventorySerialId = table.Column<Guid>(type: "uuid", nullable: true),
                    AssignedDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    ConditionOnAssign = table.Column<int>(type: "integer", nullable: false),
                    Value = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    ReturnedDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ConditionOnReturn = table.Column<int>(type: "integer", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    AssignedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    ReceivedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployeeAssets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EmploymentContracts",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContractNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ContractSalary = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    InsurableSalary = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    DocumentUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    TerminatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    TerminationReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmploymentContracts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmploymentContracts_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalSchema: "hr",
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MonthlyTimesheets",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    Month = table.Column<int>(type: "integer", nullable: false),
                    StandardWorkDays = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    ActualWorkDays = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    AbsentDays = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    HalfDays = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    OvertimeHoursWeekday = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    OvertimeHoursSunday = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    OvertimeHoursHoliday = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    OvertimeHoursNight = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    TotalLateMinutes = table.Column<int>(type: "integer", nullable: false),
                    TotalEarlyLeaveMinutes = table.Column<int>(type: "integer", nullable: false),
                    LeaveDaysPaid = table.Column<int>(type: "integer", nullable: false),
                    LeaveDaysUnpaid = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    LockedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    LockedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MonthlyTimesheets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OvertimeRequests",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    StartTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    EndTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    RequestedHours = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ApprovedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    RejectReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ActualHours = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OvertimeRequests", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PayrollLineItems",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PayrollId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    IsTaxable = table.Column<bool>(type: "boolean", nullable: false),
                    IsInsurable = table.Column<bool>(type: "boolean", nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    Metadata = table.Column<string>(type: "jsonb", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PayrollLineItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PayrollLineItems_Payrolls_PayrollId",
                        column: x => x.PayrollId,
                        principalSchema: "hr",
                        principalTable: "Payrolls",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PayrollRuns",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    Month = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CalculatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    PaidAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ApprovedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    PaidBy = table.Column<Guid>(type: "uuid", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    EmployeeCount = table.Column<int>(type: "integer", nullable: false),
                    TotalGrossPay = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalNetPay = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalTax = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalInsurance = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PayrollRuns", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SalaryStructures",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    BaseSalary = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    InsurableSalary = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Coefficient = table.Column<decimal>(type: "numeric(10,4)", precision: 10, scale: 4, nullable: true),
                    EffectiveDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    Note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalaryStructures", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SalaryStructures_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalSchema: "hr",
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Employee_StoreId",
                schema: "hr",
                table: "Employees",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_Allowance_Employee_Effective",
                schema: "hr",
                table: "Allowances",
                columns: new[] { "EmployeeId", "EffectiveDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Allowance_EmployeeId",
                schema: "hr",
                table: "Allowances",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_AllowanceTypes_Code",
                schema: "hr",
                table: "AllowanceTypes",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceRules_EffectiveFrom",
                schema: "hr",
                table: "AttendanceRules",
                column: "EffectiveFrom");

            migrationBuilder.CreateIndex(
                name: "IX_Dependent_Employee_Active",
                schema: "hr",
                table: "Dependents",
                columns: new[] { "EmployeeId", "DeductionEndDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Dependent_EmployeeId",
                schema: "hr",
                table: "Dependents",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeAsset_EmployeeId",
                schema: "hr",
                table: "EmployeeAssets",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeAssets_AssetCode",
                schema: "hr",
                table: "EmployeeAssets",
                column: "AssetCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Contract_EmployeeId",
                schema: "hr",
                table: "EmploymentContracts",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_Contract_Type_EndDate",
                schema: "hr",
                table: "EmploymentContracts",
                columns: new[] { "Type", "EndDate" });

            migrationBuilder.CreateIndex(
                name: "IX_EmploymentContracts_ContractNumber",
                schema: "hr",
                table: "EmploymentContracts",
                column: "ContractNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MonthlyTimesheets_EmployeeId_Year_Month",
                schema: "hr",
                table: "MonthlyTimesheets",
                columns: new[] { "EmployeeId", "Year", "Month" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OvertimeRequests_EmployeeId_Date",
                schema: "hr",
                table: "OvertimeRequests",
                columns: new[] { "EmployeeId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_PayrollLineItems_PayrollId",
                schema: "hr",
                table: "PayrollLineItems",
                column: "PayrollId");

            migrationBuilder.CreateIndex(
                name: "IX_PayrollRuns_Year_Month",
                schema: "hr",
                table: "PayrollRuns",
                columns: new[] { "Year", "Month" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SalaryStructure_Employee_Effective",
                schema: "hr",
                table: "SalaryStructures",
                columns: new[] { "EmployeeId", "EffectiveDate" });

            migrationBuilder.CreateIndex(
                name: "IX_SalaryStructure_EmployeeId",
                schema: "hr",
                table: "SalaryStructures",
                column: "EmployeeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Allowances",
                schema: "hr");

            migrationBuilder.DropTable(
                name: "AllowanceTypes",
                schema: "hr");

            migrationBuilder.DropTable(
                name: "AttendanceRules",
                schema: "hr");

            migrationBuilder.DropTable(
                name: "Dependents",
                schema: "hr");

            migrationBuilder.DropTable(
                name: "EmployeeAssets",
                schema: "hr");

            migrationBuilder.DropTable(
                name: "EmploymentContracts",
                schema: "hr");

            migrationBuilder.DropTable(
                name: "MonthlyTimesheets",
                schema: "hr");

            migrationBuilder.DropTable(
                name: "OvertimeRequests",
                schema: "hr");

            migrationBuilder.DropTable(
                name: "PayrollLineItems",
                schema: "hr");

            migrationBuilder.DropTable(
                name: "PayrollRuns",
                schema: "hr");

            migrationBuilder.DropTable(
                name: "SalaryStructures",
                schema: "hr");

            migrationBuilder.DropIndex(
                name: "IX_Employee_StoreId",
                schema: "hr",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "GrossPay",
                schema: "hr",
                table: "Payrolls");

            migrationBuilder.DropColumn(
                name: "InsurableSalary",
                schema: "hr",
                table: "Payrolls");

            migrationBuilder.DropColumn(
                name: "NumberOfDependents",
                schema: "hr",
                table: "Payrolls");

            migrationBuilder.DropColumn(
                name: "PayrollRunId",
                schema: "hr",
                table: "Payrolls");

            migrationBuilder.DropColumn(
                name: "TaxableIncome",
                schema: "hr",
                table: "Payrolls");

            migrationBuilder.DropColumn(
                name: "IdCardIssueDate",
                schema: "hr",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "IdCardIssuePlace",
                schema: "hr",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "NumberOfDependents",
                schema: "hr",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "StoreId",
                schema: "hr",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "ApprovedOvertimeHours",
                schema: "hr",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "CheckInDeviceId",
                schema: "hr",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "CheckInLatitude",
                schema: "hr",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "CheckInLongitude",
                schema: "hr",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "CheckInMethod",
                schema: "hr",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "EarlyLeaveMinutes",
                schema: "hr",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "IsManualEntry",
                schema: "hr",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "LateMinutes",
                schema: "hr",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "ManualBy",
                schema: "hr",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "ManualReason",
                schema: "hr",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "ShiftAssignmentId",
                schema: "hr",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "StoreId",
                schema: "hr",
                table: "AttendanceRecords");
        }
    }
}
