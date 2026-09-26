using System.Security.Claims;
using BuildingBlocks.Security;
using BuildingBlocks.Validation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Warranty.Domain;
using Warranty.Infrastructure;
using BuildingBlocks.Endpoints;

namespace Warranty;

/// <summary>
/// W2-6: vòng đời WarrantyClaim — approve/reject/resolve/assign/receipt. Split ra khỏi
/// claim-endpoints.cs để mỗi file dưới ~200 dòng; mapped từ <c>MapClaimEndpoints</c>, không đăng ký
/// trực tiếp ở Program.cs (xem warranty-endpoints.cs cho ghi chú "fan out từ 1 entry point").
/// </summary>
public static class ClaimActionEndpoints
{
    /// <summary>
    /// D08 §4 (binding): số ngày CÔNG BỐ trên biên nhận — mốc pháp lý Đ30.2.đ, KHÔNG phải SLA nội
    /// bộ (168h/504h/48h ở <see cref="WarrantyPolicySeeder"/>, không bao giờ in cho khách). Khớp
    /// đúng con số trong <c>WarrantyPolicySeeder.CoverageTerms</c>: thẩm định 3 ngày làm việc, sửa
    /// tại cửa hàng 15 ngày, gửi hãng trong nước 30 ngày. ExchangeNew đổi máy ngay tại quầy nên
    /// không có hạn xử lý nhiều-ngày; Rejected không có hạn xử lý.
    /// </summary>
    internal static int PublishedTurnaroundDaysFor(ClaimType type) => type switch
    {
        ClaimType.RepairAtShop => 15,
        ClaimType.SendToManufacturer => 30,
        ClaimType.ExchangeNew => 3,
        _ => 3
    };

    public static void MapClaimActionEndpoints(this IEndpointRouteBuilder app)
    {
        // W1-10: GET -> Warranty.ViewAll, POST/PUT -> ReviewClaim, DELETE -> ApproveClaim.
        var adminGroup = app.MapGroup("/api/warranty/admin")
            .RequireModulePermissions(PermissionModules.Warranty);

        // Approve claim
        adminGroup.MapPost("/claims/{id:guid}/approve", async (Guid id, WarrantyDbContext db, ClaimsPrincipal user) =>
        {
            var claim = await db.Claims.FirstOrDefaultAsync(c => c.Id == id);
            if (claim == null)
                return Results.NotFound(new { Message = "Không tìm thấy yêu cầu bảo hành" });
            if (claim.Status != ClaimStatus.Pending)
                return Results.BadRequest(new { Message = "Chỉ có thể duyệt yêu cầu đang chờ xử lý" });

            var approverId = ClaimEndpoints.ActorId(user);
            claim.Approve(approverId);
            await db.SaveChangesAsync();

            var userName = user.FindFirstValue(ClaimTypes.Name) ?? "Admin";
            return Results.Ok(new
            {
                Message = "Đã duyệt yêu cầu bảo hành",
                claim.Id,
                Status = claim.Status.ToString(),
                ApprovedBy = userName,
                ApprovedById = approverId
            });
        });

        // Reject claim
        adminGroup.MapPost("/claims/{id:guid}/reject", async (
            Guid id, [FromBody] RejectClaimDto dto, WarrantyDbContext db, ClaimsPrincipal user) =>
        {
            var claim = await db.Claims.FirstOrDefaultAsync(c => c.Id == id);
            if (claim == null)
                return Results.NotFound(new { Message = "Không tìm thấy yêu cầu bảo hành" });
            if (claim.Status == ClaimStatus.Resolved || claim.Status == ClaimStatus.Rejected)
                return Results.BadRequest(new { Message = "Yêu cầu đã được xử lý" });

            claim.Reject(dto.Reason);
            await db.SaveChangesAsync();

            var userName = user.FindFirstValue(ClaimTypes.Name) ?? "Admin";
            return Results.Ok(new
            {
                Message = "Đã từ chối yêu cầu bảo hành",
                claim.Id,
                Status = claim.Status.ToString(),
                claim.ResolutionNotes,
                RejectedBy = userName
            });
        }).WithValidation<RejectClaimDto>();

        // Resolve claim (complete the repair/replacement/refund)
        adminGroup.MapPost("/claims/{id:guid}/resolve", async (
            Guid id, [FromBody] ResolveClaimDto dto, WarrantyDbContext db, ClaimsPrincipal user) =>
        {
            var claim = await db.Claims.FirstOrDefaultAsync(c => c.Id == id);
            if (claim == null)
                return Results.NotFound(new { Message = "Không tìm thấy yêu cầu bảo hành" });

            // W0-3: AssignHandling chuyển claim sang InProgress, nhưng guard cũ chỉ nhận Approved
            // ⇒ mọi claim đã giao xử lý đều kẹt, không bao giờ đóng được. Nhận cả hai trạng thái.
            if (claim.Status != ClaimStatus.Approved && claim.Status != ClaimStatus.InProgress)
                return Results.BadRequest(new { Message = "Chỉ có thể hoàn thành yêu cầu đã được duyệt hoặc đang xử lý" });

            var resolverId = ClaimEndpoints.ActorId(user);
            claim.Resolve(dto.Notes, resolverId);

            // D08 §4: đóng vòng "3 lần" — >=3 claim Resolved trên cùng serial => cờ đổi mới/hoàn tiền.
            var resolvedCount = await db.Claims.CountAsync(c =>
                c.SerialNumber == claim.SerialNumber && c.Status == ClaimStatus.Resolved) + 1;
            await db.SaveChangesAsync();

            var userName = user.FindFirstValue(ClaimTypes.Name) ?? "Admin";
            return Results.Ok(new
            {
                Message = "Đã hoàn thành xử lý yêu cầu bảo hành",
                claim.Id,
                Status = claim.Status.ToString(),
                claim.ResolutionNotes,
                claim.ResolvedDate,
                ResolvedBy = userName,
                ResolvedById = resolverId,
                ResolvedClaimCountForSerial = resolvedCount,
                EligibleForReplaceOrRefund = resolvedCount >= 3
            });
        }).WithValidation<ResolveClaimDto>();

        // Phase 07: Assign handling — chọn ClaimType + SLA cho claim đã Approved.
        adminGroup.MapPost("/claims/{id:guid}/assign", async (
            Guid id, [FromBody] AssignClaimDto dto, WarrantyDbContext db) =>
        {
            var claim = await db.Claims.FirstOrDefaultAsync(c => c.Id == id);
            if (claim == null) return Results.NotFound(new { Message = "Không tìm thấy yêu cầu bảo hành" });

            var policy = await db.SlaPolicies.FirstOrDefaultAsync(p => p.ClaimType == dto.ClaimType && p.IsActive);
            var hours = policy?.TargetHours ?? 48;

            try
            {
                claim.AssignHandling(dto.ClaimType, hours);
                if (dto.WorkOrderId.HasValue) claim.LinkWorkOrder(dto.WorkOrderId.Value);
                if (dto.RmaId.HasValue) claim.LinkRma(dto.RmaId.Value);
                if (dto.LoanerDeviceId.HasValue) claim.LinkLoanerDevice(dto.LoanerDeviceId.Value);
                claim.ReceiveDevice(); // D08 §4: mốc nhận máy để cộng bù thời gian xử lý sau này.
                // D08 §4 (binding): "hai lớp thời gian" — số ngày CÔNG BỐ trên biên nhận (mốc pháp
                // lý Đ30.2.đ), khác SLA nội bộ ở trên. Trước bản này CommittedTurnaroundDays không
                // bao giờ được set (luôn null) dù cột đã tồn tại — xem PublishedTurnaroundDaysFor.
                claim.SetCommittedTurnaround(PublishedTurnaroundDaysFor(dto.ClaimType));
                await db.SaveChangesAsync();
                return Results.Ok(new
                {
                    claim.Id,
                    ClaimType = claim.ClaimType?.ToString(),
                    claim.SlaDeadline,
                    claim.CommittedTurnaroundDays,
                    Status = claim.Status.ToString()
                });
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { Error = ClientSafeError.Message(ex) }); }
        });

        // Phase 07: Sinh phiếu tiếp nhận bảo hành (JSON — frontend render + in).
        adminGroup.MapGet("/claims/{id:guid}/receipt", async (
            Guid id, Warranty.Application.WarrantyReceiptGenerator gen, HttpContext http) =>
        {
            var baseUrl = $"{http.Request.Scheme}://{http.Request.Host}";
            var dto = await gen.BuildAsync(id, baseUrl);
            return dto == null ? Results.NotFound() : Results.Ok(dto);
        });
    }
}

public record RejectClaimDto(string Reason);
public record ResolveClaimDto(string Notes);

public record AssignClaimDto(
    ClaimType ClaimType,
    Guid? WorkOrderId = null,
    Guid? RmaId = null,
    Guid? LoanerDeviceId = null);
