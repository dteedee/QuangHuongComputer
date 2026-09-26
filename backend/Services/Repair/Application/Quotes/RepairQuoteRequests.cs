using Repair.Domain;

namespace Repair.Application.Quotes;

/// <summary>
/// Một dòng báo giá client gửi lên. <see cref="UnitPrice"/> để trống + <see cref="ServiceTypeId"/>
/// ⇒ server lấy giá gốc của dịch vụ trong danh mục; <see cref="Description"/> trống ⇒ tên dịch vụ.
/// Mọi số tiền là VND nguyên ĐÃ GỒM VAT.
/// </summary>
public sealed record QuoteLineRequest(
    RepairQuoteLineKind Kind,
    string? Description,
    decimal Quantity,
    decimal? UnitPrice,
    decimal LineDiscount = 0m,
    Guid? InventoryItemId = null,
    Guid? ProductId = null,
    Guid? ServiceTypeId = null);

/// <summary>
/// Tạo/sửa/xem trước báo giá. <see cref="Lines"/> là cách chuẩn; ba con số cũ
/// (<see cref="PartsCost"/>/<see cref="LaborCost"/>/<see cref="ServiceFee"/>) chỉ còn để client cũ
/// không vỡ — khi không có dòng nào, server tự đổi chúng thành dòng giống migration
/// 20260927091000_AddRepairQuoteLines.
/// </summary>
public sealed record UpsertQuoteRequest(
    List<QuoteLineRequest>? Lines,
    decimal DiscountAmount = 0m,
    decimal EstimatedHours = 0m,
    decimal HourlyRate = 0m,
    string? Description = null,
    string? Notes = null,
    decimal? PartsCost = null,
    decimal? LaborCost = null,
    decimal? ServiceFee = null);

public sealed record RejectQuoteDto(string Reason);
