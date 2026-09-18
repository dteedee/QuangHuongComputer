using System.Security.Claims;
using BuildingBlocks.Configuration;
using BuildingBlocks.Documents;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using Catalog.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Sales.Application.Checkout;
using Sales.Application.Pricing;
using Sales.Application.Quotations;
using Sales.Infrastructure;

namespace Sales.Endpoints.Quotations;

/// <summary>
/// Báo giá B2B — **W2-19** (`phase-68`). Route: <c>/api/sales/quotations</c> (Key Insights: KHÔNG
/// dùng chữ "quote" — <c>/pos/quote</c> và <c>RepairQuotes</c> đã có nghĩa khác).
///
/// CRUD ở đây; các hành động chuyển trạng thái (send/accept/reject/convert) ở
/// <c>QuotationActionEndpoints.cs</c> (giữ mỗi file dưới 200 dòng — development-rules.md).
/// </summary>
internal static partial class QuotationEndpoints
{
    public static void MapQuotationEndpoints(RouteGroupBuilder group, RouteGroupBuilder adminGroup)
    {
        var quotations = group.MapGroup("/quotations");

        quotations.MapGet("/", async (
            SalesDbContext db, CancellationToken ct,
            string? status = null, Guid? customerId = null,
            DateTime? validAfter = null, DateTime? validBefore = null, string? createdBy = null,
            int page = 1, int pageSize = 20) =>
        {
            var result = await QuotationService.ListAsync(
                db, status, customerId, validAfter, validBefore, createdBy, page, pageSize, ct);
            return Results.Ok(result);
        }).RequireAuthorization(Permissions.Sales.Quotations.View);

        quotations.MapGet("/{id:guid}", async (Guid id, SalesDbContext db, CancellationToken ct) =>
        {
            var quotation = await QuotationService.LoadAsync(db, id, ct);
            return quotation == null
                ? Results.NotFound(new { Error = "Không tìm thấy báo giá" })
                : Results.Ok(QuotationService.ToDto(quotation));
        }).RequireAuthorization(Permissions.Sales.Quotations.View);

        quotations.MapPost("/", async (
            UpsertQuotationRequest req,
            SalesDbContext salesDb, CatalogDbContext catalogDb, LineVatProfileResolver vatResolver,
            IDocumentNumberService documentNumbers, IAppSettings settings, IBusinessClock clock,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            var (quotation, error) = await QuotationService.CreateAsync(
                salesDb, catalogDb, vatResolver, documentNumbers, settings, clock, user, req, ct);
            return error != null
                ? Results.BadRequest(new { Error = error })
                : Results.Created($"/api/sales/quotations/{quotation!.Id}", QuotationService.ToDto(quotation));
        }).RequireAuthorization(Permissions.Sales.Quotations.Create);

        quotations.MapPut("/{id:guid}", async (
            Guid id, UpsertQuotationRequest req,
            SalesDbContext salesDb, CatalogDbContext catalogDb, LineVatProfileResolver vatResolver,
            IAppSettings settings, IBusinessClock clock, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var (quotation, error) = await QuotationService.UpdateAsync(
                salesDb, catalogDb, vatResolver, settings, clock, user, id, req, ct);
            return error != null
                ? Results.BadRequest(new { Error = error })
                : Results.Ok(QuotationService.ToDto(quotation!));
        }).RequireAuthorization(Permissions.Sales.Quotations.Edit);

        quotations.MapGet("/{id:guid}/print", async (
            Guid id, SalesDbContext db, IAppSettings settings, CancellationToken ct) =>
        {
            var quotation = await QuotationService.LoadAsync(db, id, ct);
            return quotation == null
                ? Results.NotFound(new { Error = "Không tìm thấy báo giá" })
                : Results.Ok(QuotationPrintPayloadBuilder.Build(quotation, settings));
        }).RequireAuthorization(Permissions.Sales.Quotations.View);

        MapActionEndpoints(quotations);
    }
}
