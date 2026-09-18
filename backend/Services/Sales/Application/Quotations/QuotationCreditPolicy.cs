using System.Security.Claims;
using BuildingBlocks.Configuration;
using BuildingBlocks.Security;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Application.Quotations;

/// <summary>
/// D10 — công nợ tối giản: switch toàn cục + quyền + hạn mức ngày + chặn khách đang có đơn
/// công nợ quá hạn. KHÔNG có bảng hạn mức tín dụng, KHÔNG <c>ICreditPolicy</c> (Key Insights).
/// </summary>
internal static class QuotationCreditPolicy
{
    private const string EnabledKey = "Sales:Credit:Enabled";
    private const string MaxTermDaysKey = "Sales:Credit:MaxTermDays";
    private const int DefaultMaxTermDays = 30;

    /// <summary>PaymentMethod ghi trên Order khi công nợ được chấp thuận.</summary>
    public const string CreditPaymentMethod = "Credit";

    public static async Task<(bool Allowed, string? Error)> EvaluateAsync(
        IAppSettings settings,
        ClaimsPrincipal user,
        SalesDbContext salesDb,
        int paymentTermDays,
        Guid? customerId,
        DateTime nowUtc,
        CancellationToken ct)
    {
        if (paymentTermDays <= 0) return (true, null);

        if (!settings.GetBool(EnabledKey, false))
            return (false, "Bán công nợ đang tắt (Sales:Credit:Enabled=false)");

        var hasPermission = user.HasClaim(Permissions.PermissionType, Permissions.Sales.SellOnCredit)
            || user.IsInRole(Roles.Admin);
        if (!hasPermission)
            return (false, "Không có quyền Sales.SellOnCredit");

        var maxTermDays = settings.GetInt(MaxTermDaysKey, DefaultMaxTermDays);
        if (paymentTermDays > maxTermDays)
            return (false, $"Hạn công nợ {paymentTermDays} ngày vượt mức tối đa {maxTermDays} ngày");

        if (customerId is { } cid && cid != Guid.Empty)
        {
            var hasOverdue = await salesDb.Orders.AsNoTracking().IgnoreQueryFilters()
                .AnyAsync(o =>
                    o.CustomerId == cid &&
                    o.PaymentMethod == CreditPaymentMethod &&
                    o.PaymentStatus != PaymentStatus.Paid &&
                    o.PaymentDueDate != null &&
                    o.PaymentDueDate < nowUtc,
                    ct);
            if (hasOverdue)
                return (false, "Khách hàng đang có đơn công nợ quá hạn — từ chối bán công nợ tiếp");
        }

        return (true, null);
    }
}
