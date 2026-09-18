using Microsoft.EntityFrameworkCore;
using HR.Domain;
using BuildingBlocks.Database;

namespace HR.Infrastructure;

public class HRDbContext : DbContext
{
    public HRDbContext(DbContextOptions<HRDbContext> options) : base(options) { }

    // Seed data must be deterministic, otherwise every "migrations add" detects a model change
    private static readonly DateTime SeedCreatedAt = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Unspecified);
    private static readonly DateTime SeedExpiryDate = new(2027, 12, 31, 0, 0, 0, DateTimeKind.Unspecified);

    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<Timesheet> Timesheets => Set<Timesheet>();
    public DbSet<Payroll> Payrolls => Set<Payroll>();
    public DbSet<Shift> Shifts => Set<Shift>();
    public DbSet<ShiftAssignment> ShiftAssignments => Set<ShiftAssignment>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
    public DbSet<JobListing> JobListings => Set<JobListing>();
    public DbSet<ApprovalRequest> ApprovalRequests => Set<ApprovalRequest>();
    public DbSet<AttendanceRecord> AttendanceRecords => Set<AttendanceRecord>();

    // ===== Phase 06 — Luồng A (Tax/Employee/Contract) =====
    public DbSet<Dependent> Dependents => Set<Dependent>();
    public DbSet<EmploymentContract> EmploymentContracts => Set<EmploymentContract>();
    public DbSet<SalaryStructure> SalaryStructures => Set<SalaryStructure>();
    public DbSet<AllowanceType> AllowanceTypes => Set<AllowanceType>();
    public DbSet<Allowance> Allowances => Set<Allowance>();

    // ===== Phase 06 — Luồng B (Attendance/Payroll extension) DbSets =====
    // Entity file đã do luồng B tạo — luồng A cấu hình DbSet + mapping để migration bao phủ.
    public DbSet<AttendanceRule> AttendanceRules => Set<AttendanceRule>();
    public DbSet<OvertimeRequest> OvertimeRequests => Set<OvertimeRequest>();
    public DbSet<PayrollRun> PayrollRuns => Set<PayrollRun>();
    public DbSet<PayrollLineItem> PayrollLineItems => Set<PayrollLineItem>();
    public DbSet<EmployeeAsset> EmployeeAssets => Set<EmployeeAsset>();
    public DbSet<MonthlyTimesheet> MonthlyTimesheets => Set<MonthlyTimesheet>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("hr");
        base.OnModelCreating(modelBuilder);
        
        // Employee configuration
        modelBuilder.Entity<Employee>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.BaseSalary).HasPrecision(18, 2);
            entity.Property(e => e.HourlyRate).HasPrecision(18, 2);
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Employees_BaseSalary_NonNegative", "\"BaseSalary\" >= 0");
                t.HasCheckConstraint("CK_Employees_HourlyRate_NonNegative", "\"HourlyRate\" >= 0");
            });
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Phone).IsRequired().HasMaxLength(20);
            entity.Property(e => e.EmployeeCode).HasMaxLength(50);
            entity.Property(e => e.IdCardNumber).HasMaxLength(50);
            entity.Property(e => e.TaxCode).HasMaxLength(50);
            entity.Property(e => e.SocialInsuranceNumber).HasMaxLength(50);
            // Phase 06 fields
            entity.Property(e => e.IdCardIssuePlace).HasMaxLength(200);

            entity.HasIndex(e => e.EmployeeCode).IsUnique();
            // W1-11: email nhân sự là khoá nghiệp vụ (đăng nhập, phiếu lương, thuế TNCN) -
            // trước đây chỉ là index thường nên hai nhân viên trùng email vẫn tạo được.
            entity.HasIndex(e => e.Email).IsUnique().HasDatabaseName("IX_Employees_Email_Unique");
            entity.HasIndex(e => new { e.Department, e.Status })
                .HasDatabaseName("IX_Employee_Department_Status");
            entity.HasIndex(e => new { e.Status, e.HireDate });
            entity.HasIndex(e => e.StoreId).HasDatabaseName("IX_Employee_StoreId");
        });

        // ===== Phase 06 — Dependent =====
        modelBuilder.Entity<Dependent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.TaxCode).HasMaxLength(20);
            entity.HasIndex(e => e.EmployeeId).HasDatabaseName("IX_Dependent_EmployeeId");
            entity.HasIndex(e => new { e.EmployeeId, e.DeductionEndDate })
                .HasDatabaseName("IX_Dependent_Employee_Active");
        });

        // ===== Phase 06 — EmploymentContract =====
        modelBuilder.Entity<EmploymentContract>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ContractNumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.ContractSalary).HasPrecision(18, 2);
            entity.Property(e => e.InsurableSalary).HasPrecision(18, 2);
            entity.Property(e => e.DocumentUrl).HasMaxLength(500);
            entity.Property(e => e.TerminationReason).HasMaxLength(500);
            entity.HasIndex(e => e.EmployeeId).HasDatabaseName("IX_Contract_EmployeeId");
            entity.HasIndex(e => new { e.Type, e.EndDate }).HasDatabaseName("IX_Contract_Type_EndDate");
            entity.HasIndex(e => e.ContractNumber).IsUnique();
        });

        // ===== Phase 06 — SalaryStructure =====
        modelBuilder.Entity<SalaryStructure>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.BaseSalary).HasPrecision(18, 2);
            entity.Property(e => e.InsurableSalary).HasPrecision(18, 2);
            entity.Property(e => e.Coefficient).HasPrecision(10, 4);
            entity.Property(e => e.Note).HasMaxLength(500);
            entity.HasIndex(e => e.EmployeeId).HasDatabaseName("IX_SalaryStructure_EmployeeId");
            entity.HasIndex(e => new { e.EmployeeId, e.EffectiveDate })
                .HasDatabaseName("IX_SalaryStructure_Employee_Effective");
        });

        // ===== Phase 06 — AllowanceType =====
        modelBuilder.Entity<AllowanceType>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(30);
            entity.Property(e => e.TaxFreeMonthlyLimit).HasPrecision(18, 2);
            entity.HasIndex(e => e.Code).IsUnique();
        });

        // ===== Phase 06 — Allowance =====
        modelBuilder.Entity<Allowance>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.HasIndex(e => e.EmployeeId).HasDatabaseName("IX_Allowance_EmployeeId");
            entity.HasIndex(e => new { e.EmployeeId, e.EffectiveDate })
                .HasDatabaseName("IX_Allowance_Employee_Effective");
        });

        // ===== Phase 06 Luồng B pre-config (do luồng A cấu hình để migration bao phủ) =====
        modelBuilder.Entity<AttendanceRule>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.LateFineMoneyPerMinute).HasPrecision(18, 2);
            entity.Property(e => e.OvertimeWeekdayRate).HasPrecision(6, 4);
            entity.Property(e => e.OvertimeSundayRate).HasPrecision(6, 4);
            entity.Property(e => e.OvertimeHolidayRate).HasPrecision(6, 4);
            entity.Property(e => e.OvertimeNightBonus).HasPrecision(6, 4);
            entity.Property(e => e.StandardWorkHoursPerDay).HasPrecision(6, 2);
            entity.HasIndex(e => e.EffectiveFrom);
        });

        modelBuilder.Entity<OvertimeRequest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Reason).IsRequired().HasMaxLength(500);
            entity.Property(e => e.RequestedHours).HasPrecision(8, 2);
            entity.Property(e => e.ActualHours).HasPrecision(8, 2);
            entity.Property(e => e.RejectReason).HasMaxLength(500);
            entity.HasIndex(e => new { e.EmployeeId, e.Date });
        });

        modelBuilder.Entity<PayrollRun>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.TotalGrossPay).HasPrecision(18, 2);
            entity.Property(e => e.TotalNetPay).HasPrecision(18, 2);
            entity.Property(e => e.TotalTax).HasPrecision(18, 2);
            entity.Property(e => e.TotalInsurance).HasPrecision(18, 2);
            // 1-N tới Payroll qua backing field _payrolls; PayrollRunId đã tồn tại sẵn trên
            // bảng Payrolls (không cần migration) — trước đây bị Ignore nên .Include(r => r.Payrolls)
            // luôn throw runtime (payroll calculate/approve 500 ở mọi request).
            entity.HasMany(e => e.Payrolls)
                .WithOne()
                .HasForeignKey(p => p.PayrollRunId);
            entity.Navigation(e => e.Payrolls).UsePropertyAccessMode(PropertyAccessMode.Field);
            entity.HasIndex(e => new { e.Year, e.Month }).IsUnique();
        });

        modelBuilder.Entity<PayrollLineItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Metadata).HasColumnType("jsonb");
            entity.HasIndex(e => e.PayrollId);
        });

        modelBuilder.Entity<EmployeeAsset>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.AssetType).IsRequired().HasMaxLength(50);
            entity.Property(e => e.AssetCode).IsRequired().HasMaxLength(50);
            entity.Property(e => e.SerialNumber).HasMaxLength(100);
            entity.Property(e => e.Value).HasPrecision(18, 2);
            entity.HasIndex(e => e.EmployeeId).HasDatabaseName("IX_EmployeeAsset_EmployeeId");
            entity.HasIndex(e => e.AssetCode).IsUnique();
        });

        modelBuilder.Entity<MonthlyTimesheet>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.StandardWorkDays).HasPrecision(6, 2);
            entity.Property(e => e.ActualWorkDays).HasPrecision(6, 2);
            entity.Property(e => e.AbsentDays).HasPrecision(6, 2);
            entity.Property(e => e.HalfDays).HasPrecision(6, 2);
            entity.Property(e => e.OvertimeHoursWeekday).HasPrecision(8, 2);
            entity.Property(e => e.OvertimeHoursSunday).HasPrecision(8, 2);
            entity.Property(e => e.OvertimeHoursHoliday).HasPrecision(8, 2);
            entity.Property(e => e.OvertimeHoursNight).HasPrecision(8, 2);
            entity.HasIndex(e => new { e.EmployeeId, e.Year, e.Month }).IsUnique();
        });
        
        // Timesheet configuration
        modelBuilder.Entity<Timesheet>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TotalHours).HasPrecision(8, 2);
            entity.Property(e => e.RegularHours).HasPrecision(8, 2);
            entity.Property(e => e.OvertimeHours).HasPrecision(8, 2);

            entity.HasIndex(e => new { e.EmployeeId, e.Date });
        });

        // Payroll configuration (money = 18,2 / hours = 8,2)
        modelBuilder.Entity<Payroll>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.BaseSalary).HasPrecision(18, 2);
            entity.Property(e => e.Deductions).HasPrecision(18, 2);
            entity.Property(e => e.Bonuses).HasPrecision(18, 2);
            entity.Property(e => e.NetPay).HasPrecision(18, 2);
            entity.Property(e => e.OvertimePay).HasPrecision(18, 2);
            entity.Property(e => e.TaxDeduction).HasPrecision(18, 2);
            entity.Property(e => e.InsuranceDeduction).HasPrecision(18, 2);
            entity.Property(e => e.OtherDeductions).HasPrecision(18, 2);
            entity.Property(e => e.PerformanceBonus).HasPrecision(18, 2);
            entity.Property(e => e.AttendanceBonus).HasPrecision(18, 2);
            entity.Property(e => e.RegularHours).HasPrecision(8, 2);
            entity.Property(e => e.OvertimeHours).HasPrecision(8, 2);
            // W1-11 / audit db-schema-migrations-23: 3 cột lương còn là `numeric` không giới hạn.
            entity.Property(e => e.GrossPay).HasPrecision(18, 2);
            entity.Property(e => e.InsurableSalary).HasPrecision(18, 2);
            entity.Property(e => e.TaxableIncome).HasPrecision(18, 2);

            // W1-11: một nhân viên chỉ có ĐÚNG MỘT bảng lương cho mỗi tháng.
            // Trước đây chỉ là index thường -> chạy bảng lương hai lần tạo bản ghi trùng.
            entity.HasIndex(e => new { e.EmployeeId, e.Year, e.Month })
                .IsUnique()
                .HasDatabaseName("IX_Payrolls_Employee_Year_Month_Unique");

            entity.HasIndex(e => e.PayrollRunId).HasDatabaseName("IX_Payrolls_PayrollRunId");

            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Payrolls_BaseSalary_NonNegative", "\"BaseSalary\" >= 0");
                t.HasCheckConstraint("CK_Payrolls_GrossPay_NonNegative", "\"GrossPay\" >= 0");
                t.HasCheckConstraint("CK_Payrolls_NetPay_NonNegative", "\"NetPay\" >= 0");
                t.HasCheckConstraint("CK_Payrolls_InsurableSalary_NonNegative", "\"InsurableSalary\" >= 0");
                t.HasCheckConstraint("CK_Payrolls_TaxableIncome_NonNegative", "\"TaxableIncome\" >= 0");
                t.HasCheckConstraint("CK_Payrolls_Month_Range", "\"Month\" >= 1 AND \"Month\" <= 12");
                t.HasCheckConstraint("CK_Payrolls_Year_Range", "\"Year\" >= 2000 AND \"Year\" <= 2100");
            });
        });

        // Shift configuration
        modelBuilder.Entity<Shift>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.BreakDurationMinutes).HasPrecision(6, 2);

            entity.HasIndex(e => new { e.IsActive, e.DisplayOrder });
        });
        
        // ShiftAssignment configuration
        modelBuilder.Entity<ShiftAssignment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ActualHoursWorked).HasPrecision(8, 2);
            
            entity.HasIndex(e => new { e.EmployeeId, e.Date })
                .HasDatabaseName("IX_ShiftAssignment_Employee_Date");
                
            entity.HasIndex(e => new { e.ShiftId, e.Date });
            entity.HasIndex(e => new { e.Date, e.Status });
        });
        
        // LeaveRequest configuration
        modelBuilder.Entity<LeaveRequest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Days).HasPrecision(8, 2);
            
            entity.HasIndex(e => new { e.EmployeeId, e.StartDate });
            entity.HasIndex(e => new { e.Status, e.StartDate });
            entity.HasIndex(e => new { e.StartDate, e.EndDate });
        });

        // ApprovalRequest configuration
        modelBuilder.Entity<ApprovalRequest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.Status, e.SubmittedAt });
            entity.HasIndex(e => e.RequesterId);
        });

        // AttendanceRecord configuration
        modelBuilder.Entity<AttendanceRecord>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.WorkHours).HasPrecision(8, 2);
            entity.Property(e => e.OvertimeHours).HasPrecision(8, 2);
            // W1-11 / audit db-schema-migrations-23: 3 cột numeric còn thả nổi.
            entity.Property(e => e.ApprovedOvertimeHours).HasPrecision(8, 2);
            entity.Property(e => e.CheckInLatitude).HasPrecision(9, 6);
            entity.Property(e => e.CheckInLongitude).HasPrecision(9, 6);
            // Giờ vào/ra là MỘT THỜI ĐIỂM (so sánh với ca làm, tính đi muộn/về sớm) nên phải là
            // timestamptz. `Date` KHÔNG đổi: nó là NGÀY công, không phải thời điểm, và khoá
            // duy nhất (EmployeeId, Date) sẽ đổi nghĩa nếu quy đổi múi giờ.
            entity.Property(e => e.CheckInTime).HasColumnType("timestamp with time zone");
            entity.Property(e => e.CheckOutTime).HasColumnType("timestamp with time zone");
            entity.HasIndex(e => new { e.EmployeeId, e.Date }).IsUnique();
            entity.HasIndex(e => e.Date);
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_AttendanceRecords_WorkHours_NonNegative", "\"WorkHours\" >= 0");
                t.HasCheckConstraint("CK_AttendanceRecords_OvertimeHours_NonNegative", "\"OvertimeHours\" >= 0");
                t.HasCheckConstraint(
                    "CK_AttendanceRecords_CheckOut_AfterCheckIn",
                    "\"CheckOutTime\" IS NULL OR \"CheckInTime\" IS NULL OR \"CheckOutTime\" >= \"CheckInTime\"");
            });
        });

        // JobListing configuration
        modelBuilder.Entity<JobListing>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).IsRequired();
            entity.Property(e => e.SalaryRangeMin).HasPrecision(18, 2);
            entity.Property(e => e.SalaryRangeMax).HasPrecision(18, 2);
            
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.Department);

            // Seed recruitment data
            entity.HasData(
                new
                {
                    Id = Guid.Parse("00000000-0000-0000-0000-000000000001"),
                    Title = "Kỹ thuật viên máy tính (Lắp ráp & Cài đặt)",
                    Description = "Chúng tôi đang tìm kiếm kỹ thuật viên có kinh nghiệm trong việc lắp ráp máy tính chơi game, máy bộ văn phòng và cài đặt phần mềm. Công việc bao gồm tư vấn cấu hình cho khách hàng, lắp ráp hoàn thiện máy tính và cài đặt hệ điều hành.",
                    Requirements = "- Có kiến thức về phần cứng máy tính (CPU, GPU, Mainboard, RAM...).\n- Biết lắp ráp máy tính thẩm mỹ (đi dây gọn gàng).\n- Biết cài đặt Windows, Driver và các phần mềm cơ bản.\n- Cẩn thận, tỉ mỉ trong công việc.",
                    Benefits = "- Lương cứng + phụ cấp tay nghề.\n- Được đào tạo chuyên sâu về phần cứng đời mới nhất.\n- Môi trường làm việc năng động, tiếp xúc với linh kiện cao cấp.",
                    Department = "Kỹ thuật",
                    Location = "Hồ Chí Minh",
                    JobType = "Full-time",
                    ExpiryDate = SeedExpiryDate,
                    SalaryRangeMin = 8000000m,
                    SalaryRangeMax = 12000000m,
                    Status = JobStatus.Active,
                    CreatedAt = SeedCreatedAt
                },
                new
                {
                    Id = Guid.Parse("00000000-0000-0000-0000-000000000002"),
                    Title = "Nhân viên bán hàng (Showroom)",
                    Description = "Tư vấn khách hàng về các sản phẩm laptop, linh kiện máy tính và thiết bị ngoại vi tại showroom của Quang Hưởng Computer.",
                    Requirements = "- Giao tiếp tốt, ngoại hình ưa nhìn.\n- Am hiểu về các dòng laptop và linh kiện máy tính là một lợi thế lớn.\n- Có khả năng thuyết phục khách hàng và làm việc theo nhóm.",
                    Benefits = "- Lương cứng + Hoa hồng doanh số cao.\n- Thưởng lễ, tết và tháng lương 13.\n- Chế độ bảo hiểm đầy đủ theo quy định của nhà nước.",
                    Department = "Kinh doanh",
                    Location = "Hồ Chí Minh",
                    JobType = "Full-time",
                    ExpiryDate = SeedExpiryDate,
                    SalaryRangeMin = 7000000m,
                    SalaryRangeMax = 15000000m,
                    Status = JobStatus.Active,
                    CreatedAt = SeedCreatedAt
                },
                new
                {
                    Id = Guid.Parse("00000000-0000-0000-0000-000000000003"),
                    Title = "Kỹ thuật viên sửa chữa Laptop",
                    Description = "Sửa chữa phần cứng laptop, thay thế linh kiện, xử lý các lỗi mainboard cho khách hàng.",
                    Requirements = "- Có kinh nghiệm sửa chữa phần cứng laptop ít nhất 1 năm.\n- Biết sử dụng máy khò, máy hàn, đồng hồ đo và đọc sơ đồ mạch mainboard.\n- Trung thực, trách nhiệm với công việc.",
                    Benefits = "- Lương cao theo tay nghề.\n- Phụ cấp ăn trưa tại công ty.\n- Nghỉ chủ nhật và các ngày lễ theo quy định.",
                    Department = "Kỹ thuật",
                    Location = "Hồ Chí Minh",
                    JobType = "Full-time",
                    ExpiryDate = SeedExpiryDate,
                    SalaryRangeMin = 10000000m,
                    SalaryRangeMax = 18000000m,
                    Status = JobStatus.Active,
                    CreatedAt = SeedCreatedAt
                },
                new
                {
                    Id = Guid.Parse("00000000-0000-0000-0000-000000000004"),
                    Title = "Chuyên viên Marketing & Content",
                    Description = "Lên kế hoạch nội dung cho Fanpage, Website và các kênh mạng xã hội. Viết bài review sản phẩm công nghệ.",
                    Requirements = "- Sử dụng tốt các công cụ thiết kế cơ bản (Photoshop, Canva).\n- Có kỹ năng viết lách, sáng tạo nội dung thu hút.\n- Yêu thích và am hiểu về đồ công nghệ, gaming gear.",
                    Benefits = "- Môi trường làm việc sáng tạo, không gò bó.\n- Được trải nghiệm sớm các sản phẩm công nghệ mới nhất.\n- Lương thưởng xứng đáng theo năng suất.",
                    Department = "Marketing",
                    Location = "Hồ Chí Minh",
                    JobType = "Full-time",
                    ExpiryDate = SeedExpiryDate,
                    SalaryRangeMin = 9000000m,
                    SalaryRangeMax = 14000000m,
                    Status = JobStatus.Active,
                    CreatedAt = SeedCreatedAt
                },
                new
                {
                    Id = Guid.Parse("00000000-0000-0000-0000-000000000005"),
                    Title = "Nhân viên vận chuyển & Giao nhận",
                    Description = "Giao hàng từ showroom đến địa chỉ khách hàng trong khu vực nội thành. Hỗ trợ khách hàng kiểm tra sản phẩm khi giao.",
                    Requirements = "- Có xe máy riêng và thông thuộc đường phố Hồ Chí Minh.\n- Sức khỏe tốt, tính tình thật thà.\n- Có điện thoại smartphone để liên lạc và sử dụng app giao hàng.",
                    Benefits = "- Phụ cấp xăng xe và điện thoại hàng tháng.\n- Thưởng theo sản lượng đơn hàng giao thành công.\n- Chế độ bảo hiểm tai nạn đầy đủ.",
                    Department = "Logistics",
                    Location = "Hồ Chí Minh",
                    JobType = "Full-time",
                    ExpiryDate = SeedExpiryDate,
                    SalaryRangeMin = 7000000m,
                    SalaryRangeMax = 10000000m,
                    Status = JobStatus.Active,
                    CreatedAt = SeedCreatedAt
                },
                new
                {
                    Id = Guid.Parse("00000000-0000-0000-0000-000000000006"),
                    Title = "Kế toán bán hàng",
                    Description = "Quản lý hóa đơn, chứng từ bán hàng. Theo dõi kho hàng và đối soát công nợ khách hàng, nhà cung cấp.",
                    Requirements = "- Tốt nghiệp chuyên ngành Kế toán.\n- Thành thạo Excel và các phần mềm kế toán thông dụng.\n- Cẩn thận, trung thực, có trí nhớ tốt.",
                    Benefits = "- Môi trường làm việc văn phòng máy lạnh mát mẻ.\n- Chế độ thâm niên, tăng lương hàng năm.\n- Được đào tạo về các nghiệp vụ kế toán chuyên sâu của ngành bán lẻ công nghệ.",
                    Department = "Kế toán",
                    Location = "Hồ Chí Minh",
                    JobType = "Full-time",
                    ExpiryDate = SeedExpiryDate,
                    SalaryRangeMin = 8000000m,
                    SalaryRangeMax = 12000000m,
                    Status = JobStatus.Active,
                    CreatedAt = SeedCreatedAt
                }
            );
        });

        // W1-11 / audit db-schema-migrations-07: module HR chưa từng gọi
        // ConfigureCommonColumnProperties nên model của Npgsql 8 đòi timestamptz cho MỌI cột
        // DateTime, trong khi CSDL thật là `timestamp without time zone`. Ghim lại đúng thực tế,
        // rồi trả CheckInTime/CheckOutTime về timestamptz - đó là hai cột duy nhất trong HR
        // biểu diễn một THỜI ĐIỂM thật (chuyển đổi hàng loạt nằm trong backlog).
        PostgreSQLConfig.ConfigureCommonColumnProperties(modelBuilder);
        modelBuilder.Entity<AttendanceRecord>()
            .Property(e => e.CheckInTime).HasColumnType("timestamp with time zone");
        modelBuilder.Entity<AttendanceRecord>()
            .Property(e => e.CheckOutTime).HasColumnType("timestamp with time zone");
    }
}
