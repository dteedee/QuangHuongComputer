using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using HR.Application.Statutory;
using HR.Domain;
using HR.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace HR.Endpoints.Statutory;

/// <summary>
/// W2-25 / D06 §4 — ngày nghỉ lễ là DỮ LIỆU, không phải thuật toán.
///
/// Giỗ Tổ Hùng Vương theo lịch âm nên không có công thức dương lịch; bảng cũ hardcode SAI cả
/// 2026 (27/03 -> đúng 26/04) lẫn 2027 (15/04 -> đúng 16/04), và thiếu 24/11 "Ngày Văn hoá Việt
/// Nam" (NQ 28/2026/QH16, lần đầu 2026). Hai ngày Giỗ Tổ được seed với <c>isConfirmed=false</c>
/// để HR đối chiếu thông báo nghỉ lễ chính thức hằng năm rồi bấm xác nhận.
///
/// Đọc: <c>HR.ViewAttendance</c>. Ghi: <c>HR.ManageAttendance</c>.
/// </summary>
public static class PublicHolidayEndpoints
{
    private const string Module = "HR";
    private const string Entity = "PublicHoliday";

    public static void MapPublicHolidayEndpoints(this IEndpointRouteBuilder app)
    {
        const string Base = "/api/hr/public-holidays";

        var read = app.MapGroup(Base).RequirePermission(Permissions.HR.ViewAttendance);
        var write = app.MapGroup(Base).RequirePermission(Permissions.HR.ManageAttendance);

        // GET /api/hr/public-holidays?year=2026&unconfirmedOnly=true
        // `unconfirmedOnly` PHẢI là bool? — một `bool` không-nullable là tham số query BẮT BUỘC với
        // minimal API, nên bỏ trống nó trả 400 và endpoint không dùng được nếu thiếu tham số.
        read.MapGet("", async (HRDbContext db, int? year, bool? unconfirmedOnly, CancellationToken ct) =>
        {
            var query = db.PublicHolidays.AsNoTracking().AsQueryable();
            if (year.HasValue)
            {
                var from = new DateOnly(year.Value, 1, 1);
                var to = new DateOnly(year.Value, 12, 31);
                query = query.Where(h => h.Date >= from && h.Date <= to);
            }
            if (unconfirmedOnly == true) query = query.Where(h => !h.IsConfirmed);

            var rows = await query.OrderBy(h => h.Date).ToListAsync(ct);
            return Results.Ok(rows.Select(ToDto));
        });

        write.MapPost("", async (UpsertPublicHolidayDto dto, HRDbContext db, HttpContext http, CancellationToken ct) =>
        {
            if (await db.PublicHolidays.AnyAsync(h => h.Date == dto.Date, ct))
                throw new ConflictException($"Ngày {dto.Date:dd/MM/yyyy} đã có trong bảng ngày nghỉ lễ.");

            var holiday = new PublicHoliday(dto.Date, dto.Name, dto.IsPaid, dto.IsConfirmed, dto.LegalBasis, dto.Note);
            db.PublicHolidays.Add(holiday);
            await db.SaveChangesAsync(ct);
            await http.LogAuditAsync("Create", Entity, holiday.Id.ToString(),
                $"Thêm ngày nghỉ lễ {holiday.Date:dd/MM/yyyy} — {holiday.Name}", Module);
            return Results.Created($"{Base}/{holiday.Id}", ToDto(holiday));
        });

        write.MapPut("/{id:guid}", async (
            Guid id, UpsertPublicHolidayDto dto, HRDbContext db, HttpContext http, CancellationToken ct) =>
        {
            var holiday = await db.PublicHolidays.FirstOrDefaultAsync(h => h.Id == id, ct)
                ?? throw NotFoundException.For("ngày nghỉ lễ", id);

            holiday.Update(dto.Name, dto.IsPaid, dto.IsConfirmed, dto.LegalBasis, dto.Note);
            await db.SaveChangesAsync(ct);
            await http.LogAuditAsync("Update", Entity, id.ToString(),
                $"Sửa ngày nghỉ lễ {holiday.Date:dd/MM/yyyy} — {holiday.Name}", Module);
            return Results.Ok(ToDto(holiday));
        });

        // POST /{id}/confirm — HR đã đối chiếu thông báo nghỉ lễ chính thức.
        write.MapPost("/{id:guid}/confirm", async (Guid id, HRDbContext db, HttpContext http, CancellationToken ct) =>
        {
            var holiday = await db.PublicHolidays.FirstOrDefaultAsync(h => h.Id == id, ct)
                ?? throw NotFoundException.For("ngày nghỉ lễ", id);

            holiday.Confirm();
            await db.SaveChangesAsync(ct);
            await http.LogAuditAsync("Confirm", Entity, id.ToString(),
                $"Xác nhận ngày nghỉ lễ {holiday.Date:dd/MM/yyyy} theo thông báo chính thức", Module);
            return Results.Ok(ToDto(holiday));
        });

        write.MapDelete("/{id:guid}", async (Guid id, HRDbContext db, HttpContext http, CancellationToken ct) =>
        {
            var holiday = await db.PublicHolidays.FirstOrDefaultAsync(h => h.Id == id, ct)
                ?? throw NotFoundException.For("ngày nghỉ lễ", id);

            db.PublicHolidays.Remove(holiday);
            await db.SaveChangesAsync(ct);
            await http.LogAuditAsync("Delete", Entity, id.ToString(),
                $"Xoá ngày nghỉ lễ {holiday.Date:dd/MM/yyyy}", Module);
            return Results.NoContent();
        });
    }

    private static PublicHolidayDto ToDto(PublicHoliday h)
        => new(h.Id, h.Date, h.Name, h.IsPaid, h.IsConfirmed, h.LegalBasis, h.Note);
}
