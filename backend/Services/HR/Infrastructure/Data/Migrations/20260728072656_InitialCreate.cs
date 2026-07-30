using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace HR.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "hr");

            migrationBuilder.CreateTable(
                name: "ApprovalRequests",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    ReferenceId = table.Column<Guid>(type: "uuid", nullable: false),
                    RequesterId = table.Column<Guid>(type: "uuid", nullable: false),
                    ApproverId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    RequesterName = table.Column<string>(type: "text", nullable: true),
                    Comments = table.Column<string>(type: "text", nullable: true),
                    RejectionReason = table.Column<string>(type: "text", nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    DecidedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApprovalRequests", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AttendanceRecords",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    CheckInTime = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CheckOutTime = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    WorkHours = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    OvertimeHours = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    IpAddress = table.Column<string>(type: "text", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AttendanceRecords", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Employees",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FullName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Department = table.Column<string>(type: "text", nullable: false),
                    Position = table.Column<string>(type: "text", nullable: false),
                    HireDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    BaseSalary = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    EmployeeCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    IdCardNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Address = table.Column<string>(type: "text", nullable: true),
                    TerminationDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    TerminationReason = table.Column<string>(type: "text", nullable: true),
                    ProbationEndDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    BankAccount = table.Column<string>(type: "text", nullable: true),
                    BankName = table.Column<string>(type: "text", nullable: true),
                    EmergencyContact = table.Column<string>(type: "text", nullable: true),
                    EmergencyPhone = table.Column<string>(type: "text", nullable: true),
                    AvatarUrl = table.Column<string>(type: "text", nullable: true),
                    Skills = table.Column<string>(type: "text", nullable: true),
                    Certifications = table.Column<string>(type: "text", nullable: true),
                    HourlyRate = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    ReportingToId = table.Column<Guid>(type: "uuid", nullable: true),
                    UserId = table.Column<string>(type: "text", nullable: true),
                    DateOfBirth = table.Column<DateOnly>(type: "date", nullable: true),
                    Gender = table.Column<string>(type: "text", nullable: true),
                    TaxCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    SocialInsuranceNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    WorkLocation = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Employees", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "JobListings",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Requirements = table.Column<string>(type: "text", nullable: false),
                    Benefits = table.Column<string>(type: "text", nullable: false),
                    Department = table.Column<string>(type: "text", nullable: false),
                    Location = table.Column<string>(type: "text", nullable: false),
                    JobType = table.Column<string>(type: "text", nullable: false),
                    SalaryRangeMin = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    SalaryRangeMax = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    ExpiryDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobListings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LeaveRequests",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    Days = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    Reason = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ApprovedBy = table.Column<string>(type: "text", nullable: true),
                    RejectReason = table.Column<string>(type: "text", nullable: true),
                    RejectedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    RejectedBy = table.Column<string>(type: "text", nullable: true),
                    CancelledAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    HandoverNotes = table.Column<string>(type: "text", nullable: true),
                    HandoverTo = table.Column<string>(type: "text", nullable: true),
                    ContactDuringLeave = table.Column<string>(type: "text", nullable: true),
                    IsPaidLeave = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeaveRequests", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ShiftAssignments",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ShiftId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ActualStartTime = table.Column<TimeSpan>(type: "interval", nullable: true),
                    ActualEndTime = table.Column<TimeSpan>(type: "interval", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    ActualHoursWorked = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: true),
                    CheckInAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CheckOutAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CheckInIp = table.Column<string>(type: "text", nullable: true),
                    CheckOutIp = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShiftAssignments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Shifts",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    StartTime = table.Column<TimeSpan>(type: "interval", nullable: false),
                    EndTime = table.Column<TimeSpan>(type: "interval", nullable: false),
                    BreakDurationMinutes = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    ColorCode = table.Column<string>(type: "text", nullable: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Shifts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Timesheets",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    CheckIn = table.Column<TimeSpan>(type: "interval", nullable: true),
                    CheckOut = table.Column<TimeSpan>(type: "interval", nullable: true),
                    TotalHours = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    RejectionReason = table.Column<string>(type: "text", nullable: true),
                    ApprovedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    RegularHours = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    OvertimeHours = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Timesheets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Payrolls",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Month = table.Column<int>(type: "integer", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    BaseSalary = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Deductions = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Bonuses = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    NetPay = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    RegularHours = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    OvertimeHours = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    OvertimePay = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TaxDeduction = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    InsuranceDeduction = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    OtherDeductions = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    PerformanceBonus = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    AttendanceBonus = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CalculatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    PaidAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ApprovedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    ProcessedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payrolls", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Payrolls_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalSchema: "hr",
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                schema: "hr",
                table: "JobListings",
                columns: new[] { "Id", "Benefits", "CreatedAt", "Department", "Description", "ExpiryDate", "JobType", "Location", "Requirements", "SalaryRangeMax", "SalaryRangeMin", "Status", "Title", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("00000000-0000-0000-0000-000000000001"), "- Lương cứng + phụ cấp tay nghề.\n- Được đào tạo chuyên sâu về phần cứng đời mới nhất.\n- Môi trường làm việc năng động, tiếp xúc với linh kiện cao cấp.", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Kỹ thuật", "Chúng tôi đang tìm kiếm kỹ thuật viên có kinh nghiệm trong việc lắp ráp máy tính chơi game, máy bộ văn phòng và cài đặt phần mềm. Công việc bao gồm tư vấn cấu hình cho khách hàng, lắp ráp hoàn thiện máy tính và cài đặt hệ điều hành.", new DateTime(2027, 12, 31, 0, 0, 0, 0, DateTimeKind.Utc), "Full-time", "Hồ Chí Minh", "- Có kiến thức về phần cứng máy tính (CPU, GPU, Mainboard, RAM...).\n- Biết lắp ráp máy tính thẩm mỹ (đi dây gọn gàng).\n- Biết cài đặt Windows, Driver và các phần mềm cơ bản.\n- Cẩn thận, tỉ mỉ trong công việc.", 12000000m, 8000000m, 1, "Kỹ thuật viên máy tính (Lắp ráp & Cài đặt)", null },
                    { new Guid("00000000-0000-0000-0000-000000000002"), "- Lương cứng + Hoa hồng doanh số cao.\n- Thưởng lễ, tết và tháng lương 13.\n- Chế độ bảo hiểm đầy đủ theo quy định của nhà nước.", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Kinh doanh", "Tư vấn khách hàng về các sản phẩm laptop, linh kiện máy tính và thiết bị ngoại vi tại showroom của Quang Hưởng Computer.", new DateTime(2027, 12, 31, 0, 0, 0, 0, DateTimeKind.Utc), "Full-time", "Hồ Chí Minh", "- Giao tiếp tốt, ngoại hình ưa nhìn.\n- Am hiểu về các dòng laptop và linh kiện máy tính là một lợi thế lớn.\n- Có khả năng thuyết phục khách hàng và làm việc theo nhóm.", 15000000m, 7000000m, 1, "Nhân viên bán hàng (Showroom)", null },
                    { new Guid("00000000-0000-0000-0000-000000000003"), "- Lương cao theo tay nghề.\n- Phụ cấp ăn trưa tại công ty.\n- Nghỉ chủ nhật và các ngày lễ theo quy định.", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Kỹ thuật", "Sửa chữa phần cứng laptop, thay thế linh kiện, xử lý các lỗi mainboard cho khách hàng.", new DateTime(2027, 12, 31, 0, 0, 0, 0, DateTimeKind.Utc), "Full-time", "Hồ Chí Minh", "- Có kinh nghiệm sửa chữa phần cứng laptop ít nhất 1 năm.\n- Biết sử dụng máy khò, máy hàn, đồng hồ đo và đọc sơ đồ mạch mainboard.\n- Trung thực, trách nhiệm với công việc.", 18000000m, 10000000m, 1, "Kỹ thuật viên sửa chữa Laptop", null },
                    { new Guid("00000000-0000-0000-0000-000000000004"), "- Môi trường làm việc sáng tạo, không gò bó.\n- Được trải nghiệm sớm các sản phẩm công nghệ mới nhất.\n- Lương thưởng xứng đáng theo năng suất.", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Marketing", "Lên kế hoạch nội dung cho Fanpage, Website và các kênh mạng xã hội. Viết bài review sản phẩm công nghệ.", new DateTime(2027, 12, 31, 0, 0, 0, 0, DateTimeKind.Utc), "Full-time", "Hồ Chí Minh", "- Sử dụng tốt các công cụ thiết kế cơ bản (Photoshop, Canva).\n- Có kỹ năng viết lách, sáng tạo nội dung thu hút.\n- Yêu thích và am hiểu về đồ công nghệ, gaming gear.", 14000000m, 9000000m, 1, "Chuyên viên Marketing & Content", null },
                    { new Guid("00000000-0000-0000-0000-000000000005"), "- Phụ cấp xăng xe và điện thoại hàng tháng.\n- Thưởng theo sản lượng đơn hàng giao thành công.\n- Chế độ bảo hiểm tai nạn đầy đủ.", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Logistics", "Giao hàng từ showroom đến địa chỉ khách hàng trong khu vực nội thành. Hỗ trợ khách hàng kiểm tra sản phẩm khi giao.", new DateTime(2027, 12, 31, 0, 0, 0, 0, DateTimeKind.Utc), "Full-time", "Hồ Chí Minh", "- Có xe máy riêng và thông thuộc đường phố Hồ Chí Minh.\n- Sức khỏe tốt, tính tình thật thà.\n- Có điện thoại smartphone để liên lạc và sử dụng app giao hàng.", 10000000m, 7000000m, 1, "Nhân viên vận chuyển & Giao nhận", null },
                    { new Guid("00000000-0000-0000-0000-000000000006"), "- Môi trường làm việc văn phòng máy lạnh mát mẻ.\n- Chế độ thâm niên, tăng lương hàng năm.\n- Được đào tạo về các nghiệp vụ kế toán chuyên sâu của ngành bán lẻ công nghệ.", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Kế toán", "Quản lý hóa đơn, chứng từ bán hàng. Theo dõi kho hàng và đối soát công nợ khách hàng, nhà cung cấp.", new DateTime(2027, 12, 31, 0, 0, 0, 0, DateTimeKind.Utc), "Full-time", "Hồ Chí Minh", "- Tốt nghiệp chuyên ngành Kế toán.\n- Thành thạo Excel và các phần mềm kế toán thông dụng.\n- Cẩn thận, trung thực, có trí nhớ tốt.", 12000000m, 8000000m, 1, "Kế toán bán hàng", null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_ApprovalRequests_RequesterId",
                schema: "hr",
                table: "ApprovalRequests",
                column: "RequesterId");

            migrationBuilder.CreateIndex(
                name: "IX_ApprovalRequests_Status_SubmittedAt",
                schema: "hr",
                table: "ApprovalRequests",
                columns: new[] { "Status", "SubmittedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceRecords_Date",
                schema: "hr",
                table: "AttendanceRecords",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceRecords_EmployeeId_Date",
                schema: "hr",
                table: "AttendanceRecords",
                columns: new[] { "EmployeeId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Employee_Department_Status",
                schema: "hr",
                table: "Employees",
                columns: new[] { "Department", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Employees_Email",
                schema: "hr",
                table: "Employees",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_Employees_EmployeeCode",
                schema: "hr",
                table: "Employees",
                column: "EmployeeCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Employees_Status_HireDate",
                schema: "hr",
                table: "Employees",
                columns: new[] { "Status", "HireDate" });

            migrationBuilder.CreateIndex(
                name: "IX_JobListings_Department",
                schema: "hr",
                table: "JobListings",
                column: "Department");

            migrationBuilder.CreateIndex(
                name: "IX_JobListings_Status",
                schema: "hr",
                table: "JobListings",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_LeaveRequests_EmployeeId_StartDate",
                schema: "hr",
                table: "LeaveRequests",
                columns: new[] { "EmployeeId", "StartDate" });

            migrationBuilder.CreateIndex(
                name: "IX_LeaveRequests_StartDate_EndDate",
                schema: "hr",
                table: "LeaveRequests",
                columns: new[] { "StartDate", "EndDate" });

            migrationBuilder.CreateIndex(
                name: "IX_LeaveRequests_Status_StartDate",
                schema: "hr",
                table: "LeaveRequests",
                columns: new[] { "Status", "StartDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Payrolls_EmployeeId_Year_Month",
                schema: "hr",
                table: "Payrolls",
                columns: new[] { "EmployeeId", "Year", "Month" });

            migrationBuilder.CreateIndex(
                name: "IX_ShiftAssignment_Employee_Date",
                schema: "hr",
                table: "ShiftAssignments",
                columns: new[] { "EmployeeId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_ShiftAssignments_Date_Status",
                schema: "hr",
                table: "ShiftAssignments",
                columns: new[] { "Date", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ShiftAssignments_ShiftId_Date",
                schema: "hr",
                table: "ShiftAssignments",
                columns: new[] { "ShiftId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_Shifts_IsActive_DisplayOrder",
                schema: "hr",
                table: "Shifts",
                columns: new[] { "IsActive", "DisplayOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_Timesheets_EmployeeId_Date",
                schema: "hr",
                table: "Timesheets",
                columns: new[] { "EmployeeId", "Date" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ApprovalRequests",
                schema: "hr");

            migrationBuilder.DropTable(
                name: "AttendanceRecords",
                schema: "hr");

            migrationBuilder.DropTable(
                name: "JobListings",
                schema: "hr");

            migrationBuilder.DropTable(
                name: "LeaveRequests",
                schema: "hr");

            migrationBuilder.DropTable(
                name: "Payrolls",
                schema: "hr");

            migrationBuilder.DropTable(
                name: "ShiftAssignments",
                schema: "hr");

            migrationBuilder.DropTable(
                name: "Shifts",
                schema: "hr");

            migrationBuilder.DropTable(
                name: "Timesheets",
                schema: "hr");

            migrationBuilder.DropTable(
                name: "Employees",
                schema: "hr");
        }
    }
}
