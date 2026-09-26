using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Repair.Domain;
using Repair.Infrastructure;

namespace Repair;

/// <summary>
/// Danh mục dịch vụ sửa chữa. Công khai: GET danh sách ĐANG BẬT (tên, mô tả, giá gốc niêm yết,
/// thời gian ước tính — thông tin in trên bảng giá ở quầy, không PII) cho form đặt lịch.
/// Quản trị: xem cần <c>Repair.ViewAll</c>, ghi cần <c>Repair.ManageServiceTypes</c>.
/// </summary>
public static class ServiceTypeEndpoints
{
    public static void MapServiceTypeEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/repair/service-types", async (RepairDbContext db, CancellationToken ct) =>
            Results.Ok(await db.RepairServiceTypes.AsNoTracking()
                .Where(s => s.IsActive)
                .OrderBy(s => s.SortOrder).ThenBy(s => s.Name)
                .Select(s => new { s.Id, s.Code, s.Name, s.Description, s.BasePrice, s.EstimatedMinutes, s.IsOnSite })
                .ToListAsync(ct)))
            .AllowAnonymous();

        var admin = app.MapGroup("/api/repair/admin/service-types");

        admin.MapGet("/", async (RepairDbContext db, CancellationToken ct) =>
            Results.Ok(await db.RepairServiceTypes.AsNoTracking()
                .OrderBy(s => s.SortOrder).ThenBy(s => s.Name)
                .Select(s => ToDto(s))
                .ToListAsync(ct)))
            .RequireAuthorization(Permissions.Repair.ViewAll);

        admin.MapPost("/", async ([FromBody] UpsertServiceTypeRequest req, RepairDbContext db, CancellationToken ct) =>
        {
            await EnsureCodeFreeAsync(db, req.Code, null, ct);
            var entity = new RepairServiceType(req.Code, req.Name, req.Description, req.BasePrice,
                req.EstimatedMinutes, req.IsOnSite, req.SortOrder, req.IsActive);
            db.RepairServiceTypes.Add(entity);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/repair/admin/service-types/{entity.Id}", ToDto(entity));
        }).RequireAuthorization(Permissions.Repair.ManageServiceTypes);

        admin.MapPut("/{id:guid}", async (Guid id, [FromBody] UpsertServiceTypeRequest req, RepairDbContext db, CancellationToken ct) =>
        {
            var entity = await db.RepairServiceTypes.FirstOrDefaultAsync(s => s.Id == id, ct)
                ?? throw NotFoundException.For("dịch vụ sửa chữa", id);
            await EnsureCodeFreeAsync(db, req.Code, id, ct);
            entity.Update(req.Code, req.Name, req.Description, req.BasePrice,
                req.EstimatedMinutes, req.IsOnSite, req.SortOrder, req.IsActive);
            await db.SaveChangesAsync(ct);
            return Results.Ok(ToDto(entity));
        }).RequireAuthorization(Permissions.Repair.ManageServiceTypes);

        // Xoá hẳn chỉ khi chưa lịch hẹn/phiếu nào dùng; đã dùng thì 409 — hãy tắt thay vì xoá.
        admin.MapDelete("/{id:guid}", async (Guid id, RepairDbContext db, CancellationToken ct) =>
        {
            var entity = await db.RepairServiceTypes.FirstOrDefaultAsync(s => s.Id == id, ct)
                ?? throw NotFoundException.For("dịch vụ sửa chữa", id);
            var inUse = await db.ServiceBookings.AnyAsync(b => b.ServiceTypeId == id, ct)
                || await db.WorkOrders.AnyAsync(w => w.ServiceTypeId == id, ct)
                || await db.RepairQuoteLines.AnyAsync(l => l.ServiceTypeId == id, ct);
            if (inUse)
                throw new ConflictException("Dịch vụ đã được dùng trong lịch hẹn, phiếu sửa hoặc báo giá — hãy tắt thay vì xoá.");

            db.RepairServiceTypes.Remove(entity);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }).RequireAuthorization(Permissions.Repair.ManageServiceTypes);
    }

    private static async Task EnsureCodeFreeAsync(RepairDbContext db, string code, Guid? exceptId, CancellationToken ct)
    {
        var normalized = RepairServiceType.NormalizeCode(code);
        if (await db.RepairServiceTypes.AnyAsync(s => s.Code == normalized && s.Id != exceptId, ct))
            throw new ConflictException("Mã dịch vụ đã tồn tại.",
                new[] { new ApiFieldError("code", ApiErrorCodes.DuplicateValue, "Mã dịch vụ đã tồn tại.") });
    }

    private static ServiceTypeDto ToDto(RepairServiceType s) => new(
        s.Id, s.Code, s.Name, s.Description, s.BasePrice, s.EstimatedMinutes, s.IsOnSite, s.SortOrder, s.IsActive, s.CreatedAt, s.UpdatedAt);
}

public sealed record UpsertServiceTypeRequest(
    string Code, string Name, string? Description, decimal BasePrice,
    int EstimatedMinutes, bool IsOnSite, int SortOrder, bool IsActive = true);

public sealed record ServiceTypeDto(
    Guid Id, string Code, string Name, string? Description, decimal BasePrice,
    int EstimatedMinutes, bool IsOnSite, int SortOrder, bool IsActive, DateTime CreatedAt, DateTime? UpdatedAt);
