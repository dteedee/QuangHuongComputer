using System.Security.Claims;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using BuildingBlocks.Storage;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Repair.Application.Intake;
using Repair.Application.Quotes;
using Repair.Domain;
using Repair.Infrastructure;

namespace Repair;

/// <summary>
/// Tiếp nhận máy: sửa thông tin nhận (ưu tiên, loại/hãng/model, serial, phụ kiện, dịch vụ), ảnh lúc
/// nhận, và ảnh trước/sau khi sửa (ghi thành một dòng nhật ký có ảnh). Quyền: Repair.UpdateStatus,
/// và trong handler chỉ Quản lý/Admin hoặc kỹ thuật viên đang được giao phiếu.
/// </summary>
public static class WorkOrderIntakeEndpoints
{
    public static void MapWorkOrderIntakeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/repair/tech/work-orders/{id:guid}")
            .RequireAuthorization(Permissions.Repair.UpdateStatus);

        group.MapPut("/intake", async (Guid id, [FromBody] UpdateIntakeDto dto, RepairDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var workOrder = await LoadAsync(db, user, id, ct);
            if (dto.ServiceTypeId is Guid sid && !await db.RepairServiceTypes.AnyAsync(s => s.Id == sid, ct))
                throw new RequestValidationException("serviceTypeId", "Dịch vụ không tồn tại trong danh mục.");

            try
            {
                workOrder.UpdateIntake(dto.Priority, dto.DeviceType, dto.DeviceBrand, dto.DeviceModel,
                    dto.SerialNumber, dto.AccessoriesReceived, dto.ServiceTypeId);
            }
            catch (InvalidOperationException)
            {
                throw new ConflictException("Phiếu đã đóng, không sửa được thông tin tiếp nhận.");
            }

            await db.SaveChangesAsync(ct);
            return Results.Ok(new
            {
                Message = "Intake updated",
                Priority = workOrder.Priority.ToString(),
                workOrder.DeviceType, workOrder.DeviceBrand, workOrder.DeviceModel, workOrder.SerialNumber,
                workOrder.AccessoriesReceived, workOrder.ServiceTypeId
            });
        });

        group.MapPost("/intake-photos", async (Guid id, IFormFileCollection files, RepairDbContext db,
            IFileStorage storage, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var workOrder = await LoadAsync(db, user, id, ct);
            if (workOrder.IntakePhotoUrls.Count + files.Count > WorkOrder.MaxIntakePhotos)
                throw new RequestValidationException("files", $"Mỗi phiếu tối đa {WorkOrder.MaxIntakePhotos} ảnh tiếp nhận.");

            var urls = await RepairPhotoUploader.SaveAsync(files, storage, ct);
            workOrder.AddIntakePhotos(urls.ToList());
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { workOrder.IntakePhotoUrls });
        }).DisableAntiforgery(); // upload multipart trong minimal API — cùng cách MediaEndpoints

        group.MapDelete("/intake-photos", async (Guid id, string url, RepairDbContext db,
            IFileStorage storage, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var workOrder = await LoadAsync(db, user, id, ct);
            if (!workOrder.RemoveIntakePhoto(url))
                throw new NotFoundException("Ảnh không thuộc phiếu này.");

            await db.SaveChangesAsync(ct);
            await storage.DeleteAsync(url, ct); // chỉ xoá được URL đúng của phiếu (đã kiểm ở trên)
            return Results.Ok(new { workOrder.IntakePhotoUrls });
        });

        group.MapPost("/progress-photos", async (Guid id, IFormFileCollection files, [FromForm] WorkOrderPhotoStage stage,
            [FromForm] string? note, RepairDbContext db, IFileStorage storage, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var workOrder = await LoadAsync(db, user, id, ct);
            if (!Enum.IsDefined(stage))
                throw new RequestValidationException("stage", "Chọn ảnh trước hoặc sau khi sửa.");
            if (note?.Length > 1000)
                throw new RequestValidationException("note", "Ghi chú tối đa 1000 ký tự.");

            var urls = await RepairPhotoUploader.SaveAsync(files, storage, ct);
            TechnicianAccess.TryGetUserId(user, out var userId);
            var log = WorkOrderActivityLog.CreatePhotos(workOrder.Id, stage, urls.ToList(), note, userId, TechnicianAccess.GetUserName(user));
            workOrder.AddActivityLog(log);
            db.WorkOrderActivityLogs.Add(log); // stage tường minh — xem WorkOrder.AddActivityLog
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { LogId = log.Id, Stage = stage.ToString(), log.PhotoUrls });
        }).DisableAntiforgery();
    }

    private static async Task<WorkOrder> LoadAsync(RepairDbContext db, ClaimsPrincipal user, Guid id, CancellationToken ct)
    {
        var workOrder = await db.WorkOrders.FirstOrDefaultAsync(w => w.Id == id, ct)
            ?? throw NotFoundException.For("phiếu sửa chữa", id);
        if (!await RepairQuoteAccess.CanManageAsync(db, user, workOrder))
            throw new ForbiddenException("Chỉ kỹ thuật viên được giao phiếu hoặc quản lý mới thao tác được.");
        return workOrder;
    }
}

public sealed record UpdateIntakeDto(
    WorkOrderPriority Priority,
    string? DeviceType,
    string? DeviceBrand,
    string? DeviceModel,
    string? SerialNumber,
    List<string>? AccessoriesReceived,
    Guid? ServiceTypeId);
