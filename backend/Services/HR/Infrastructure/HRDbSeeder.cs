using HR.Domain;
using Microsoft.EntityFrameworkCore;

namespace HR.Infrastructure;

public static class HRDbSeeder
{
    public static async Task SeedAsync(HRDbContext context)
    {
        // W2-7 khoản 1: 0 Employee dù đã có 8 tài khoản staff (Employee.UserId chỉ tồn tại từ
        // track này nên W1-4 không seed được — ghi rõ trong phase-25). Không seed được thì mọi
        // luồng HR (self-service, chấm công, lương) đều vô dụng vì không nhân viên nào đăng
        // nhập được vào chính hồ sơ của mình.
        await SeedStaffEmployeesAsync(context);

        // W2-25 / D06: tham số lương-thuế-bảo hiểm theo mốc hiệu lực, ngày nghỉ lễ, loại phụ cấp.
        // Chỉ INSERT dòng còn thiếu — không bao giờ ghi đè dòng kế toán đã sửa.
        await HR.Application.Statutory.StatutorySeeder.SeedAsync(context);

        if (!await context.JobListings.AnyAsync())
        {
            var jobs = new List<JobListing>
            {
                new JobListing(
                    "Kỹ thuật viên máy tính (Lắp ráp & Cài đặt)",
                    "Chúng tôi đang tìm kiếm kỹ thuật viên có kinh nghiệm trong việc lắp ráp máy tính chơi game, máy bộ văn phòng và cài đặt phần mềm. Công việc bao gồm tư vấn cấu hình cho khách hàng, lắp ráp hoàn thiện máy tính và cài đặt hệ điều hành.",
                    "- Có kiến thức về phần cứng máy tính (CPU, GPU, Mainboard, RAM...).\n- Biết lắp ráp máy tính thẩm mỹ (đi dây gọn gàng).\n- Biết cài đặt Windows, Driver và các phần mềm cơ bản.\n- Cẩn thận, tỉ mỉ trong công việc.",
                    "- Lương cứng + phụ cấp tay nghề.\n- Được đào tạo chuyên sâu về phần cứng đời mới nhất.\n- Môi trường làm việc năng động, tiếp xúc với linh kiện cao cấp.",
                    "Kỹ thuật",
                    "Hồ Chí Minh",
                    "Full-time",
                    DateTime.UtcNow.AddMonths(2),
                    8000000m,
                    12000000m,
                    Guid.Parse("00000000-0000-0000-0000-000000000001")
                ),
                new JobListing(
                    "Nhân viên bán hàng (Showroom)",
                    "Tư vấn khách hàng về các sản phẩm laptop, linh kiện máy tính và thiết bị ngoại vi tại showroom của Quang Hưởng Computer.",
                    "- Giao tiếp tốt, ngoại hình ưa nhìn.\n- Am hiểu về các dòng laptop và linh kiện máy tính là một lợi thế lớn.\n- Có khả năng thuyết phục khách hàng và làm việc theo nhóm.",
                    "- Lương cứng + Hoa hồng doanh số cao.\n- Thưởng lễ, tết và tháng lương 13.\n- Chế độ bảo hiểm đầy đủ theo quy định của nhà nước.",
                    "Kinh doanh",
                    "Hồ Chí Minh",
                    "Full-time",
                    DateTime.UtcNow.AddMonths(1),
                    7000000m,
                    15000000m,
                    Guid.Parse("00000000-0000-0000-0000-000000000002")
                ),
                new JobListing(
                    "Kỹ thuật viên sửa chữa Laptop",
                    "Sửa chữa phần cứng laptop, thay thế linh kiện, xử lý các lỗi mainboard cho khách hàng.",
                    "- Có kinh nghiệm sửa chữa phần cứng laptop ít nhất 1 năm.\n- Biết sử dụng máy khò, máy hàn, đồng hồ đo và đọc sơ đồ mạch mainboard.\n- Trung thực, trách nhiệm với công việc.",
                    "- Lương cao theo tay nghề.\n- Phụ cấp ăn trưa tại công ty.\n- Nghỉ chủ nhật và các ngày lễ theo quy định.",
                    "Kỹ thuật",
                    "Hồ Chí Minh",
                    "Full-time",
                    DateTime.UtcNow.AddMonths(3),
                    10000000m,
                    18000000m,
                    Guid.Parse("00000000-0000-0000-0000-000000000003")
                ),
                new JobListing(
                    "Chuyên viên Marketing & Content",
                    "Lên kế hoạch nội dung cho Fanpage, Website và các kênh mạng xã hội. Viết bài review sản phẩm công nghệ.",
                    "- Sử dụng tốt các công cụ thiết kế cơ bản (Photoshop, Canva).\n- Có kỹ năng viết lách, sáng tạo nội dung thu hút.\n- Yêu thích và am hiểu về đồ công nghệ, gaming gear.",
                    "- Môi trường làm việc sáng tạo, không gò bó.\n- Được trải nghiệm sớm các sản phẩm công nghệ mới nhất.\n- Lương thưởng xứng đáng theo năng suất.",
                    "Marketing",
                    "Hồ Chí Minh",
                    "Full-time",
                    DateTime.UtcNow.AddMonths(1),
                    9000000m,
                    14000000m,
                    Guid.Parse("00000000-0000-0000-0000-000000000004")
                ),
                new JobListing(
                    "Nhân viên vận chuyển & Giao nhận",
                    "Giao hàng từ showroom đến địa chỉ khách hàng trong khu vực nội thành. Hỗ trợ khách hàng kiểm tra sản phẩm khi giao.",
                    "- Có xe máy riêng và thông thuộc đường phố Hồ Chí Minh.\n- Sức khỏe tốt, tính tình thật thà.\n- Có điện thoại smartphone để liên lạc và sử dụng app giao hàng.",
                    "- Phụ cấp xăng xe và điện thoại hàng tháng.\n- Thưởng theo sản lượng đơn hàng giao thành công.\n- Chế độ bảo hiểm tai nạn đầy đủ.",
                    "Logistics",
                    "Hồ Chí Minh",
                    "Full-time",
                    DateTime.UtcNow.AddMonths(2),
                    7000000m,
                    10000000m,
                    Guid.Parse("00000000-0000-0000-0000-000000000005")
                ),
                new JobListing(
                    "Kế toán bán hàng",
                    "Quản lý hóa đơn, chứng từ bán hàng. Theo dõi kho hàng và đối soát công nợ khách hàng, nhà cung cấp.",
                    "- Tốt nghiệp chuyên ngành Kế toán.\n- Thành thạo Excel và các phần mềm kế toán thông dụng.\n- Cẩn thận, trung thực, có trí nhớ tốt.",
                    "- Môi trường làm việc văn phòng máy lạnh mát mẻ.\n- Chế độ thâm niên, tăng lương hàng năm.\n- Được đào tạo về các nghiệp vụ kế toán chuyên sâu của ngành bán lẻ công nghệ.",
                    "Kế toán",
                    "Hồ Chí Minh",
                    "Full-time",
                    DateTime.UtcNow.AddMonths(1),
                    8000000m,
                    12000000m,
                    Guid.Parse("00000000-0000-0000-0000-000000000006")
                )
            };

            context.JobListings.AddRange(jobs);
            await context.SaveChangesAsync();
        }
    }

    /// <summary>Demo profile cho từng tài khoản staff sẵn có, seed theo Email trong AspNetUsers
    /// (ổn định, không phải id sinh ngẫu nhiên).</summary>
    private static readonly (string Email, string Department, string Position, decimal BaseSalary)[] StaffProfiles =
    {
        ("admin@quanghuong.com", "Ban Giám đốc", "Quản trị hệ thống", 25_000_000m),
        ("hr@quanghuong.com", "Nhân sự", "Chuyên viên Nhân sự", 12_000_000m),
        ("accountant@quanghuong.com", "Kế toán", "Kế toán viên", 13_000_000m),
        ("kho@quanghuong.com", "Kho", "Nhân viên Kho", 9_000_000m),
        ("manager@quanghuong.com", "Quản lý", "Quản lý Cửa hàng", 18_000_000m),
        ("marketing@quanghuong.com", "Marketing", "Chuyên viên Marketing", 11_000_000m),
        ("sale@quanghuong.com", "Kinh doanh", "Nhân viên Bán hàng", 8_500_000m),
        ("technician@quanghuong.com", "Kỹ thuật", "Kỹ thuật viên", 10_000_000m),
    };

    /// <summary>
    /// W2-7 khoản 1: gắn Employee cho 8 tài khoản staff seed sẵn (Identity). Đọc AspNetUsers qua
    /// SQL thô (READ-ONLY) thay vì <c>IUserDirectory</c> vì hợp đồng đúng đắn
    /// (<c>BuildingBlocks.Contracts.IUserDirectory</c>) CHƯA từng được đăng ký vào DI ở bất kỳ
    /// host nào (xem integration-requests-w2.md) — HR cũng không được phép reference assembly
    /// Identity để gọi <c>Identity.Services.IUserDirectory</c> (vi phạm biên module). Idempotent:
    /// chỉ INSERT nhân viên còn thiếu theo Email, không ghi đè nhân viên đã có (kể cả admin đã
    /// sửa tay), không tự ý LinkUser lại nếu Employee đã tồn tại nhưng UserId khác (giữ nguyên,
    /// tránh cướp liên kết admin đã thay đổi thủ công).
    /// </summary>
    private static async Task SeedStaffEmployeesAsync(HRDbContext context)
    {
        var conn = context.Database.GetDbConnection();
        var wasClosed = conn.State != System.Data.ConnectionState.Open;
        if (wasClosed) await conn.OpenAsync();
        List<(string Id, string Email, string FullName)> users;
        try
        {
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT \"Id\", \"Email\", \"FullName\" FROM \"AspNetUsers\" WHERE \"Email\" = ANY(@emails)";
            var p = cmd.CreateParameter();
            p.ParameterName = "@emails";
            p.Value = StaffProfiles.Select(s => s.Email).ToArray();
            // Npgsql suy ra text[] từ string[] khi gán trực tiếp; không cần NpgsqlDbType ở đây vì
            // HRDbContext không tham chiếu gói Npgsql trực tiếp (chỉ qua EFCore.Npgsql).
            cmd.Parameters.Add(p);
            using var reader = await cmd.ExecuteReaderAsync();
            users = new List<(string, string, string)>();
            while (await reader.ReadAsync())
                users.Add((reader.GetString(0), reader.GetString(1), reader.GetString(2)));
        }
        finally
        {
            if (wasClosed) await conn.CloseAsync();
        }

        if (users.Count == 0) return; // Chưa có seed Identity (DB trống) — bỏ qua, chạy lại sau khi Identity seed xong.

        var existingEmails = await context.Employees.Select(e => e.Email).ToListAsync();
        var nextCodeNum = 1 + (await context.Employees
            .Where(e => e.EmployeeCode != null && e.EmployeeCode.StartsWith("NV"))
            .Select(e => e.EmployeeCode)
            .ToListAsync())
            .Select(c => int.TryParse(c!.AsSpan(2), out var n) ? n : 0)
            .DefaultIfEmpty(0)
            .Max();

        var toAdd = new List<Employee>();
        foreach (var (email, department, position, baseSalary) in StaffProfiles)
        {
            if (existingEmails.Contains(email)) continue;
            var identityUser = users.FirstOrDefault(u => u.Email == email);
            if (identityUser.Id == null) continue; // Tài khoản này chưa tồn tại trong Identity ở lần seed này.

            var employee = new Employee(
                fullName: identityUser.FullName,
                email: email,
                phone: "0900000000", // placeholder demo — HR cập nhật số thật qua PUT /employees/{id}
                department: department,
                position: position,
                hireDate: new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                baseSalary: baseSalary,
                employeeCode: $"NV{nextCodeNum:D4}",
                userId: identityUser.Id);
            nextCodeNum++;
            toAdd.Add(employee);
        }

        if (toAdd.Count > 0)
        {
            context.Employees.AddRange(toAdd);
            await context.SaveChangesAsync();
        }
    }
}
