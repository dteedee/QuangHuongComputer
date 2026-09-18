using System.Security.Claims;
using BuildingBlocks.Configuration;
using BuildingBlocks.Security;

namespace Sales.Application.Quotations;

/// <summary>
/// Gate hạn mức giảm giá dưới giá niêm yết (Implementation Steps #3).
///
/// Phase file yêu cầu "reuse W2-10's limit rather than adding a second one" — tại thời điểm
/// triển khai (2026-09-18), W2-10 (chạy song song) CHƯA có khái niệm hạn mức duyệt nào trong
/// codebase (đã grep `ApprovalLimit`/`DiscountLimit` toàn repo, 0 kết quả ngoài Promotion — không
/// liên quan). Để không tự chế một bảng hạn mức thứ hai, policy này chỉ có MỘT ngưỡng % cấu hình
/// (không theo người) + quyền duyệt — xem integration-requests-w2.md để W2-10/gate hợp nhất khi
/// hạn mức thật xuất hiện.
/// </summary>
internal static class QuotationDiscountApprovalPolicy
{
    private const string MaxDiscountPercentWithoutApprovalKey = "Sales:Quotations:MaxDiscountPercentWithoutApprovalPercent";
    private const decimal DefaultMaxDiscountPercentWithoutApproval = 10m;

    /// <summary>
    /// Trả về null nếu hợp lệ, thông báo lỗi nếu tổng % giảm giá vượt ngưỡng mà người tạo
    /// không có <c>Sales.Quotations.Approve</c>.
    /// </summary>
    public static string? Validate(
        IAppSettings settings,
        ClaimsPrincipal user,
        IReadOnlyList<CreateQuotationLineRequest> lines,
        IReadOnlyDictionary<(Guid ProductId, Guid? VariantId), decimal> listPrices)
    {
        var totalListValue = 0m;
        var totalDiscount = 0m;

        foreach (var line in lines)
        {
            var listPrice = listPrices.GetValueOrDefault((line.ProductId, line.VariantId));
            var effectiveUnitPrice = line.UnitPriceOverride ?? listPrice;
            var discountFromListPrice = Math.Max(0m, (listPrice - effectiveUnitPrice) * line.Quantity) + Math.Max(0m, line.LineDiscount);

            totalListValue += listPrice * line.Quantity;
            totalDiscount += discountFromListPrice;
        }

        if (totalListValue <= 0m || totalDiscount <= 0m) return null;

        var discountPercent = totalDiscount / totalListValue * 100m;
        var maxWithoutApproval = settings.GetDecimal(
            MaxDiscountPercentWithoutApprovalKey, DefaultMaxDiscountPercentWithoutApproval);

        if (discountPercent <= maxWithoutApproval) return null;

        var canApprove = user.HasClaim(Permissions.PermissionType, Permissions.Sales.Quotations.Approve)
            || user.IsInRole(Roles.Admin);

        return canApprove
            ? null
            : $"Giảm giá {discountPercent:F1}% vượt hạn mức {maxWithoutApproval:F0}% — cần người có quyền Sales.Quotations.Approve duyệt";
    }
}
