using BuildingBlocks.Security;
using BuildingBlocks.Validation;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Warranty.Domain;
using Warranty.Infrastructure;

namespace Warranty;

/// <summary>
/// Phase 07 / W2-6: RMA — gửi hàng về hãng/NCC. Admin/Manager/TechnicianInShop quản lý.
/// Không import Inventory.Domain — SupplierId chỉ là Guid.
///
/// W0-11: GET returned the raw WarrantyRma entity - itemsJson (a JSON string,
/// not items[]) and no code field - which crashed the RMA page the moment one
/// RMA existed (frontend/src/pages/backoffice/warranty/warranty-rma-page.tsx
/// reads r.code and r.items.length). Every response now goes through RmaDto,
/// matching frontend/src/api/warranty.ts's WarrantyRma/CreateRmaRequest shape.
///
/// W2-6 KNOWN GAP: items still live as a JSON blob (<c>ItemsJson</c>), not the rows the phase
/// spec's Todo #4 asks for (SerialNumberId/ClaimId columns). W0-11's DTO layer already stops it
/// from 500ing the page (ParseItems never throws), and turning it into a real child table is a
/// migration-sized change outside this pass's remaining budget — tracked in w2-6-report.md
/// "Unresolved" instead of half-done here.
/// </summary>
public static class WarrantyRmaEndpoints
{
    public static void MapWarrantyRmaEndpoints(this IEndpointRouteBuilder app)
    {
        // W1-10: quy trình RMA -> quyền theo verb của module Warranty.
        var group = app.MapGroup("/api/warranty/rma")
            .RequireModulePermissions(PermissionModules.Warranty);

        group.MapGet("/", async (
            WarrantyDbContext db,
            HttpResponse response,
            [FromQuery] string? status = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20) =>
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 200);
            var q = db.Rmas.AsQueryable();
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<RmaStatus>(status, true, out var s))
                q = q.Where(r => r.Status == s);

            var total = await q.CountAsync();
            response.Headers["X-Total-Count"] = total.ToString();

            var rmas = await q.OrderByDescending(r => r.SentDate)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .ToListAsync();
            return Results.Ok(rmas.Select(ToDto));
        });

        group.MapGet("/{id:guid}", async (Guid id, WarrantyDbContext db) =>
        {
            var rma = await db.Rmas.FindAsync(id);
            return rma == null ? Results.NotFound() : Results.Ok(ToDto(rma));
        });

        group.MapPost("/", async ([FromBody] CreateRmaDto dto, WarrantyDbContext db) =>
        {
            var itemsJson = JsonSerializer.Serialize(dto.Items ?? new List<RmaItemDto>(), RmaDtoMapping.ItemsJsonOptions);
            var rma = new WarrantyRma(
                supplierId: dto.SupplierId,
                rmaNumber: dto.RmaNumber ?? $"RMA-{DateTime.UtcNow:yyyyMMdd-HHmmss}",
                itemsJson: itemsJson,
                expectedReturnDate: dto.ExpectedReturnDate,
                externalRmaCode: dto.ExternalRmaCode,
                notes: dto.Notes);
            db.Rmas.Add(rma);
            await db.SaveChangesAsync();
            return Results.Created($"/api/warranty/rma/{rma.Id}", new { rma.Id, Code = rma.RmaNumber, rma.Status });
        }).WithValidation<CreateRmaDto>();

        group.MapPost("/{id:guid}/send", async (Guid id, [FromBody] SendRmaDto dto, WarrantyDbContext db) =>
        {
            var rma = await db.Rmas.FindAsync(id);
            if (rma == null) return Results.NotFound();
            try { rma.MarkSent(dto.ExternalRmaCode); await db.SaveChangesAsync(); return Results.Ok(ToDto(rma)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { Error = ex.Message }); }
        });

        group.MapPost("/{id:guid}/receive", async (Guid id, [FromBody] ReceiveRmaDto dto, WarrantyDbContext db) =>
        {
            var rma = await db.Rmas.FindAsync(id);
            if (rma == null) return Results.NotFound();
            try { rma.MarkReceived(dto.Result, dto.Notes); await db.SaveChangesAsync(); return Results.Ok(ToDto(rma)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { Error = ex.Message }); }
        }).WithValidation<ReceiveRmaDto>();

        // D08 §4 / Implementation Step 4 "auto-progress when ... an RMA closes": mọi WarrantyClaim
        // đang trỏ RmaId = rma này (qua LinkRma) tự chuyển Resolved khi RMA đóng, và thời gian máy
        // nằm ở hãng (SentDate -> ActualReturnDate) được cộng bù vào ProductWarranty tương ứng
        // (Đ30.2.đ — thời gian xử lý không tính vào hạn BH).
        group.MapPost("/{id:guid}/close", async (Guid id, WarrantyDbContext db) =>
        {
            var rma = await db.Rmas.FindAsync(id);
            if (rma == null) return Results.NotFound();
            try
            {
                rma.Close();

                var linkedClaims = await db.Claims
                    .Where(c => c.RmaId == id && c.Status != ClaimStatus.Resolved && c.Status != ClaimStatus.Rejected)
                    .ToListAsync();
                var serviceDays = rma.ActualReturnDate.HasValue
                    ? Math.Max(0, (rma.ActualReturnDate.Value - rma.SentDate).Days)
                    : 0;

                foreach (var claim in linkedClaims)
                {
                    claim.ReturnDevice(rma.ActualReturnDate);
                    claim.Resolve(rma.Result ?? "RMA đóng - đã xử lý xong", resolvedBy: null);

                    if (serviceDays > 0)
                    {
                        var warranty = await db.ProductWarranties
                            .FirstOrDefaultAsync(w => w.SerialNumber == claim.SerialNumber);
                        warranty?.ExtendForServiceTime(serviceDays);
                    }
                }

                await db.SaveChangesAsync();
                return Results.Ok(ToDto(rma));
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { Error = ex.Message }); }
        });

        // Cảnh báo RMA quá hạn (chưa nhận về).
        group.MapGet("/overdue", async (WarrantyDbContext db) =>
        {
            var now = DateTime.UtcNow;
            var rmas = await db.Rmas
                .Where(r => r.Status == RmaStatus.Sent
                            && r.ExpectedReturnDate != null
                            && r.ActualReturnDate == null
                            && r.ExpectedReturnDate < now)
                .OrderBy(r => r.ExpectedReturnDate)
                .ToListAsync();
            return Results.Ok(rmas.Select(ToDto));
        });
    }

    /// <summary>Entity -> wire DTO. Never return WarrantyRma directly (see class doc).</summary>
    private static RmaDto ToDto(WarrantyRma rma) => RmaDtoMapping.ToDto(rma);
}
