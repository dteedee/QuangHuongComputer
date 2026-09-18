using Accounting.Application.EInvoice;
using Accounting.Infrastructure;
using Accounting.Infrastructure.EInvoice;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Paging;
using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Accounting;

/// <summary>
/// Hoá đơn điện tử (D07). Hợp đồng đầy đủ: <c>docs/api-contracts/accounting-einvoice.md</c>.
///
/// Các route <c>/cancel</c>, <c>/replace</c>, <c>/pdf</c> của bản cũ đã bị XOÁ: chúng gọi thẳng
/// một nhà cung cấp hư cấu (MISA) và không bao giờ chạy được. Điều chỉnh/thay thế/tải XML thực
/// hiện trên phần mềm của nhà cung cấp cho tới khi track adapter thật ra đời (D07 §Bước tiếp theo).
/// </summary>
public static class EInvoiceEndpoints
{
    public static void MapEInvoiceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/accounting/einvoice")
            .RequireModulePermissions(PermissionModules.Accounting);

        // 1. Chế độ đang chạy — giao diện dùng để hiện badge đỏ SANDBOX.
        group.MapGet("/mode", (EInvoiceService service) => Results.Ok(service.Mode()))
            .RequireAuthorization(Permissions.Accounting.ViewInvoices)
            .WithName("GetEInvoiceMode");

        // 2. Hàng đợi "Chờ xuất HĐĐT" — cũ nhất trước, kèm số ngày chờ và cờ trễ.
        group.MapGet("/queue", async (
            [AsParameters] PagedRequest request,
            [FromQuery] bool? onlyLate,
            EInvoiceQueueService queue,
            CancellationToken ct) => Results.Ok(await queue.GetAsync(request, onlyLate ?? false, ct)))
            .RequireAuthorization(Permissions.Accounting.ViewInvoices)
            .WithName("GetEInvoiceQueue");

        // 3. Xuất Excel để nhập hàng loạt vào phần mềm HĐĐT của nhà cung cấp.
        group.MapGet("/export", async (
            [FromQuery] bool? onlyLate,
            EInvoiceQueueService queue,
            BuildingBlocks.Time.IBusinessClock clock,
            CancellationToken ct) =>
        {
            var items = await queue.GetForExportAsync(onlyLate ?? false, ct: ct);
            var bytes = EInvoiceQueueExporter.Build(items);
            return Results.File(bytes, EInvoiceQueueExporter.ContentType,
                $"cho-xuat-hddt-{clock.TodayVn:yyyyMMdd}.xlsx");
        })
            .RequireAuthorization(Permissions.Accounting.Export)
            .WithName("ExportEInvoiceQueue");

        // 4. Phát hành theo MÃ HOÁ ĐƠN (route chuẩn).
        group.MapPost("/issue/{invoiceId:guid}", async (
            Guid invoiceId, EInvoiceService service, CancellationToken ct) =>
            Results.Ok(await service.IssueAsync(invoiceId, ct)))
            .RequireAuthorization(Permissions.Accounting.ManageInvoices)
            .WithName("IssueEInvoice");

        // 5. Phát hành theo MÃ ĐƠN HÀNG — giao diện cũ gọi /issue/{orderId}; route này giữ cho
        //    người dùng đi từ màn hình đơn hàng mà không phải tra mã hoá đơn trước.
        group.MapPost("/issue/by-order/{orderId:guid}", async (
            Guid orderId, EInvoiceService service, CancellationToken ct) =>
            Results.Ok(await service.IssueByOrderAsync(orderId, ct)))
            .RequireAuthorization(Permissions.Accounting.ManageInvoices)
            .WithName("IssueEInvoiceByOrder");

        // 6. Ghi nhận hoá đơn ĐÃ XUẤT trên phần mềm nhà cung cấp (chế độ External).
        group.MapPost("/{invoiceId:guid}/record-external", async (
            Guid invoiceId,
            [FromBody] RecordExternalEInvoiceRequest request,
            EInvoiceService service,
            CancellationToken ct) =>
            Results.Ok(await service.RecordExternalAsync(invoiceId, request, ct)))
            .RequireAuthorization(Permissions.Accounting.ManageInvoices)
            .WithName("RecordExternalEInvoice");

        // 7. Bổ sung thông tin người mua sau khi đặt hàng — khoá ngay khi HĐĐT đã xuất
        //    (Phụ lục mục 4b NĐ 254/2026: hoá đơn thiếu thông tin người mua không dùng để kê khai).
        group.MapPut("/{invoiceId:guid}/buyer", async (
            Guid invoiceId,
            [FromBody] UpdateEInvoiceBuyerRequest request,
            EInvoiceService service,
            CancellationToken ct) =>
            Results.Ok(await service.UpdateBuyerAsync(invoiceId, request, ct)))
            .RequireAuthorization(Permissions.Accounting.EditInvoice)
            .WithName("UpdateEInvoiceBuyer");

        // 8. Trạng thái HĐĐT của một hoá đơn nội bộ.
        group.MapGet("/status/{invoiceId:guid}", async (
            Guid invoiceId, AccountingDbContext db, IEInvoiceProvider provider, CancellationToken ct) =>
        {
            var invoice = await db.Invoices.AsNoTracking()
                .Where(i => i.Id == invoiceId)
                .Select(i => new
                {
                    i.Id, i.InvoiceNumber, i.EInvoiceId, i.EInvoiceNumber,
                    i.EInvoiceLookupCode, i.EInvoiceStatus, i.EInvoiceIssuedAt
                })
                .FirstOrDefaultAsync(ct)
                ?? throw NotFoundException.For("hoá đơn", invoiceId);

            var status = invoice.EInvoiceStatus ?? EInvoiceStatuses.NotIssued;
            var providerStatus = await provider.GetStatusAsync(invoiceId.ToString(), ct);

            return Results.Ok(new EInvoiceResultDto(
                invoice.Id, invoice.InvoiceNumber, status, provider.ProviderCode, provider.IsSandbox,
                string.IsNullOrWhiteSpace(invoice.EInvoiceId) ? null : invoice.EInvoiceId,
                string.IsNullOrWhiteSpace(invoice.EInvoiceNumber) ? null : invoice.EInvoiceNumber,
                string.IsNullOrWhiteSpace(invoice.EInvoiceLookupCode) ? null : invoice.EInvoiceLookupCode,
                invoice.EInvoiceIssuedAt,
                provider.IsSandbox ? EInvoiceNotices.Sandbox : providerStatus.Note));
        })
            .RequireAuthorization(Permissions.Accounting.ViewInvoices)
            .WithName("GetEInvoiceStatus");
    }
}
