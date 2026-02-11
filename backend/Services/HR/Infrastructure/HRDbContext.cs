using Microsoft.EntityFrameworkCore;
using HR.Domain;

namespace HR.Infrastructure;

public class HRDbContext : DbContext
{
    public HRDbContext(DbContextOptions<HRDbContext> options) : base(options) { }

    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<Timesheet> Timesheets => Set<Timesheet>();
    public DbSet<Payroll> Payrolls => Set<Payroll>();
    public DbSet<Shift> Shifts => Set<Shift>();
    public DbSet<ShiftAssignment> ShiftAssignments => Set<ShiftAssignment>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
    public DbSet<JobListing> JobListings => Set<JobListing>();

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
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Phone).IsRequired().HasMaxLength(20);
            entity.Property(e => e.EmployeeCode).HasMaxLength(50);
            entity.Property(e => e.IdCardNumber).HasMaxLength(50);
            entity.Property(e => e.TaxCode).HasMaxLength(50);
            entity.Property(e => e.SocialInsuranceNumber).HasMaxLength(50);
            
            entity.HasIndex(e => e.EmployeeCode).IsUnique();
            entity.HasIndex(e => e.Email);
            entity.HasIndex(e => new { e.Department, e.Status })
                .HasDatabaseName("IX_Employee_Department_Status");
            entity.HasIndex(e => new { e.Status, e.HireDate });
        });
        
        // Shift configuration
        modelBuilder.Entity<Shift>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            
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
                    ExpiryDate = DateTime.UtcNow.AddMonths(2),
                    SalaryRangeMin = 8000000m,
                    SalaryRangeMax = 12000000m,
                    Status = JobStatus.Active,
                    CreatedAt = DateTime.UtcNow
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
                    ExpiryDate = DateTime.UtcNow.AddMonths(1),
                    SalaryRangeMin = 7000000m,
                    SalaryRangeMax = 15000000m,
                    Status = JobStatus.Active,
                    CreatedAt = DateTime.UtcNow
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
                    ExpiryDate = DateTime.UtcNow.AddMonths(3),
                    SalaryRangeMin = 10000000m,
                    SalaryRangeMax = 18000000m,
                    Status = JobStatus.Active,
                    CreatedAt = DateTime.UtcNow
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
                    ExpiryDate = DateTime.UtcNow.AddMonths(1),
                    SalaryRangeMin = 9000000m,
                    SalaryRangeMax = 14000000m,
                    Status = JobStatus.Active,
                    CreatedAt = DateTime.UtcNow
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
                    ExpiryDate = DateTime.UtcNow.AddMonths(2),
                    SalaryRangeMin = 7000000m,
                    SalaryRangeMax = 10000000m,
                    Status = JobStatus.Active,
                    CreatedAt = DateTime.UtcNow
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
                    ExpiryDate = DateTime.UtcNow.AddMonths(1),
                    SalaryRangeMin = 8000000m,
                    SalaryRangeMax = 12000000m,
                    Status = JobStatus.Active,
                    CreatedAt = DateTime.UtcNow
                }
            );
        });
    }
}
