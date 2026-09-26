using System.Text.RegularExpressions;
using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using HR.Domain;
using HR.Infrastructure;
using BuildingBlocks.Endpoints;

namespace HR.Endpoints;

/// <summary>
/// Employee <-> Identity user link, full CRUD + terminate (W2-7 khoản 1-2).
/// Tách khỏi HREndpoints.cs (đã 657 dòng, vượt giới hạn 200 dòng/file) — được gọi TỪ
/// <see cref="HR.HREndpoints.MapHREndpoints"/> nên KHÔNG cần sửa Program.cs (frozen ở wave 2).
/// </summary>
public static class EmployeeEndpoints
{
    private static readonly Regex VnPhoneRegex = new(@"^(0|\+84)\d{9,10}$", RegexOptions.Compiled);

    public static void MapEmployeeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hr/employees").RequireModulePermissions(PermissionModules.HR);

        // GET /api/hr/employees?search=&department=&status=&page=&pageSize=&sortBy=&sortDesc=
        group.MapGet("", async (
            HRDbContext db, string? search, string? department, EmployeeStatus? status,
            string? sortBy, int page = 0, int pageSize = 0, bool sortDesc = false) =>
        {
            page = page <= 0 ? 1 : page;
            pageSize = pageSize <= 0 ? 20 : Math.Min(pageSize, 200);

            var query = db.Employees.AsQueryable();
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(e => e.FullName.ToLower().Contains(s)
                    || e.Email.ToLower().Contains(s)
                    || (e.EmployeeCode != null && e.EmployeeCode.ToLower().Contains(s)));
            }
            if (!string.IsNullOrWhiteSpace(department)) query = query.Where(e => e.Department == department);
            if (status.HasValue) query = query.Where(e => e.Status == status.Value);

            query = (sortBy?.ToLowerInvariant()) switch
            {
                "code" => sortDesc ? query.OrderByDescending(e => e.EmployeeCode) : query.OrderBy(e => e.EmployeeCode),
                "hiredate" => sortDesc ? query.OrderByDescending(e => e.HireDate) : query.OrderBy(e => e.HireDate),
                "salary" => sortDesc ? query.OrderByDescending(e => e.BaseSalary) : query.OrderBy(e => e.BaseSalary),
                _ => sortDesc ? query.OrderByDescending(e => e.FullName) : query.OrderBy(e => e.FullName),
            };

            var total = await query.CountAsync();
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            return Results.Ok(new { items, total, page, pageSize });
        });

        group.MapGet("/{id:guid}", async (Guid id, HRDbContext db) =>
        {
            var employee = await db.Employees.FindAsync(id);
            return employee != null ? Results.Ok(employee) : Results.NotFound();
        });

        group.MapPost("", async (CreateEmployeeDto dto, HRDbContext db) =>
        {
            var validationError = ValidateCreate(dto);
            if (validationError != null) return Results.BadRequest(new { error = validationError });

            var code = dto.EmployeeCode ?? await NextEmployeeCodeAsync(db);
            try
            {
                var employee = new Employee(
                    dto.FullName, dto.Email, dto.Phone, dto.Department, dto.Position,
                    dto.HireDate ?? DateTime.UtcNow, dto.BaseSalary,
                    employeeCode: code, idCardNumber: dto.IdCardNumber, address: dto.Address,
                    hourlyRate: dto.HourlyRate, dateOfBirth: dto.DateOfBirth, gender: dto.Gender);

                if (dto.TaxCode != null) employee.SetTaxCode(dto.TaxCode);
                if (dto.SocialInsuranceNumber != null) employee.SetSocialInsuranceNumber(dto.SocialInsuranceNumber);
                if (dto.IdCardIssueDate.HasValue || dto.IdCardIssuePlace != null)
                    employee.SetIdCard(dto.IdCardNumber, dto.IdCardIssueDate, dto.IdCardIssuePlace);
                if (dto.StoreId.HasValue) employee.AssignStore(dto.StoreId);
                if (dto.BankAccount != null && dto.BankName != null)
                    employee.UpdateBankInfo(dto.BankAccount, dto.BankName);

                // W2-7 khoản 1: option "tạo login luôn" khi tạo nhân viên. IUserDirectory thật
                // (BuildingBlocks.Contracts) chưa được host đăng ký DI (xem integration-requests-w2.md)
                // nên không có đường an toàn để TẠO user Identity từ module HR — chỉ hỗ trợ LINK
                // vào một login đã tồn tại (UserId do FE truyền, xem /link-user bên dưới).
                if (!string.IsNullOrWhiteSpace(dto.UserId))
                {
                    var linkError = await ValidateUserIdForLinkAsync(db, dto.UserId, employeeIdToExclude: null);
                    if (linkError != null) return Results.BadRequest(new { error = linkError });
                    employee.LinkUser(dto.UserId);
                }

                db.Employees.Add(employee);
                await db.SaveChangesAsync();
                return Results.Created($"/api/hr/employees/{employee.Id}", employee);
            }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
            catch (DbUpdateException) { return Results.Conflict(new { error = "Email hoặc mã nhân viên đã tồn tại." }); }
        });

        group.MapPut("/{id:guid}", async (Guid id, UpdateEmployeeDto dto, HRDbContext db) =>
        {
            var employee = await db.Employees.FindAsync(id);
            if (employee == null) return Results.NotFound();

            try
            {
                employee.UpdateDetails(dto.FullName, dto.Email, dto.Phone, dto.Department, dto.Position,
                    dto.IdCardNumber, dto.Address);

                if (dto.BaseSalary.HasValue) employee.UpdateSalary(dto.BaseSalary.Value, dto.HourlyRate);
                if (dto.IsActive.HasValue) { if (dto.IsActive.Value) employee.Activate(); else employee.Deactivate(); }
                if (dto.TaxCode != null) employee.SetTaxCode(dto.TaxCode);
                if (dto.SocialInsuranceNumber != null) employee.SetSocialInsuranceNumber(dto.SocialInsuranceNumber);
                if (dto.StoreId.HasValue) employee.AssignStore(dto.StoreId);
                if (dto.ReportingToId.HasValue) employee.SetReportingManager(dto.ReportingToId);

                await db.SaveChangesAsync();
                return Results.Ok(employee);
            }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
        });

        group.MapDelete("/{id:guid}", async (Guid id, HRDbContext db) =>
        {
            var employee = await db.Employees.FindAsync(id);
            if (employee == null) return Results.NotFound();
            employee.Deactivate();
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Đã vô hiệu hoá nhân viên." });
        });

        // POST /api/hr/employees/{id}/terminate — nghỉ việc (khác Deactivate: có lý do + ngày nghỉ)
        group.MapPost("/{id:guid}/terminate", async (Guid id, TerminateEmployeeDto dto, HRDbContext db) =>
        {
            var employee = await db.Employees.FindAsync(id);
            if (employee == null) return Results.NotFound();
            if (string.IsNullOrWhiteSpace(dto.Reason))
                return Results.BadRequest(new { error = "Lý do nghỉ việc là bắt buộc." });

            try
            {
                employee.Terminate(dto.Reason);
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Đã cho nhân viên nghỉ việc.", employee.Status, employee.TerminationDate });
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
        });

        // POST /api/hr/employees/{id}/link-user — gắn tài khoản đăng nhập có sẵn.
        // W2-7 khoản 1: unblocks toàn bộ self-service. "Tạo login mới" KHÔNG hỗ trợ ở đây — xem
        // comment ở POST "" phía trên.
        group.MapPost("/{id:guid}/link-user", async (Guid id, LinkUserDto dto, HRDbContext db) =>
        {
            var employee = await db.Employees.FindAsync(id);
            if (employee == null) return Results.NotFound(new { error = "Không tìm thấy nhân viên." });
            if (string.IsNullOrWhiteSpace(dto.UserId))
                return Results.BadRequest(new { error = "UserId là bắt buộc." });

            var error = await ValidateUserIdForLinkAsync(db, dto.UserId, employeeIdToExclude: id);
            if (error != null) return Results.BadRequest(new { error });

            employee.LinkUser(dto.UserId);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Đã gắn tài khoản đăng nhập.", employee.Id, employee.UserId });
        });

        group.MapPost("/{id:guid}/unlink-user", async (Guid id, HRDbContext db) =>
        {
            var employee = await db.Employees.FindAsync(id);
            if (employee == null) return Results.NotFound();
            employee.UnlinkUser();
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Đã bỏ gắn tài khoản đăng nhập." });
        });
    }

    private static string? ValidateCreate(CreateEmployeeDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.FullName)) return "Họ tên là bắt buộc.";
        if (string.IsNullOrWhiteSpace(dto.Email) || !dto.Email.Contains('@')) return "Email không hợp lệ.";
        if (string.IsNullOrWhiteSpace(dto.Phone) || !VnPhoneRegex.IsMatch(dto.Phone.Trim()))
            return "Số điện thoại không hợp lệ (định dạng VN: 0xxxxxxxxx).";
        if (string.IsNullOrWhiteSpace(dto.Department)) return "Phòng ban là bắt buộc.";
        if (string.IsNullOrWhiteSpace(dto.Position)) return "Chức vụ là bắt buộc.";
        if (dto.BaseSalary <= 0) return "Lương cơ bản phải lớn hơn 0.";
        return null;
    }

    /// <summary>
    /// Sinh mã NVxxxx tiếp theo. Không dùng transaction/khoá hàng — hai request POST /employees
    /// đồng thời có thể trùng mã hiếm khi xảy ra (tạo nhân viên là thao tác quản trị, tần suất
    /// thấp); nếu trùng, unique index IX_Employees_EmployeeCode chặn ở DB và trả 409.
    /// </summary>
    private static async Task<string> NextEmployeeCodeAsync(HRDbContext db)
    {
        var last = await db.Employees
            .Where(e => e.EmployeeCode != null && e.EmployeeCode.StartsWith("NV"))
            .OrderByDescending(e => e.EmployeeCode)
            .Select(e => e.EmployeeCode)
            .FirstOrDefaultAsync();

        var next = 1;
        if (last != null && int.TryParse(last.AsSpan(2), out var n)) next = n + 1;
        return $"NV{next:D4}";
    }

    /// <summary>
    /// Xác nhận UserId tồn tại trong AspNetUsers và chưa gắn nhân viên khác. Đọc thẳng bảng
    /// AspNetUsers qua SQL thô (READ-ONLY) vì <c>BuildingBlocks.Contracts.IUserDirectory</c> —
    /// hợp đồng đúng đắn W1-2 định nghĩa — CHƯA từng được đăng ký vào DI ở bất kỳ host nào
    /// (chỉ <c>Identity.Services.IUserDirectory</c>, một interface trùng lặp, được đăng ký — và
    /// HR không được phép reference assembly Identity). Đây là một defect nền tảng có thật, đã
    /// ghi vào integration-requests-w2.md; SELECT một dòng theo khoá chính là rủi ro thấp nhất có
    /// thể chấp nhận để tính năng link-user hoạt động thật trong lúc chờ fix đúng chỗ.
    /// </summary>
    private static async Task<string?> ValidateUserIdForLinkAsync(HRDbContext db, string userId, Guid? employeeIdToExclude)
    {
        var alreadyLinked = await db.Employees
            .Where(e => e.UserId == userId && (employeeIdToExclude == null || e.Id != employeeIdToExclude))
            .Select(e => e.Id)
            .FirstOrDefaultAsync();
        if (alreadyLinked != Guid.Empty)
            return $"Tài khoản này đã gắn với nhân viên khác ({alreadyLinked}).";

        var conn = db.Database.GetDbConnection();
        var wasClosed = conn.State != System.Data.ConnectionState.Open;
        if (wasClosed) await conn.OpenAsync();
        try
        {
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT 1 FROM \"AspNetUsers\" WHERE \"Id\" = @id LIMIT 1";
            var p = cmd.CreateParameter();
            p.ParameterName = "@id";
            p.Value = userId;
            cmd.Parameters.Add(p);
            var exists = await cmd.ExecuteScalarAsync() != null;
            return exists ? null : "Không tìm thấy tài khoản đăng nhập với UserId này.";
        }
        finally
        {
            if (wasClosed) await conn.CloseAsync();
        }
    }
}

public record CreateEmployeeDto(
    string FullName, string Email, string Phone, string Department, string Position,
    decimal BaseSalary, DateTime? HireDate, string? EmployeeCode, string? IdCardNumber, string? Address,
    decimal? HourlyRate, DateOnly? DateOfBirth, string? Gender, string? TaxCode,
    string? SocialInsuranceNumber, DateTime? IdCardIssueDate, string? IdCardIssuePlace,
    Guid? StoreId, string? BankAccount, string? BankName, string? UserId);

public record UpdateEmployeeDto(
    string FullName, string Email, string Phone, string Department, string Position,
    decimal? BaseSalary, decimal? HourlyRate, string? IdCardNumber, string? Address, bool? IsActive,
    string? TaxCode, string? SocialInsuranceNumber, Guid? StoreId, Guid? ReportingToId);

public record TerminateEmployeeDto(string Reason);
public record LinkUserDto(string UserId);
