using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Application.Suppliers;

/// <summary>
/// Tính điểm đánh giá nhà cung cấp trong khoảng thời gian:
///  - OnTimeRate      = số GRN đúng hạn / tổng GRN của NCC
///  - DefectRate      = SUM(RejectedQty) / SUM(AcceptedQty + RejectedQty)
///  - PriceRank       = xếp hạng giá trung bình 1..N (1 = rẻ nhất) so với NCC khác cùng ProductId
///  - OverallScore    = 40% OnTime + 40% Quality + 20% Price (0..100)
///
/// Đã dùng GRNItem.AcceptedQty/RejectedQty và PurchaseOrder.ExpectedDeliveryDate để tính on-time thật.
/// </summary>
public class SupplierScorecardService
{
    private readonly InventoryDbContext _db;

    public SupplierScorecardService(InventoryDbContext db)
    {
        _db = db;
    }

    public async Task<SupplierScorecard> ComputeAsync(Guid supplierId, DateTime from, DateTime to, CancellationToken ct = default)
    {
        var supplier = await _db.Suppliers.FirstOrDefaultAsync(s => s.Id == supplierId, ct)
            ?? throw new InvalidOperationException($"Supplier {supplierId} không tồn tại");

        var ontime = await ComputeOnTimeRateAsync(supplierId, from, to, ct);
        var defect = await ComputeDefectRateAsync(supplierId, from, to, ct);
        var priceRank = await ComputePriceRankAsync(supplierId, from, to, ct);

        var overall = ComputeOverallScore(ontime, defect, priceRank.NormalizedScore);

        return new SupplierScorecard(
            supplier.Id,
            supplier.Code,
            supplier.Name,
            from,
            to,
            ontime.OnTimeCount,
            ontime.TotalGRN,
            ontime.Rate,
            defect.AcceptedQty,
            defect.RejectedQty,
            defect.Rate,
            priceRank.Rank,
            priceRank.TotalSuppliers,
            priceRank.NormalizedScore,
            overall);
    }

    public async Task<List<SupplierScorecard>> GetAllAsync(DateTime from, DateTime to, CancellationToken ct = default)
    {
        var supplierIds = await _db.Suppliers.Select(s => s.Id).ToListAsync(ct);
        var results = new List<SupplierScorecard>(supplierIds.Count);
        foreach (var id in supplierIds)
        {
            results.Add(await ComputeAsync(id, from, to, ct));
        }
        return results.OrderByDescending(r => r.OverallScore).ToList();
    }

    private async Task<(int OnTimeCount, int TotalGRN, decimal Rate)> ComputeOnTimeRateAsync(
        Guid supplierId, DateTime from, DateTime to, CancellationToken ct)
    {
        // Đúng hạn = GRN.DocumentDate <= PO.ExpectedDeliveryDate. PO chưa gắn ExpectedDeliveryDate
        // (chưa cam kết ngày giao) thì coi là đúng hạn — không đủ dữ liệu để phạt NCC.
        var grns = await (
            from g in _db.GoodsReceivedNotes
            join po in _db.PurchaseOrders on g.PurchaseOrderId equals po.Id into poJoin
            from po in poJoin.DefaultIfEmpty()
            where g.SupplierId == supplierId
                && g.DocumentDate >= @from && g.DocumentDate <= to
                && g.Status == GRNStatus.Confirmed
            select new { g.Id, g.DocumentDate, ExpectedDeliveryDate = po != null ? po.ExpectedDeliveryDate : (DateTime?)null }
        ).ToListAsync(ct);

        var total = grns.Count;
        if (total == 0) return (0, 0, 0m);

        var onTime = grns.Count(g => g.ExpectedDeliveryDate == null || g.DocumentDate <= g.ExpectedDeliveryDate.Value);
        var rate = (decimal)onTime / total;
        return (onTime, total, rate);
    }

    private async Task<(int AcceptedQty, int RejectedQty, decimal Rate)> ComputeDefectRateAsync(
        Guid supplierId, DateTime from, DateTime to, CancellationToken ct)
    {
        var grnIds = await _db.GoodsReceivedNotes
            .Where(g => g.SupplierId == supplierId
                && g.DocumentDate >= from && g.DocumentDate <= to
                && g.Status == GRNStatus.Confirmed)
            .Select(g => g.Id)
            .ToListAsync(ct);
        if (!grnIds.Any()) return (0, 0, 0m);

        var items = await _db.GRNItems
            .Where(i => grnIds.Contains(i.GoodsReceivedNoteId))
            .Select(i => new { i.AcceptedQty, i.RejectedQty, i.Quantity })
            .ToListAsync(ct);

        // Fallback nếu GRN chưa được kiểm hàng — dùng Quantity làm accepted.
        var accepted = items.Sum(i => i.AcceptedQty > 0 || i.RejectedQty > 0 ? i.AcceptedQty : i.Quantity);
        var rejected = items.Sum(i => i.RejectedQty);
        var totalReceived = accepted + rejected;
        var rate = totalReceived > 0 ? (decimal)rejected / totalReceived : 0m;
        return (accepted, rejected, rate);
    }

    private async Task<(int Rank, int TotalSuppliers, decimal NormalizedScore)> ComputePriceRankAsync(
        Guid supplierId, DateTime from, DateTime to, CancellationToken ct)
    {
        // Tính giá trung bình mỗi ProductId của mỗi NCC dựa trên GRNItem.UnitCost trong khoảng.
        var query =
            from grn in _db.GoodsReceivedNotes
            join item in _db.GRNItems on grn.Id equals item.GoodsReceivedNoteId
            where (grn.DocumentDate >= @from) && (grn.DocumentDate <= to)
                && (grn.Status == GRNStatus.Confirmed)
                && (grn.SupplierId != null)
            group new { grn, item } by new { grn.SupplierId, item.ProductId } into g
            select new
            {
                SupplierId = g.Key.SupplierId!.Value,
                ProductId = g.Key.ProductId,
                AvgUnit = g.Sum(x => x.item.UnitCost * x.item.Quantity) / (decimal)g.Sum(x => x.item.Quantity)
            };
        var data = await query.ToListAsync(ct);
        if (!data.Any())
        {
            return (0, 0, 0m);
        }

        // Xếp hạng cho mỗi ProductId — mỗi NCC được hạng nhỏ nhất trong tất cả sản phẩm chung.
        var supplierRanks = new List<int>();
        var supplierTotalsPerProduct = data
            .GroupBy(x => x.ProductId)
            .Where(g => g.Count() > 1) // chỉ so sánh khi có > 1 NCC cùng sản phẩm
            .ToList();

        int totalSuppliersInRanking = data.Select(x => x.SupplierId).Distinct().Count();

        foreach (var g in supplierTotalsPerProduct)
        {
            var ordered = g.OrderBy(x => x.AvgUnit).ToList();
            var idx = ordered.FindIndex(x => x.SupplierId == supplierId);
            if (idx >= 0) supplierRanks.Add(idx + 1);
        }

        if (!supplierRanks.Any())
        {
            // NCC chưa có sản phẩm trùng NCC khác → điểm trung bình 50/100.
            return (0, totalSuppliersInRanking, 50m);
        }

        var avgRank = supplierRanks.Average();
        // Chuẩn hoá điểm về 0..100: rank 1 = 100, rank N = 0.
        var maxRank = data.GroupBy(x => x.ProductId).Max(g => g.Count());
        var normalized = maxRank > 1
            ? Math.Max(0m, 100m - ((decimal)(avgRank - 1) / (maxRank - 1) * 100m))
            : 50m;
        return ((int)Math.Round(avgRank), totalSuppliersInRanking, Math.Round(normalized, 2));
    }

    private static decimal ComputeOverallScore(
        (int OnTimeCount, int TotalGRN, decimal Rate) ontime,
        (int AcceptedQty, int RejectedQty, decimal Rate) defect,
        decimal priceNormalized)
    {
        // OnTime: 0..1 → 0..100
        var ontimeScore = ontime.Rate * 100m;
        // Quality: 1 - defect
        var qualityScore = Math.Max(0m, 1m - defect.Rate) * 100m;

        return Math.Round(0.4m * ontimeScore + 0.4m * qualityScore + 0.2m * priceNormalized, 2);
    }
}

public record SupplierScorecard(
    Guid SupplierId,
    string SupplierCode,
    string SupplierName,
    DateTime From,
    DateTime To,
    int OnTimeCount,
    int TotalGRN,
    decimal OnTimeRate,
    int AcceptedQty,
    int RejectedQty,
    decimal DefectRate,
    int PriceRank,
    int TotalSuppliers,
    decimal PriceScore,
    decimal OverallScore);
