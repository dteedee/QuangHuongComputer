using Microsoft.EntityFrameworkCore;
using Repair.Domain;
using Repair.Infrastructure;

namespace Repair.Application.Quotes;

/// <summary>
/// Đổi yêu cầu của client thành <see cref="RepairQuoteLineDraft"/>: điền giá/tên từ danh mục dịch
/// vụ khi dòng chỉ chọn dịch vụ, và đổi ba con số kiểu cũ thành dòng. Không tính tiền ở đây —
/// việc đó là của <see cref="RepairQuoteCalculator"/>.
/// </summary>
public static class RepairQuoteDraftBuilder
{
    public static async Task<IReadOnlyList<RepairQuoteLineDraft>> BuildAsync(
        RepairDbContext db, UpsertQuoteRequest request, CancellationToken ct = default)
    {
        if (request.Lines is not { Count: > 0 })
            return FromLegacyTotals(request);

        var serviceIds = request.Lines.Where(l => l.ServiceTypeId.HasValue).Select(l => l.ServiceTypeId!.Value).Distinct().ToList();
        var services = serviceIds.Count == 0
            ? new Dictionary<Guid, (string Name, decimal BasePrice)>()
            : await db.RepairServiceTypes.AsNoTracking()
                .Where(s => serviceIds.Contains(s.Id))
                .ToDictionaryAsync(s => s.Id, s => (s.Name, s.BasePrice), ct);

        return request.Lines.Select((l, i) =>
        {
            (string Name, decimal BasePrice)? service = null;
            if (l.ServiceTypeId is Guid sid)
            {
                if (!services.TryGetValue(sid, out var found))
                    throw new BuildingBlocks.Endpoints.RequestValidationException($"lines[{i}].serviceTypeId", "Dịch vụ không tồn tại trong danh mục.");
                service = found;
            }

            return new RepairQuoteLineDraft(
                l.Kind,
                string.IsNullOrWhiteSpace(l.Description) ? service?.Name ?? string.Empty : l.Description,
                l.Quantity,
                l.UnitPrice ?? service?.BasePrice ?? 0m,
                l.LineDiscount,
                l.Kind == RepairQuoteLineKind.Part ? l.InventoryItemId : null,
                l.Kind == RepairQuoteLineKind.Part ? l.ProductId : null,
                l.ServiceTypeId);
        }).ToList();
    }

    private static IReadOnlyList<RepairQuoteLineDraft> FromLegacyTotals(UpsertQuoteRequest r)
    {
        var drafts = new List<RepairQuoteLineDraft>();
        void Add(RepairQuoteLineKind kind, string name, decimal? amount)
        {
            if (amount is > 0) drafts.Add(new RepairQuoteLineDraft(kind, name, 1m, Math.Round(amount.Value, 0, MidpointRounding.AwayFromZero)));
        }

        Add(RepairQuoteLineKind.Part, "Linh kiện", r.PartsCost);
        Add(RepairQuoteLineKind.Labor, "Công sửa chữa", r.LaborCost);
        Add(RepairQuoteLineKind.Service, "Phí dịch vụ", r.ServiceFee);
        return drafts; // rỗng ⇒ calculator báo "phải có ít nhất một dòng"
    }
}
