using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Application.Purchasing;

/// <summary>
/// Phân bổ chi phí nhập (landed cost) vào từng dòng GRN theo phương pháp:
///  - ByValue    (mặc định): tỷ trọng theo LineTotal (Quantity × UnitCost)
///  - ByWeight              : tỷ trọng theo (Weight sản phẩm × Quantity)
///  - ByQuantity            : chia đều theo Quantity
///
/// Kết quả:
///  1. Cập nhật InventoryItem.AverageCost theo weighted average:
///       newAvg = (oldQty × oldAvg + addedQty × unitCostActual) / (oldQty + addedQty)
///     với unitCostActual = supplierUnitCost + (landedShare / grnItem.Quantity)
///  2. Ghi StockMovement với UnitCost tại thời điểm.
///  3. Đánh dấu tất cả LandedCost.IsAllocated = true.
///
/// Không sửa GRNItem (thuộc luồng A). Landed cost per line trả về DTO cho endpoint hiển thị.
/// </summary>
public class LandedCostAllocator
{
    private readonly InventoryDbContext _db;

    public LandedCostAllocator(InventoryDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Chạy phân bổ cho toàn bộ landed cost chưa allocate của GRN. Trả về chi tiết per-line.
    /// Idempotent: đã allocate rồi thì bỏ qua (không double-count).
    /// </summary>
    public async Task<LandedCostAllocationResult> AllocateAsync(Guid grnId, CancellationToken ct = default)
    {
        var grn = await _db.GoodsReceivedNotes
            .Include(g => g.Items)
            .FirstOrDefaultAsync(g => g.Id == grnId, ct);
        if (grn == null)
            throw new InvalidOperationException($"GRN {grnId} không tồn tại");
        if (!grn.Items.Any())
            return new LandedCostAllocationResult(grnId, 0m, new List<LandedCostLineAllocation>());

        var pendingCosts = await _db.LandedCosts
            .Where(c => c.GRNId == grnId && !c.IsAllocated)
            .ToListAsync(ct);
        if (!pendingCosts.Any())
            return new LandedCostAllocationResult(grnId, 0m, new List<LandedCostLineAllocation>());

        var totalCost = pendingCosts.Sum(c => c.Amount);

        // Chuẩn bị dữ liệu weights cho từng method — tính 1 lần.
        var lines = grn.Items.ToList();

        // Product weights (nếu cần dùng ByWeight). Query product weight qua Catalog schema là cross-module —
        // ở đây chỉ có Inventory; nếu không tìm thấy Product.Weight, fallback về ByValue cho các cost ByWeight.
        // Giữ đơn giản: đọc trực tiếp bảng catalog qua raw SQL để tránh phụ thuộc DbContext.
        var productIds = lines.Select(l => l.ProductId).Distinct().ToList();
        var productWeights = await LoadProductWeightsAsync(productIds, ct);

        // Kho mặc định (D09) chỉ dùng khi phiếu nhập không nói kho nào.
        var defaultWarehouseId = await _db.Warehouses
            .Where(w => w.IsDefault && w.IsActive)
            .Select(w => (Guid?)w.Id)
            .FirstOrDefaultAsync(ct);

        var perLine = new Dictionary<Guid, decimal>();
        foreach (var line in lines) perLine[line.Id] = 0m;

        foreach (var cost in pendingCosts)
        {
            var (weights, useValueFallback) = ComputeWeights(cost.Method, lines, productWeights);
            var totalWeight = weights.Values.Sum();
            if (totalWeight == 0m)
            {
                // Fallback: chia đều theo số dòng để không mất tiền.
                var equal = cost.Amount / lines.Count;
                foreach (var line in lines) perLine[line.Id] += equal;
            }
            else
            {
                foreach (var line in lines)
                {
                    var share = cost.Amount * (weights[line.Id] / totalWeight);
                    perLine[line.Id] += share;
                }
            }
            cost.MarkAllocated();
        }

        // Cập nhật giá vốn của từng InventoryItem theo weighted average.
        var lineAllocations = new List<LandedCostLineAllocation>();
        foreach (var line in lines)
        {
            var share = perLine[line.Id];
            var unitCostActual = line.Quantity > 0
                ? line.UnitCost + (share / line.Quantity)
                : line.UnitCost;

            // W2-12: giải đúng MỘT dòng tồn theo (sản phẩm, biến thể, kho) — khoá nghiệp vụ mà
            // IX_Inventory_Product_Variant_Warehouse_Unique bảo vệ. Bản cũ lấy
            // FirstOrDefault(i => i.ProductId == ...) nên với sản phẩm nằm ở nhiều kho, chi phí
            // nhập rơi vào một dòng tồn ngẫu nhiên — giá vốn của kho khác sai lặng lẽ.
            var warehouseId = line.TargetWarehouseId ?? grn.WarehouseId ?? defaultWarehouseId;
            var invItem = await _db.InventoryItems
                .FirstOrDefaultAsync(i => i.ProductId == line.ProductId
                                          && i.VariantId == null
                                          && i.WarehouseId == warehouseId, ct);

            if (invItem != null)
            {
                // Landed cost đến SAU khi GRN đã confirm và AdjustStock đã chạy.
                // Tính lại AverageCost gồm cả phần landed share, không thay đổi QuantityOnHand.
                // newAvg = (oldQtyBeforeThisLot × oldAvgBefore + line.Qty × unitCostActual) / (oldQtyBefore + line.Qty)
                // oldQtyBefore = (QuantityOnHand hiện tại) - line.Quantity nếu GRN đã confirm.
                // Tại thời điểm này QuantityOnHand đã bao gồm line.Quantity → oldQtyBefore = QuantityOnHand - line.Quantity.
                //
                // W4-5 / M8: tử số KHÔNG được dùng `line.Quantity` (số NHẬN) trong khi mẫu số là
                // `QuantityOnHand` (số CÒN). Nhận 10@100k, bán 9 rồi mới phân bổ 100k cước thì công
                // thức cũ cho (0 + 10×110k)/1 = 1.100.000đ/đơn vị — giá vốn thổi gấp 10 lần, và
                // `OverrideAverageCost` chỉ chặn số âm nên không có chốt nào bắt được.
                //
                // Chỉ phần cước thuộc số đơn vị CÒN NẰM TRONG KHO mới được vốn hoá; phần thuộc số
                // đã bán là chi phí của kỳ (giá vốn đã xuất, ngoài phạm vi của allocator này).
                var landedPerUnit = line.Quantity > 0 ? share / line.Quantity : 0m;
                var unitsStillOnHand = Math.Min(line.Quantity, invItem.QuantityOnHand);
                var newAvg = invItem.QuantityOnHand > 0
                    ? ((invItem.QuantityOnHand * invItem.AverageCost) + (landedPerUnit * unitsStillOnHand))
                      / invItem.QuantityOnHand
                    : unitCostActual;
                invItem.OverrideAverageCost(newAvg);

                // StockMovement điều chỉnh giá vốn — Adjustment type.
                _db.StockMovements.Add(new StockMovement(
                    invItem.Id,
                    line.ProductId,
                    MovementType.Adjustment,
                    0, // không đổi quantity
                    $"Landed cost allocated {share:0.##}đ (avg {newAvg:0.##}đ/đvị)",
                    grnId.ToString(),
                    "GRN_LANDED_COST"
                ));

                lineAllocations.Add(new LandedCostLineAllocation(
                    line.Id, line.ProductId, line.Quantity,
                    line.UnitCost, share, unitCostActual, newAvg));
            }
            else
            {
                lineAllocations.Add(new LandedCostLineAllocation(
                    line.Id, line.ProductId, line.Quantity,
                    line.UnitCost, share, unitCostActual, unitCostActual));
            }
        }

        await _db.SaveChangesAsync(ct);
        return new LandedCostAllocationResult(grnId, totalCost, lineAllocations);
    }

    private static (Dictionary<Guid, decimal> Weights, bool ValueFallback) ComputeWeights(
        LandedCostAllocationMethod method,
        List<GRNItem> lines,
        Dictionary<Guid, decimal> productWeights)
    {
        var weights = new Dictionary<Guid, decimal>();
        var valueFallback = false;

        switch (method)
        {
            case LandedCostAllocationMethod.ByQuantity:
                foreach (var l in lines) weights[l.Id] = l.Quantity;
                break;

            case LandedCostAllocationMethod.ByWeight:
                foreach (var l in lines)
                {
                    var w = productWeights.TryGetValue(l.ProductId, out var pw) ? pw : 0m;
                    weights[l.Id] = w * l.Quantity;
                }
                if (weights.Values.Sum() == 0m)
                {
                    valueFallback = true;
                    weights.Clear();
                    foreach (var l in lines) weights[l.Id] = l.Quantity * l.UnitCost;
                }
                break;

            case LandedCostAllocationMethod.ByValue:
            default:
                foreach (var l in lines) weights[l.Id] = l.Quantity * l.UnitCost;
                break;
        }

        return (weights, valueFallback);
    }

    /// <summary>
    /// Tra Weight từ bảng Catalog.Products qua raw SQL (không import Catalog module).
    /// </summary>
    private async Task<Dictionary<Guid, decimal>> LoadProductWeightsAsync(
        List<Guid> productIds, CancellationToken ct)
    {
        var result = new Dictionary<Guid, decimal>();
        if (!productIds.Any()) return result;

        // Tạo tham số bảng ids; EF không hỗ trợ ANY natively cho Guid list qua raw SQL đơn giản,
        // nên dùng nhiều tham số. Bảng có thể ở schema public hoặc catalog tuỳ setup.
        try
        {
            var conn = _db.Database.GetDbConnection();
            var opened = conn.State != System.Data.ConnectionState.Open;
            if (opened) await conn.OpenAsync(ct);
            try
            {
                using var cmd = conn.CreateCommand();
                var placeholders = string.Join(",", productIds.Select((_, i) => $"@p{i}"));
                cmd.CommandText = $"SELECT \"Id\", \"Weight\" FROM \"Products\" WHERE \"Id\" IN ({placeholders})";
                for (int i = 0; i < productIds.Count; i++)
                {
                    var p = cmd.CreateParameter();
                    p.ParameterName = $"@p{i}";
                    p.Value = productIds[i];
                    cmd.Parameters.Add(p);
                }
                using var reader = await cmd.ExecuteReaderAsync(ct);
                while (await reader.ReadAsync(ct))
                {
                    var id = reader.GetGuid(0);
                    var w = reader.IsDBNull(1) ? 0m : reader.GetDecimal(1);
                    result[id] = w;
                }
            }
            finally
            {
                if (opened) await conn.CloseAsync();
            }
        }
        catch
        {
            // Bảng có thể chưa tồn tại (test in-memory). Trả rỗng → allocator fallback ByValue.
        }
        return result;
    }
}

public record LandedCostAllocationResult(
    Guid GRNId,
    decimal TotalCost,
    List<LandedCostLineAllocation> Lines);

public record LandedCostLineAllocation(
    Guid GRNItemId,
    Guid ProductId,
    int Quantity,
    decimal SupplierUnitCost,
    decimal LandedCostShare,
    decimal UnitCostActual,
    decimal NewAverageCost);
