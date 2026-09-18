using Accounting.Endpoints;
using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;

namespace Accounting;

/// <summary>
/// Điểm lắp ráp các nhóm endpoint của module Kế toán.
///
/// W2-14 đã tách file 876 dòng cũ theo từng aggregate (hoá đơn, AR, AP, chi phí, ca thu ngân,
/// sổ quỹ, giấy báo có, máy tính thuế). Nhóm CA THU NGÂN cố tình nằm NGOÀI nhóm
/// <c>/api/accounting</c> vì nó chạy dưới quyền <c>Permissions.Sales.Pos</c> chứ không phải
/// quyền của module Kế toán — xem <see cref="ShiftEndpoints"/>.
/// </summary>
public static class AccountingEndpoints
{
    public static void MapAccountingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/accounting")
            .RequireModulePermissions(PermissionModules.Accounting);

        group.MapOrganizationAccountEndpoints();
        group.MapInvoiceEndpoints();
        group.MapAccountsReceivableEndpoints();
        group.MapAccountsPayableEndpoints();
        group.MapCreditNoteEndpoints();
        group.MapCashBookEndpoints();
        group.MapExpenseCategoryEndpoints();
        group.MapExpenseEndpoints();

        app.MapShiftEndpoints();
        app.MapShiftOversightEndpoints();
        app.MapTaxCalculatorEndpoints();
    }
}
