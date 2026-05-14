using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Infrastructure;
using Sales.Domain;
using Accounting.Infrastructure;
using Accounting.Domain;
using InventoryModule.Infrastructure;
using Repair.Infrastructure;
using Repair.Domain;
using Catalog.Infrastructure;
using ClosedXML.Excel;

namespace Reporting.Endpoints;

public static class ExcelExportEndpoints
{
    public static void MapExcelExportEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/export/sales", async (SalesDbContext salesDb, string? startDate, string? endDate) =>
        {
            var start = !string.IsNullOrEmpty(startDate) ? DateTime.Parse(startDate) : DateTime.UtcNow.AddMonths(-1);
            var end = !string.IsNullOrEmpty(endDate) ? DateTime.Parse(endDate) : DateTime.UtcNow.AddDays(1);

            var orders = await salesDb.Orders.Include(o => o.Items)
                .Where(o => o.OrderDate >= start && o.OrderDate < end)
                .OrderByDescending(o => o.OrderDate).ToListAsync();

            using var workbook = new XLWorkbook();
            BuildOrdersSheet(workbook, orders);
            BuildOrderItemsSheet(workbook, orders);
            BuildSalesSummarySheet(workbook, orders, start, end);

            return ToFileResult(workbook, $"BaoCaoBanHang_{start:yyyyMMdd}_{end:yyyyMMdd}.xlsx");
        });

        group.MapGet("/export/top-products", async (SalesDbContext salesDb, int top = 50) =>
        {
            var topProducts = await salesDb.Orders
                .Where(o => o.Status != OrderStatus.Cancelled).SelectMany(o => o.Items)
                .GroupBy(i => new { i.ProductId, i.ProductName })
                .Select(g => new { ProductName = g.Key.ProductName, TotalQuantity = g.Sum(i => i.Quantity), TotalRevenue = g.Sum(i => i.UnitPrice * i.Quantity), OrderCount = g.Select(i => i.OrderId).Distinct().Count() })
                .OrderByDescending(x => x.TotalRevenue).Take(top).ToListAsync();

            using var workbook = new XLWorkbook();
            var sheet = workbook.Worksheets.Add("Top sản phẩm");
            AddHeaders(sheet, "STT", "Tên sản phẩm", "Số lượng bán", "Doanh thu", "Số đơn hàng");
            for (int i = 0; i < topProducts.Count; i++)
            {
                var p = topProducts[i];
                sheet.Cell(i + 2, 1).Value = i + 1; sheet.Cell(i + 2, 2).Value = p.ProductName;
                sheet.Cell(i + 2, 3).Value = p.TotalQuantity; sheet.Cell(i + 2, 4).Value = p.TotalRevenue;
                sheet.Cell(i + 2, 5).Value = p.OrderCount;
            }
            sheet.Columns().AdjustToContents();
            return ToFileResult(workbook, "TopSanPham.xlsx");
        });

        group.MapGet("/export/technicians", async (RepairDbContext repairDb) =>
        {
            var techStats = await repairDb.WorkOrders.Where(w => w.TechnicianId != null)
                .GroupBy(w => w.TechnicianId)
                .Select(g => new { TechnicianId = g.Key, TotalJobs = g.Count(), CompletedJobs = g.Count(w => w.Status == WorkOrderStatus.Completed), TotalRevenue = g.Sum(w => w.ActualCost) })
                .OrderByDescending(x => x.CompletedJobs).ToListAsync();

            var techIds = techStats.Select(t => t.TechnicianId).Where(id => id.HasValue).Select(id => id!.Value).ToList();
            var technicians = await repairDb.Technicians.Where(t => techIds.Contains(t.Id)).ToDictionaryAsync(t => t.Id, t => t);

            using var workbook = new XLWorkbook();
            var sheet = workbook.Worksheets.Add("Hiệu suất kỹ thuật viên");
            AddHeaders(sheet, "STT", "Tên kỹ thuật viên", "Chuyên môn", "Tổng công việc", "Hoàn thành", "Tỷ lệ thành công (%)", "Doanh thu");
            for (int i = 0; i < techStats.Count; i++)
            {
                var t = techStats[i];
                var tech = t.TechnicianId.HasValue && technicians.TryGetValue(t.TechnicianId.Value, out var technician) ? technician : null;
                sheet.Cell(i + 2, 1).Value = i + 1; sheet.Cell(i + 2, 2).Value = tech?.Name ?? "Chưa phân công";
                sheet.Cell(i + 2, 3).Value = tech?.Specialty ?? ""; sheet.Cell(i + 2, 4).Value = t.TotalJobs;
                sheet.Cell(i + 2, 5).Value = t.CompletedJobs;
                sheet.Cell(i + 2, 6).Value = t.TotalJobs > 0 ? Math.Round((double)t.CompletedJobs / t.TotalJobs * 100, 1) : 0;
                sheet.Cell(i + 2, 7).Value = t.TotalRevenue;
            }
            sheet.Columns().AdjustToContents();
            return ToFileResult(workbook, "HieuSuatKyThuatVien.xlsx");
        });

        group.MapGet("/export/inventory", async (InventoryDbContext invDb, CatalogDbContext catalogDb) =>
        {
            var items = await invDb.InventoryItems.ToListAsync();
            var productIds = items.Select(i => i.ProductId).ToList();
            var products = await catalogDb.Products.Where(p => productIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p);

            using var workbook = new XLWorkbook();
            var sheet = workbook.Worksheets.Add("Tồn kho");
            AddHeaders(sheet, "STT", "Tên sản phẩm", "SKU", "Số lượng tồn", "Đã đặt trước", "Khả dụng", "Điểm đặt lại", "Giá nhập TB", "Giá trị tồn", "Trạng thái");
            for (int i = 0; i < items.Count; i++)
            {
                var item = items[i];
                var product = products.TryGetValue(item.ProductId, out var p) ? p : null;
                var isLowStock = item.QuantityOnHand <= item.LowStockThreshold;
                sheet.Cell(i + 2, 1).Value = i + 1; sheet.Cell(i + 2, 2).Value = product?.Name ?? "Unknown";
                sheet.Cell(i + 2, 3).Value = product?.Sku ?? ""; sheet.Cell(i + 2, 4).Value = item.QuantityOnHand;
                sheet.Cell(i + 2, 5).Value = item.ReservedQuantity; sheet.Cell(i + 2, 6).Value = item.AvailableQuantity;
                sheet.Cell(i + 2, 7).Value = item.LowStockThreshold; sheet.Cell(i + 2, 8).Value = item.AverageCost;
                sheet.Cell(i + 2, 9).Value = item.QuantityOnHand * item.AverageCost;
                sheet.Cell(i + 2, 10).Value = isLowStock ? "Sắp hết hàng" : "Còn hàng";
                if (isLowStock) sheet.Range(i + 2, 1, i + 2, 10).Style.Fill.BackgroundColor = XLColor.LightPink;
            }
            sheet.Columns().AdjustToContents();

            var summarySheet = workbook.Worksheets.Add("Tổng hợp");
            summarySheet.Cell(1, 1).Value = "TỔNG HỢP TỒN KHO"; summarySheet.Cell(1, 1).Style.Font.Bold = true;
            summarySheet.Cell(3, 1).Value = "Tổng số mặt hàng:"; summarySheet.Cell(3, 2).Value = items.Count;
            summarySheet.Cell(4, 1).Value = "Tổng số lượng:"; summarySheet.Cell(4, 2).Value = items.Sum(i => i.QuantityOnHand);
            summarySheet.Cell(5, 1).Value = "Tổng giá trị:"; summarySheet.Cell(5, 2).Value = items.Sum(i => i.QuantityOnHand * i.AverageCost);
            summarySheet.Cell(5, 2).Style.NumberFormat.Format = "#,##0";
            summarySheet.Cell(6, 1).Value = "Số mặt hàng sắp hết:"; summarySheet.Cell(6, 2).Value = items.Count(i => i.QuantityOnHand <= i.LowStockThreshold);
            summarySheet.Columns().AdjustToContents();

            return ToFileResult(workbook, $"TonKho_{DateTime.UtcNow:yyyyMMdd}.xlsx");
        });

        group.MapGet("/export/full-report", async (SalesDbContext salesDb, InventoryDbContext invDb, RepairDbContext repairDb, CatalogDbContext catalogDb) =>
        {
            var today = DateTime.UtcNow.Date;
            var thisMonth = new DateTime(today.Year, today.Month, 1);
            using var workbook = new XLWorkbook();

            var summary = workbook.Worksheets.Add("Tổng quan");
            summary.Cell(1, 1).Value = "BÁO CÁO TỔNG HỢP KINH DOANH";
            summary.Cell(1, 1).Style.Font.Bold = true; summary.Cell(1, 1).Style.Font.FontSize = 18;
            summary.Cell(2, 1).Value = $"Ngày xuất: {DateTime.Now:dd/MM/yyyy HH:mm}";

            var totalRevenue = await salesDb.Orders.Where(o => o.Status != OrderStatus.Cancelled).SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
            var monthRevenue = await salesDb.Orders.Where(o => o.OrderDate >= thisMonth && o.Status != OrderStatus.Cancelled).SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
            var totalOrders = await salesDb.Orders.CountAsync();
            var invValue = await invDb.InventoryItems.SumAsync(i => (decimal?)i.QuantityOnHand * i.AverageCost) ?? 0;
            var repairRevenue = await repairDb.WorkOrders.Where(w => w.Status == WorkOrderStatus.Completed).SumAsync(w => (decimal?)w.ActualCost) ?? 0;

            summary.Cell(4, 1).Value = "DOANH THU"; summary.Cell(4, 1).Style.Font.Bold = true;
            summary.Cell(5, 1).Value = "Tổng doanh thu bán hàng:"; summary.Cell(5, 2).Value = totalRevenue;
            summary.Cell(6, 1).Value = "Doanh thu tháng này:"; summary.Cell(6, 2).Value = monthRevenue;
            summary.Cell(7, 1).Value = "Doanh thu sửa chữa:"; summary.Cell(7, 2).Value = repairRevenue;
            summary.Cell(9, 1).Value = "ĐƠN HÀNG"; summary.Cell(9, 1).Style.Font.Bold = true;
            summary.Cell(10, 1).Value = "Tổng số đơn:"; summary.Cell(10, 2).Value = totalOrders;
            summary.Cell(12, 1).Value = "TỒN KHO"; summary.Cell(12, 1).Style.Font.Bold = true;
            summary.Cell(13, 1).Value = "Giá trị tồn kho:"; summary.Cell(13, 2).Value = invValue;
            summary.Range("B5:B13").Style.NumberFormat.Format = "#,##0";
            summary.Columns().AdjustToContents();

            var topProducts = await salesDb.Orders.Where(o => o.Status != OrderStatus.Cancelled).SelectMany(o => o.Items)
                .GroupBy(i => new { i.ProductId, i.ProductName })
                .Select(g => new { g.Key.ProductName, Qty = g.Sum(i => i.Quantity), Revenue = g.Sum(i => i.UnitPrice * i.Quantity) })
                .OrderByDescending(x => x.Revenue).Take(20).ToListAsync();

            var productsSheet = workbook.Worksheets.Add("Top sản phẩm");
            AddHeaders(productsSheet, "STT", "Sản phẩm", "Số lượng", "Doanh thu");
            for (int i = 0; i < topProducts.Count; i++)
            {
                productsSheet.Cell(i + 2, 1).Value = i + 1; productsSheet.Cell(i + 2, 2).Value = topProducts[i].ProductName;
                productsSheet.Cell(i + 2, 3).Value = topProducts[i].Qty; productsSheet.Cell(i + 2, 4).Value = topProducts[i].Revenue;
            }
            productsSheet.Columns().AdjustToContents();

            var monthlyData = await salesDb.Orders
                .Where(o => o.OrderDate >= today.AddMonths(-11) && o.Status != OrderStatus.Cancelled)
                .GroupBy(o => new { o.OrderDate.Year, o.OrderDate.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Revenue = g.Sum(o => o.TotalAmount), Orders = g.Count() })
                .OrderBy(x => x.Year).ThenBy(x => x.Month).ToListAsync();

            var trendSheet = workbook.Worksheets.Add("Xu hướng theo tháng");
            AddHeaders(trendSheet, "Tháng", "Doanh thu", "Số đơn");
            for (int i = 0; i < monthlyData.Count; i++)
            {
                trendSheet.Cell(i + 2, 1).Value = $"{monthlyData[i].Month:00}/{monthlyData[i].Year}";
                trendSheet.Cell(i + 2, 2).Value = monthlyData[i].Revenue; trendSheet.Cell(i + 2, 3).Value = monthlyData[i].Orders;
            }
            trendSheet.Columns().AdjustToContents();

            return ToFileResult(workbook, $"BaoCaoTongHop_{DateTime.UtcNow:yyyyMMdd}.xlsx");
        });

        group.MapGet("/export/financial", async (SalesDbContext salesDb, AccountingDbContext accDb, InventoryDbContext invDb, string? startDate = null, string? endDate = null) =>
        {
            var start = !string.IsNullOrEmpty(startDate) ? DateTime.Parse(startDate) : DateTime.UtcNow.AddMonths(-12);
            var end = !string.IsNullOrEmpty(endDate) ? DateTime.Parse(endDate) : DateTime.UtcNow.AddDays(1);
            using var workbook = new XLWorkbook();

            var summary = workbook.Worksheets.Add("Tổng quan tài chính");
            summary.Cell(1, 1).Value = "BÁO CÁO TÀI CHÍNH";
            summary.Cell(1, 1).Style.Font.Bold = true; summary.Cell(1, 1).Style.Font.FontSize = 18;
            summary.Cell(2, 1).Value = $"Kỳ báo cáo: {start:dd/MM/yyyy} - {end:dd/MM/yyyy}";

            var totalRevenue = await salesDb.Orders.Where(o => o.OrderDate >= start && o.OrderDate < end && o.Status != OrderStatus.Cancelled).SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
            var totalExpenses = await accDb.Expenses.Where(e => e.Status == ExpenseStatus.Paid && e.ExpenseDate >= start && e.ExpenseDate < end).SumAsync(e => (decimal?)e.TotalAmount) ?? 0;
            var arOutstanding = await accDb.Invoices.Where(i => i.Type == InvoiceType.Receivable && i.Status != InvoiceStatus.Paid).SumAsync(i => (decimal?)i.OutstandingAmount) ?? 0;
            var apOutstanding = await accDb.Invoices.Where(i => i.Type == InvoiceType.Payable && i.Status != InvoiceStatus.Paid).SumAsync(i => (decimal?)i.OutstandingAmount) ?? 0;

            summary.Cell(4, 1).Value = "DOANH THU VÀ CHI PHÍ"; summary.Cell(4, 1).Style.Font.Bold = true;
            summary.Cell(5, 1).Value = "Tổng doanh thu:"; summary.Cell(5, 2).Value = totalRevenue;
            summary.Cell(6, 1).Value = "Tổng chi phí:"; summary.Cell(6, 2).Value = totalExpenses;
            summary.Cell(7, 1).Value = "Lợi nhuận gộp:"; summary.Cell(7, 2).Value = totalRevenue - totalExpenses;
            summary.Cell(9, 1).Value = "CÔNG NỢ"; summary.Cell(9, 1).Style.Font.Bold = true;
            summary.Cell(10, 1).Value = "Công nợ phải thu (AR):"; summary.Cell(10, 2).Value = arOutstanding;
            summary.Cell(11, 1).Value = "Công nợ phải trả (AP):"; summary.Cell(11, 2).Value = apOutstanding;
            summary.Cell(12, 1).Value = "Chênh lệch:"; summary.Cell(12, 2).Value = arOutstanding - apOutstanding;
            summary.Range("B5:B12").Style.NumberFormat.Format = "#,##0";
            summary.Columns().AdjustToContents();

            var monthlyRevenue = await salesDb.Orders.Where(o => o.OrderDate >= start && o.OrderDate < end && o.Status != OrderStatus.Cancelled)
                .GroupBy(o => new { o.OrderDate.Year, o.OrderDate.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Revenue = g.Sum(o => o.TotalAmount) })
                .OrderBy(x => x.Year).ThenBy(x => x.Month).ToListAsync();

            var revenueSheet = workbook.Worksheets.Add("Doanh thu theo tháng");
            AddHeaders(revenueSheet, "Tháng", "Doanh thu");
            for (int i = 0; i < monthlyRevenue.Count; i++)
            {
                revenueSheet.Cell(i + 2, 1).Value = $"{monthlyRevenue[i].Month:00}/{monthlyRevenue[i].Year}";
                revenueSheet.Cell(i + 2, 2).Value = monthlyRevenue[i].Revenue;
            }
            revenueSheet.Columns().AdjustToContents();

            var expensesByCategory = await accDb.Expenses.Where(e => e.Status == ExpenseStatus.Paid && e.ExpenseDate >= start && e.ExpenseDate < end)
                .Include(e => e.Category).GroupBy(e => e.Category!.Name)
                .Select(g => new { Category = g.Key, Total = g.Sum(e => e.TotalAmount), Count = g.Count() })
                .OrderByDescending(x => x.Total).ToListAsync();

            var expenseSheet = workbook.Worksheets.Add("Chi phí theo danh mục");
            AddHeaders(expenseSheet, "Danh mục", "Tổng tiền", "Số lượng");
            for (int i = 0; i < expensesByCategory.Count; i++)
            {
                expenseSheet.Cell(i + 2, 1).Value = expensesByCategory[i].Category;
                expenseSheet.Cell(i + 2, 2).Value = expensesByCategory[i].Total;
                expenseSheet.Cell(i + 2, 3).Value = expensesByCategory[i].Count;
            }
            expenseSheet.Columns().AdjustToContents();

            return ToFileResult(workbook, $"BaoCaoTaiChinh_{start:yyyyMMdd}_{end:yyyyMMdd}.xlsx");
        });
    }

    // Shared helpers
    private static void AddHeaders(IXLWorksheet sheet, params string[] headers)
    {
        for (int i = 0; i < headers.Length; i++)
            sheet.Cell(1, i + 1).Value = headers[i];
        var range = sheet.Range(1, 1, 1, headers.Length);
        range.Style.Font.Bold = true;
        range.Style.Fill.BackgroundColor = XLColor.LightGray;
    }

    private static IResult ToFileResult(XLWorkbook workbook, string fileName)
    {
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;
        return Results.File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }

    private static void BuildOrdersSheet(XLWorkbook workbook, List<Sales.Domain.Order> orders)
    {
        var sheet = workbook.Worksheets.Add("Đơn hàng");
        AddHeaders(sheet, "Mã đơn", "Ngày đặt", "Trạng thái", "Tạm tính", "Giảm giá", "Thuế", "Phí ship", "Tổng tiền", "Địa chỉ", "Ghi chú");
        for (int i = 0; i < orders.Count; i++)
        {
            var o = orders[i];
            sheet.Cell(i + 2, 1).Value = o.OrderNumber; sheet.Cell(i + 2, 2).Value = o.OrderDate.ToString("dd/MM/yyyy HH:mm");
            sheet.Cell(i + 2, 3).Value = o.Status.ToString(); sheet.Cell(i + 2, 4).Value = o.SubtotalAmount;
            sheet.Cell(i + 2, 5).Value = o.DiscountAmount; sheet.Cell(i + 2, 6).Value = o.TaxAmount;
            sheet.Cell(i + 2, 7).Value = o.ShippingAmount; sheet.Cell(i + 2, 8).Value = o.TotalAmount;
            sheet.Cell(i + 2, 9).Value = o.ShippingAddress; sheet.Cell(i + 2, 10).Value = o.Notes ?? "";
        }
        sheet.Columns().AdjustToContents();
    }

    private static void BuildOrderItemsSheet(XLWorkbook workbook, List<Sales.Domain.Order> orders)
    {
        var sheet = workbook.Worksheets.Add("Chi tiết đơn hàng");
        AddHeaders(sheet, "Mã đơn", "Sản phẩm", "Đơn giá", "Số lượng", "Thành tiền");
        int row = 2;
        foreach (var order in orders)
            foreach (var item in order.Items)
            {
                sheet.Cell(row, 1).Value = order.OrderNumber; sheet.Cell(row, 2).Value = item.ProductName;
                sheet.Cell(row, 3).Value = item.UnitPrice; sheet.Cell(row, 4).Value = item.Quantity;
                sheet.Cell(row, 5).Value = item.UnitPrice * item.Quantity; row++;
            }
        sheet.Columns().AdjustToContents();
    }

    private static void BuildSalesSummarySheet(XLWorkbook workbook, List<Sales.Domain.Order> orders, DateTime start, DateTime end)
    {
        var sheet = workbook.Worksheets.Add("Tổng hợp");
        sheet.Cell(1, 1).Value = "BÁO CÁO BÁN HÀNG"; sheet.Cell(1, 1).Style.Font.Bold = true; sheet.Cell(1, 1).Style.Font.FontSize = 16;
        sheet.Cell(3, 1).Value = "Kỳ báo cáo:"; sheet.Cell(3, 2).Value = $"{start:dd/MM/yyyy} - {end:dd/MM/yyyy}";
        sheet.Cell(5, 1).Value = "Tổng số đơn:"; sheet.Cell(5, 2).Value = orders.Count;
        sheet.Cell(6, 1).Value = "Tổng doanh thu:"; sheet.Cell(6, 2).Value = orders.Sum(o => o.TotalAmount); sheet.Cell(6, 2).Style.NumberFormat.Format = "#,##0";
        sheet.Cell(7, 1).Value = "Đơn hoàn thành:"; sheet.Cell(7, 2).Value = orders.Count(o => o.Status == OrderStatus.Completed || o.Status == OrderStatus.Delivered);
        sheet.Cell(8, 1).Value = "Đơn hủy:"; sheet.Cell(8, 2).Value = orders.Count(o => o.Status == OrderStatus.Cancelled);
        sheet.Columns().AdjustToContents();
    }
}
