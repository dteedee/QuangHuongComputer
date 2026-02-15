using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Infrastructure;
using Accounting.Infrastructure;
using InventoryModule.Infrastructure;
using Sales.Domain;
using InventoryModule.Domain;
using Accounting.Domain;
using Repair.Infrastructure;
using Repair.Domain;
using Catalog.Infrastructure;
using Identity.Infrastructure;
using ClosedXML.Excel;

namespace Reporting;

public static class ReportingEndpoints
{
    public static void MapReportingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/reports").RequireAuthorization(policy => policy.RequireRole("Admin", "Manager"));

        // ==================== SALES REPORTS ====================

        group.MapGet("/sales-summary", async (SalesDbContext salesDb, string? startDate, string? endDate) =>
        {
            var today = DateTime.UtcNow.Date;
            var start = !string.IsNullOrEmpty(startDate) ? DateTime.Parse(startDate) : today.AddMonths(-12);
            var end = !string.IsNullOrEmpty(endDate) ? DateTime.Parse(endDate) : today.AddDays(1);
            var thisMonth = new DateTime(today.Year, today.Month, 1);

            var ordersQuery = salesDb.Orders.Where(o => o.OrderDate >= start && o.OrderDate < end);

            var totalOrders = await ordersQuery.CountAsync();
            var totalRevenue = await ordersQuery.SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
            var monthRevenue = await salesDb.Orders
                .Where(o => o.OrderDate >= thisMonth)
                .SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
            var todayRevenue = await salesDb.Orders
                .Where(o => o.OrderDate >= today)
                .SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
            var todayOrders = await salesDb.Orders.CountAsync(o => o.OrderDate >= today);

            // Monthly revenue for chart
            var monthlyData = await salesDb.Orders
                .Where(o => o.OrderDate >= today.AddMonths(-11))
                .GroupBy(o => new { o.OrderDate.Year, o.OrderDate.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Revenue = g.Sum(o => o.TotalAmount), OrderCount = g.Count() })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToListAsync();

            // Order status distribution
            var statusDistribution = await salesDb.Orders
                .GroupBy(o => o.Status)
                .Select(g => new { Status = g.Key.ToString(), Count = g.Count() })
                .ToListAsync();

            return Results.Ok(new
            {
                TotalOrders = totalOrders,
                TotalRevenue = totalRevenue,
                MonthRevenue = monthRevenue,
                TodayRevenue = todayRevenue,
                TodayOrders = todayOrders,
                MonthlyData = monthlyData,
                StatusDistribution = statusDistribution
            });
        });

        // Top selling products
        group.MapGet("/top-products", async (SalesDbContext salesDb, int top = 10, string? startDate = null, string? endDate = null) =>
        {
            var start = !string.IsNullOrEmpty(startDate) ? DateTime.Parse(startDate) : DateTime.UtcNow.AddMonths(-3);
            var end = !string.IsNullOrEmpty(endDate) ? DateTime.Parse(endDate) : DateTime.UtcNow.AddDays(1);

            var topProducts = await salesDb.Orders
                .Where(o => o.OrderDate >= start && o.OrderDate < end && o.Status != OrderStatus.Cancelled)
                .SelectMany(o => o.Items)
                .GroupBy(i => new { i.ProductId, i.ProductName })
                .Select(g => new
                {
                    ProductId = g.Key.ProductId,
                    ProductName = g.Key.ProductName,
                    TotalQuantity = g.Sum(i => i.Quantity),
                    TotalRevenue = g.Sum(i => i.UnitPrice * i.Quantity),
                    OrderCount = g.Select(i => i.OrderId).Distinct().Count()
                })
                .OrderByDescending(x => x.TotalRevenue)
                .Take(top)
                .ToListAsync();

            return Results.Ok(topProducts);
        });

        // Top customers
        group.MapGet("/top-customers", async (SalesDbContext salesDb, IdentityDbContext identityDb, int top = 10) =>
        {
            var topCustomerIds = await salesDb.Orders
                .Where(o => o.Status != OrderStatus.Cancelled)
                .GroupBy(o => o.CustomerId)
                .Select(g => new
                {
                    CustomerId = g.Key,
                    TotalSpent = g.Sum(o => o.TotalAmount),
                    OrderCount = g.Count(),
                    LastOrderDate = g.Max(o => o.OrderDate)
                })
                .OrderByDescending(x => x.TotalSpent)
                .Take(top)
                .ToListAsync();

            // Get customer names - convert Guid to string for Identity comparison
            var customerIdStrings = topCustomerIds.Select(c => c.CustomerId.ToString()).ToList();
            var users = await identityDb.Users
                .Where(u => customerIdStrings.Contains(u.Id))
                .Select(u => new { u.Id, u.FullName, u.Email })
                .ToDictionaryAsync(u => u.Id, u => new { u.FullName, u.Email });

            var result = topCustomerIds.Select(c => new
            {
                c.CustomerId,
                CustomerName = users.TryGetValue(c.CustomerId.ToString(), out var user) ? user.FullName : "Khách vãng lai",
                Email = users.TryGetValue(c.CustomerId.ToString(), out var u) ? u.Email : "",
                c.TotalSpent,
                c.OrderCount,
                c.LastOrderDate
            });

            return Results.Ok(result);
        });

        // ==================== INVENTORY REPORTS ====================

        group.MapGet("/inventory-value", async (InventoryDbContext invDb, CatalogDbContext catalogDb) =>
        {
            // Optimized: Calculate aggregations directly in database
            var totalValueTask = invDb.InventoryItems.SumAsync(i => (decimal?)i.QuantityOnHand * i.AverageCost);
            var itemCountTask = invDb.InventoryItems.CountAsync();
            var totalQuantityTask = invDb.InventoryItems.SumAsync(i => (int?)i.QuantityOnHand);

            // Get low stock items
            var lowStockItems = await invDb.InventoryItems
                .Where(i => i.QuantityOnHand <= i.LowStockThreshold)
                .OrderBy(i => i.QuantityOnHand)
                .Take(10)
                .ToListAsync();

            // Run aggregation tasks in parallel
            await Task.WhenAll(totalValueTask, itemCountTask, totalQuantityTask);

            // Get product names
            var productIds = lowStockItems.Select(i => i.ProductId).ToList();
            var products = await catalogDb.Products
                .Where(p => productIds.Contains(p.Id))
                .Select(p => new { p.Id, p.Name })
                .ToDictionaryAsync(p => p.Id, p => p.Name);

            var lowStock = lowStockItems.Select(i => new
            {
                i.ProductId,
                ProductName = products.TryGetValue(i.ProductId, out var name) ? name : "Unknown",
                i.QuantityOnHand,
                i.LowStockThreshold,
                i.AverageCost
            });

            return Results.Ok(new
            {
                TotalValue = await totalValueTask ?? 0,
                ItemCount = await itemCountTask,
                TotalQuantity = await totalQuantityTask ?? 0,
                LowStockItems = lowStock
            });
        });

        // ==================== ACCOUNTING REPORTS ====================

        group.MapGet("/ar-aging", async (AccountingDbContext accDb) =>
        {
            var accounts = await accDb.Accounts.ToListAsync();
            return Results.Ok(accounts);
        });

        // ==================== REPAIR/TECHNICIAN REPORTS ====================

        group.MapGet("/tech-performance", async (RepairDbContext repairDb) =>
        {
            var totalJobs = await repairDb.WorkOrders.CountAsync();
            var completedJobs = await repairDb.WorkOrders.CountAsync(w => w.Status == WorkOrderStatus.Completed);
            var avgCost = await repairDb.WorkOrders
                .Where(w => w.Status == WorkOrderStatus.Completed)
                .AverageAsync(w => (decimal?)w.TotalCost) ?? 0;

            return Results.Ok(new
            {
                TotalJobs = totalJobs,
                CompletedJobs = completedJobs,
                SuccessRate = totalJobs > 0 ? (double)completedJobs / totalJobs * 100 : 0,
                AverageRepairCost = avgCost
            });
        });

        // Top technicians
        group.MapGet("/top-technicians", async (RepairDbContext repairDb, int top = 10) =>
        {
            var techStats = await repairDb.WorkOrders
                .Where(w => w.TechnicianId != null)
                .GroupBy(w => w.TechnicianId)
                .Select(g => new
                {
                    TechnicianId = g.Key,
                    TotalJobs = g.Count(),
                    CompletedJobs = g.Count(w => w.Status == WorkOrderStatus.Completed),
                    TotalRevenue = g.Sum(w => w.TotalCost)
                })
                .OrderByDescending(x => x.CompletedJobs)
                .Take(top)
                .ToListAsync();

            // Get technician names
            var techIds = techStats.Select(t => t.TechnicianId).Where(id => id.HasValue).Select(id => id!.Value).ToList();
            var technicians = await repairDb.Technicians
                .Where(t => techIds.Contains(t.Id))
                .Select(t => new { t.Id, t.Name, t.Specialty })
                .ToDictionaryAsync(t => t.Id, t => new { t.Name, t.Specialty });

            var result = techStats.Select(t => new
            {
                t.TechnicianId,
                TechnicianName = t.TechnicianId.HasValue && technicians.TryGetValue(t.TechnicianId.Value, out var tech) ? tech.Name : "Chưa phân công",
                Specialty = t.TechnicianId.HasValue && technicians.TryGetValue(t.TechnicianId.Value, out var s) ? s.Specialty : "",
                t.TotalJobs,
                t.CompletedJobs,
                SuccessRate = t.TotalJobs > 0 ? Math.Round((double)t.CompletedJobs / t.TotalJobs * 100, 1) : 0,
                t.TotalRevenue,
                AvgCompletionHours = 0 // Simplified - would need separate query for accurate calculation
            });

            return Results.Ok(result);
        });

        // ==================== BUSINESS OVERVIEW ====================

        group.MapGet("/business-overview", async (
            SalesDbContext salesDb,
            InventoryDbContext invDb,
            RepairDbContext repairDb,
            AccountingDbContext accDb) =>
        {
            var today = DateTime.UtcNow.Date;
            var thisMonth = new DateTime(today.Year, today.Month, 1);
            var lastMonth = thisMonth.AddMonths(-1);

            // Run all queries in parallel for better performance
            var thisMonthRevenueTask = salesDb.Orders
                .Where(o => o.OrderDate >= thisMonth && o.Status != OrderStatus.Cancelled)
                .SumAsync(o => (decimal?)o.TotalAmount);

            var lastMonthRevenueTask = salesDb.Orders
                .Where(o => o.OrderDate >= lastMonth && o.OrderDate < thisMonth && o.Status != OrderStatus.Cancelled)
                .SumAsync(o => (decimal?)o.TotalAmount);

            var pendingOrdersTask = salesDb.Orders.CountAsync(o => o.Status == OrderStatus.Pending || o.Status == OrderStatus.Confirmed);

            var inventoryValueTask = invDb.InventoryItems.SumAsync(i => (decimal?)i.QuantityOnHand * i.AverageCost);
            var lowStockCountTask = invDb.InventoryItems.CountAsync(i => i.QuantityOnHand <= i.LowStockThreshold);

            var pendingRepairsTask = repairDb.WorkOrders.CountAsync(w => w.Status == WorkOrderStatus.Pending || w.Status == WorkOrderStatus.InProgress);
            var thisMonthRepairRevenueTask = repairDb.WorkOrders
                .Where(w => w.FinishedAt >= thisMonth && w.Status == WorkOrderStatus.Completed)
                .SumAsync(w => (decimal?)w.TotalCost);

            var totalARTask = accDb.Accounts.SumAsync(a => (decimal?)a.Balance);

            // Await all tasks
            await Task.WhenAll(
                thisMonthRevenueTask, lastMonthRevenueTask, pendingOrdersTask,
                inventoryValueTask, lowStockCountTask,
                pendingRepairsTask, thisMonthRepairRevenueTask,
                totalARTask);

            var thisMonthRevenue = await thisMonthRevenueTask ?? 0;
            var lastMonthRevenue = await lastMonthRevenueTask ?? 0;
            var revenueGrowth = lastMonthRevenue > 0
                ? Math.Round((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100, 1)
                : 100;

            return Results.Ok(new
            {
                Sales = new
                {
                    ThisMonthRevenue = thisMonthRevenue,
                    LastMonthRevenue = lastMonthRevenue,
                    GrowthPercent = revenueGrowth,
                    PendingOrders = await pendingOrdersTask
                },
                Inventory = new
                {
                    TotalValue = await inventoryValueTask ?? 0,
                    LowStockCount = await lowStockCountTask
                },
                Repairs = new
                {
                    PendingCount = await pendingRepairsTask,
                    ThisMonthRevenue = await thisMonthRepairRevenueTask ?? 0
                },
                Accounting = new
                {
                    TotalReceivables = await totalARTask ?? 0
                }
            });
        });

        // ==================== EXCEL EXPORT ====================

        group.MapGet("/export/sales", async (SalesDbContext salesDb, string? startDate, string? endDate) =>
        {
            var start = !string.IsNullOrEmpty(startDate) ? DateTime.Parse(startDate) : DateTime.UtcNow.AddMonths(-1);
            var end = !string.IsNullOrEmpty(endDate) ? DateTime.Parse(endDate) : DateTime.UtcNow.AddDays(1);

            var orders = await salesDb.Orders
                .Include(o => o.Items)
                .Where(o => o.OrderDate >= start && o.OrderDate < end)
                .OrderByDescending(o => o.OrderDate)
                .ToListAsync();

            using var workbook = new XLWorkbook();

            // Orders sheet
            var ordersSheet = workbook.Worksheets.Add("Đơn hàng");
            ordersSheet.Cell(1, 1).Value = "Mã đơn";
            ordersSheet.Cell(1, 2).Value = "Ngày đặt";
            ordersSheet.Cell(1, 3).Value = "Trạng thái";
            ordersSheet.Cell(1, 4).Value = "Tạm tính";
            ordersSheet.Cell(1, 5).Value = "Giảm giá";
            ordersSheet.Cell(1, 6).Value = "Thuế";
            ordersSheet.Cell(1, 7).Value = "Phí ship";
            ordersSheet.Cell(1, 8).Value = "Tổng tiền";
            ordersSheet.Cell(1, 9).Value = "Địa chỉ";
            ordersSheet.Cell(1, 10).Value = "Ghi chú";

            var headerRange = ordersSheet.Range(1, 1, 1, 10);
            headerRange.Style.Font.Bold = true;
            headerRange.Style.Fill.BackgroundColor = XLColor.LightGray;

            for (int i = 0; i < orders.Count; i++)
            {
                var o = orders[i];
                ordersSheet.Cell(i + 2, 1).Value = o.OrderNumber;
                ordersSheet.Cell(i + 2, 2).Value = o.OrderDate.ToString("dd/MM/yyyy HH:mm");
                ordersSheet.Cell(i + 2, 3).Value = o.Status.ToString();
                ordersSheet.Cell(i + 2, 4).Value = o.SubtotalAmount;
                ordersSheet.Cell(i + 2, 5).Value = o.DiscountAmount;
                ordersSheet.Cell(i + 2, 6).Value = o.TaxAmount;
                ordersSheet.Cell(i + 2, 7).Value = o.ShippingAmount;
                ordersSheet.Cell(i + 2, 8).Value = o.TotalAmount;
                ordersSheet.Cell(i + 2, 9).Value = o.ShippingAddress;
                ordersSheet.Cell(i + 2, 10).Value = o.Notes ?? "";
            }

            ordersSheet.Columns().AdjustToContents();

            // Order items sheet
            var itemsSheet = workbook.Worksheets.Add("Chi tiết đơn hàng");
            itemsSheet.Cell(1, 1).Value = "Mã đơn";
            itemsSheet.Cell(1, 2).Value = "Sản phẩm";
            itemsSheet.Cell(1, 3).Value = "Đơn giá";
            itemsSheet.Cell(1, 4).Value = "Số lượng";
            itemsSheet.Cell(1, 5).Value = "Thành tiền";

            var itemHeaderRange = itemsSheet.Range(1, 1, 1, 5);
            itemHeaderRange.Style.Font.Bold = true;
            itemHeaderRange.Style.Fill.BackgroundColor = XLColor.LightGray;

            int row = 2;
            foreach (var order in orders)
            {
                foreach (var item in order.Items)
                {
                    itemsSheet.Cell(row, 1).Value = order.OrderNumber;
                    itemsSheet.Cell(row, 2).Value = item.ProductName;
                    itemsSheet.Cell(row, 3).Value = item.UnitPrice;
                    itemsSheet.Cell(row, 4).Value = item.Quantity;
                    itemsSheet.Cell(row, 5).Value = item.UnitPrice * item.Quantity;
                    row++;
                }
            }

            itemsSheet.Columns().AdjustToContents();

            // Summary sheet
            var summarySheet = workbook.Worksheets.Add("Tổng hợp");
            summarySheet.Cell(1, 1).Value = "BÁO CÁO BÁN HÀNG";
            summarySheet.Cell(1, 1).Style.Font.Bold = true;
            summarySheet.Cell(1, 1).Style.Font.FontSize = 16;

            summarySheet.Cell(3, 1).Value = "Kỳ báo cáo:";
            summarySheet.Cell(3, 2).Value = $"{start:dd/MM/yyyy} - {end:dd/MM/yyyy}";

            summarySheet.Cell(5, 1).Value = "Tổng số đơn:";
            summarySheet.Cell(5, 2).Value = orders.Count;

            summarySheet.Cell(6, 1).Value = "Tổng doanh thu:";
            summarySheet.Cell(6, 2).Value = orders.Sum(o => o.TotalAmount);
            summarySheet.Cell(6, 2).Style.NumberFormat.Format = "#,##0";

            summarySheet.Cell(7, 1).Value = "Đơn hoàn thành:";
            summarySheet.Cell(7, 2).Value = orders.Count(o => o.Status == OrderStatus.Completed || o.Status == OrderStatus.Delivered);

            summarySheet.Cell(8, 1).Value = "Đơn hủy:";
            summarySheet.Cell(8, 2).Value = orders.Count(o => o.Status == OrderStatus.Cancelled);

            summarySheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            stream.Position = 0;

            var fileName = $"BaoCaoBanHang_{start:yyyyMMdd}_{end:yyyyMMdd}.xlsx";
            return Results.File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        });

        // Export top products
        group.MapGet("/export/top-products", async (SalesDbContext salesDb, int top = 50) =>
        {
            var topProducts = await salesDb.Orders
                .Where(o => o.Status != OrderStatus.Cancelled)
                .SelectMany(o => o.Items)
                .GroupBy(i => new { i.ProductId, i.ProductName })
                .Select(g => new
                {
                    ProductName = g.Key.ProductName,
                    TotalQuantity = g.Sum(i => i.Quantity),
                    TotalRevenue = g.Sum(i => i.UnitPrice * i.Quantity),
                    OrderCount = g.Select(i => i.OrderId).Distinct().Count()
                })
                .OrderByDescending(x => x.TotalRevenue)
                .Take(top)
                .ToListAsync();

            using var workbook = new XLWorkbook();
            var sheet = workbook.Worksheets.Add("Top sản phẩm");

            sheet.Cell(1, 1).Value = "STT";
            sheet.Cell(1, 2).Value = "Tên sản phẩm";
            sheet.Cell(1, 3).Value = "Số lượng bán";
            sheet.Cell(1, 4).Value = "Doanh thu";
            sheet.Cell(1, 5).Value = "Số đơn hàng";

            var headerRange = sheet.Range(1, 1, 1, 5);
            headerRange.Style.Font.Bold = true;
            headerRange.Style.Fill.BackgroundColor = XLColor.LightGray;

            for (int i = 0; i < topProducts.Count; i++)
            {
                var p = topProducts[i];
                sheet.Cell(i + 2, 1).Value = i + 1;
                sheet.Cell(i + 2, 2).Value = p.ProductName;
                sheet.Cell(i + 2, 3).Value = p.TotalQuantity;
                sheet.Cell(i + 2, 4).Value = p.TotalRevenue;
                sheet.Cell(i + 2, 5).Value = p.OrderCount;
            }

            sheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            stream.Position = 0;

            return Results.File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "TopSanPham.xlsx");
        });

        // Export technician performance
        group.MapGet("/export/technicians", async (RepairDbContext repairDb) =>
        {
            var techStats = await repairDb.WorkOrders
                .Where(w => w.TechnicianId != null)
                .GroupBy(w => w.TechnicianId)
                .Select(g => new
                {
                    TechnicianId = g.Key,
                    TotalJobs = g.Count(),
                    CompletedJobs = g.Count(w => w.Status == WorkOrderStatus.Completed),
                    TotalRevenue = g.Sum(w => w.TotalCost)
                })
                .OrderByDescending(x => x.CompletedJobs)
                .ToListAsync();

            var techIds = techStats.Select(t => t.TechnicianId).Where(id => id.HasValue).Select(id => id!.Value).ToList();
            var technicians = await repairDb.Technicians
                .Where(t => techIds.Contains(t.Id))
                .ToDictionaryAsync(t => t.Id, t => t);

            using var workbook = new XLWorkbook();
            var sheet = workbook.Worksheets.Add("Hiệu suất kỹ thuật viên");

            sheet.Cell(1, 1).Value = "STT";
            sheet.Cell(1, 2).Value = "Tên kỹ thuật viên";
            sheet.Cell(1, 3).Value = "Chuyên môn";
            sheet.Cell(1, 4).Value = "Tổng công việc";
            sheet.Cell(1, 5).Value = "Hoàn thành";
            sheet.Cell(1, 6).Value = "Tỷ lệ thành công (%)";
            sheet.Cell(1, 7).Value = "Doanh thu";

            var headerRange = sheet.Range(1, 1, 1, 7);
            headerRange.Style.Font.Bold = true;
            headerRange.Style.Fill.BackgroundColor = XLColor.LightGray;

            for (int i = 0; i < techStats.Count; i++)
            {
                var t = techStats[i];
                var tech = t.TechnicianId.HasValue && technicians.TryGetValue(t.TechnicianId.Value, out var technician) ? technician : null;

                sheet.Cell(i + 2, 1).Value = i + 1;
                sheet.Cell(i + 2, 2).Value = tech?.Name ?? "Chưa phân công";
                sheet.Cell(i + 2, 3).Value = tech?.Specialty ?? "";
                sheet.Cell(i + 2, 4).Value = t.TotalJobs;
                sheet.Cell(i + 2, 5).Value = t.CompletedJobs;
                sheet.Cell(i + 2, 6).Value = t.TotalJobs > 0 ? Math.Round((double)t.CompletedJobs / t.TotalJobs * 100, 1) : 0;
                sheet.Cell(i + 2, 7).Value = t.TotalRevenue;
            }

            sheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            stream.Position = 0;

            return Results.File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "HieuSuatKyThuatVien.xlsx");
        });

        // Export inventory
        group.MapGet("/export/inventory", async (InventoryDbContext invDb, CatalogDbContext catalogDb) =>
        {
            var items = await invDb.InventoryItems.ToListAsync();
            var productIds = items.Select(i => i.ProductId).ToList();
            var products = await catalogDb.Products
                .Where(p => productIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, p => p);

            using var workbook = new XLWorkbook();
            var sheet = workbook.Worksheets.Add("Tồn kho");

            sheet.Cell(1, 1).Value = "STT";
            sheet.Cell(1, 2).Value = "Tên sản phẩm";
            sheet.Cell(1, 3).Value = "SKU";
            sheet.Cell(1, 4).Value = "Số lượng tồn";
            sheet.Cell(1, 5).Value = "Đã đặt trước";
            sheet.Cell(1, 6).Value = "Khả dụng";
            sheet.Cell(1, 7).Value = "Điểm đặt lại";
            sheet.Cell(1, 8).Value = "Giá nhập TB";
            sheet.Cell(1, 9).Value = "Giá trị tồn";
            sheet.Cell(1, 10).Value = "Trạng thái";

            var headerRange = sheet.Range(1, 1, 1, 10);
            headerRange.Style.Font.Bold = true;
            headerRange.Style.Fill.BackgroundColor = XLColor.LightGray;

            for (int i = 0; i < items.Count; i++)
            {
                var item = items[i];
                var product = products.TryGetValue(item.ProductId, out var p) ? p : null;
                var isLowStock = item.QuantityOnHand <= item.LowStockThreshold;

                sheet.Cell(i + 2, 1).Value = i + 1;
                sheet.Cell(i + 2, 2).Value = product?.Name ?? "Unknown";
                sheet.Cell(i + 2, 3).Value = product?.Sku ?? "";
                sheet.Cell(i + 2, 4).Value = item.QuantityOnHand;
                sheet.Cell(i + 2, 5).Value = item.ReservedQuantity;
                sheet.Cell(i + 2, 6).Value = item.AvailableQuantity;
                sheet.Cell(i + 2, 7).Value = item.LowStockThreshold;
                sheet.Cell(i + 2, 8).Value = item.AverageCost;
                sheet.Cell(i + 2, 9).Value = item.QuantityOnHand * item.AverageCost;
                sheet.Cell(i + 2, 10).Value = isLowStock ? "Sắp hết hàng" : "Còn hàng";

                if (isLowStock)
                {
                    sheet.Range(i + 2, 1, i + 2, 10).Style.Fill.BackgroundColor = XLColor.LightPink;
                }
            }

            sheet.Columns().AdjustToContents();

            // Summary
            var summarySheet = workbook.Worksheets.Add("Tổng hợp");
            summarySheet.Cell(1, 1).Value = "TỔNG HỢP TỒN KHO";
            summarySheet.Cell(1, 1).Style.Font.Bold = true;

            summarySheet.Cell(3, 1).Value = "Tổng số mặt hàng:";
            summarySheet.Cell(3, 2).Value = items.Count;

            summarySheet.Cell(4, 1).Value = "Tổng số lượng:";
            summarySheet.Cell(4, 2).Value = items.Sum(i => i.QuantityOnHand);

            summarySheet.Cell(5, 1).Value = "Tổng giá trị:";
            summarySheet.Cell(5, 2).Value = items.Sum(i => i.QuantityOnHand * i.AverageCost);
            summarySheet.Cell(5, 2).Style.NumberFormat.Format = "#,##0";

            summarySheet.Cell(6, 1).Value = "Số mặt hàng sắp hết:";
            summarySheet.Cell(6, 2).Value = items.Count(i => i.QuantityOnHand <= i.LowStockThreshold);

            summarySheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            stream.Position = 0;

            return Results.File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"TonKho_{DateTime.UtcNow:yyyyMMdd}.xlsx");
        });

        // Full business report
        group.MapGet("/export/full-report", async (
            SalesDbContext salesDb,
            InventoryDbContext invDb,
            RepairDbContext repairDb,
            CatalogDbContext catalogDb) =>
        {
            var today = DateTime.UtcNow.Date;
            var thisMonth = new DateTime(today.Year, today.Month, 1);

            using var workbook = new XLWorkbook();

            // 1. Summary sheet
            var summary = workbook.Worksheets.Add("Tổng quan");
            summary.Cell(1, 1).Value = "BÁO CÁO TỔNG HỢP KINH DOANH";
            summary.Cell(1, 1).Style.Font.Bold = true;
            summary.Cell(1, 1).Style.Font.FontSize = 18;
            summary.Cell(2, 1).Value = $"Ngày xuất: {DateTime.Now:dd/MM/yyyy HH:mm}";

            var totalRevenue = await salesDb.Orders.Where(o => o.Status != OrderStatus.Cancelled).SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
            var monthRevenue = await salesDb.Orders.Where(o => o.OrderDate >= thisMonth && o.Status != OrderStatus.Cancelled).SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
            var totalOrders = await salesDb.Orders.CountAsync();
            var invValue = await invDb.InventoryItems.SumAsync(i => (decimal?)i.QuantityOnHand * i.AverageCost) ?? 0;
            var repairRevenue = await repairDb.WorkOrders.Where(w => w.Status == WorkOrderStatus.Completed).SumAsync(w => (decimal?)w.TotalCost) ?? 0;

            summary.Cell(4, 1).Value = "DOANH THU";
            summary.Cell(4, 1).Style.Font.Bold = true;
            summary.Cell(5, 1).Value = "Tổng doanh thu bán hàng:";
            summary.Cell(5, 2).Value = totalRevenue;
            summary.Cell(6, 1).Value = "Doanh thu tháng này:";
            summary.Cell(6, 2).Value = monthRevenue;
            summary.Cell(7, 1).Value = "Doanh thu sửa chữa:";
            summary.Cell(7, 2).Value = repairRevenue;

            summary.Cell(9, 1).Value = "ĐƠN HÀNG";
            summary.Cell(9, 1).Style.Font.Bold = true;
            summary.Cell(10, 1).Value = "Tổng số đơn:";
            summary.Cell(10, 2).Value = totalOrders;

            summary.Cell(12, 1).Value = "TỒN KHO";
            summary.Cell(12, 1).Style.Font.Bold = true;
            summary.Cell(13, 1).Value = "Giá trị tồn kho:";
            summary.Cell(13, 2).Value = invValue;

            summary.Range("B5:B13").Style.NumberFormat.Format = "#,##0";
            summary.Columns().AdjustToContents();

            // 2. Top products
            var topProducts = await salesDb.Orders
                .Where(o => o.Status != OrderStatus.Cancelled)
                .SelectMany(o => o.Items)
                .GroupBy(i => new { i.ProductId, i.ProductName })
                .Select(g => new { g.Key.ProductName, Qty = g.Sum(i => i.Quantity), Revenue = g.Sum(i => i.UnitPrice * i.Quantity) })
                .OrderByDescending(x => x.Revenue)
                .Take(20)
                .ToListAsync();

            var productsSheet = workbook.Worksheets.Add("Top sản phẩm");
            productsSheet.Cell(1, 1).Value = "STT";
            productsSheet.Cell(1, 2).Value = "Sản phẩm";
            productsSheet.Cell(1, 3).Value = "Số lượng";
            productsSheet.Cell(1, 4).Value = "Doanh thu";
            productsSheet.Range(1, 1, 1, 4).Style.Font.Bold = true;
            productsSheet.Range(1, 1, 1, 4).Style.Fill.BackgroundColor = XLColor.LightGray;

            for (int i = 0; i < topProducts.Count; i++)
            {
                productsSheet.Cell(i + 2, 1).Value = i + 1;
                productsSheet.Cell(i + 2, 2).Value = topProducts[i].ProductName;
                productsSheet.Cell(i + 2, 3).Value = topProducts[i].Qty;
                productsSheet.Cell(i + 2, 4).Value = topProducts[i].Revenue;
            }
            productsSheet.Columns().AdjustToContents();

            // 3. Monthly trend
            var monthlyData = await salesDb.Orders
                .Where(o => o.OrderDate >= today.AddMonths(-11) && o.Status != OrderStatus.Cancelled)
                .GroupBy(o => new { o.OrderDate.Year, o.OrderDate.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Revenue = g.Sum(o => o.TotalAmount), Orders = g.Count() })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToListAsync();

            var trendSheet = workbook.Worksheets.Add("Xu hướng theo tháng");
            trendSheet.Cell(1, 1).Value = "Tháng";
            trendSheet.Cell(1, 2).Value = "Doanh thu";
            trendSheet.Cell(1, 3).Value = "Số đơn";
            trendSheet.Range(1, 1, 1, 3).Style.Font.Bold = true;
            trendSheet.Range(1, 1, 1, 3).Style.Fill.BackgroundColor = XLColor.LightGray;

            for (int i = 0; i < monthlyData.Count; i++)
            {
                trendSheet.Cell(i + 2, 1).Value = $"{monthlyData[i].Month:00}/{monthlyData[i].Year}";
                trendSheet.Cell(i + 2, 2).Value = monthlyData[i].Revenue;
                trendSheet.Cell(i + 2, 3).Value = monthlyData[i].Orders;
            }
            trendSheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            stream.Position = 0;

            return Results.File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"BaoCaoTongHop_{DateTime.UtcNow:yyyyMMdd}.xlsx");
        });

        // ==================== FINANCIAL REPORTS ====================

        // Cash flow report
        group.MapGet("/cash-flow", async (
            AccountingDbContext accDb,
            SalesDbContext salesDb,
            string? startDate = null,
            string? endDate = null) =>
        {
            var start = !string.IsNullOrEmpty(startDate) ? DateTime.Parse(startDate) : DateTime.UtcNow.AddMonths(-6);
            var end = !string.IsNullOrEmpty(endDate) ? DateTime.Parse(endDate) : DateTime.UtcNow.AddDays(1);

            // Inflows: Sales revenue (paid invoices)
            var arPaid = await accDb.Invoices
                .Where(i => i.Type == InvoiceType.Receivable && i.IssueDate >= start && i.IssueDate < end)
                .SumAsync(i => (decimal?)i.PaidAmount) ?? 0;

            // Outflows: AP payments + Expenses paid
            var apPaid = await accDb.Invoices
                .Where(i => i.Type == InvoiceType.Payable && i.IssueDate >= start && i.IssueDate < end)
                .SumAsync(i => (decimal?)i.PaidAmount) ?? 0;

            var expensesPaid = await accDb.Expenses
                .Where(e => e.Status == ExpenseStatus.Paid && e.ExpenseDate >= start && e.ExpenseDate < end)
                .SumAsync(e => (decimal?)e.TotalAmount) ?? 0;

            // Monthly breakdown
            var monthlyInflows = await accDb.Invoices
                .Where(i => i.Type == InvoiceType.Receivable && i.IssueDate >= start && i.IssueDate < end)
                .GroupBy(i => new { i.IssueDate.Year, i.IssueDate.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Amount = g.Sum(i => i.PaidAmount) })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToListAsync();

            var monthlyOutflows = await accDb.Invoices
                .Where(i => i.Type == InvoiceType.Payable && i.IssueDate >= start && i.IssueDate < end)
                .GroupBy(i => new { i.IssueDate.Year, i.IssueDate.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Amount = g.Sum(i => i.PaidAmount) })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToListAsync();

            return Results.Ok(new
            {
                Period = new { Start = start, End = end },
                TotalInflows = arPaid,
                TotalOutflows = apPaid + expensesPaid,
                NetCashFlow = arPaid - apPaid - expensesPaid,
                Breakdown = new
                {
                    ARCollected = arPaid,
                    APPaid = apPaid,
                    ExpensesPaid = expensesPaid
                },
                MonthlyInflows = monthlyInflows.Select(m => new { Month = $"{m.Month:00}/{m.Year}", m.Amount }),
                MonthlyOutflows = monthlyOutflows.Select(m => new { Month = $"{m.Month:00}/{m.Year}", m.Amount })
            });
        });

        // Revenue vs Expense report
        group.MapGet("/revenue-expense", async (
            SalesDbContext salesDb,
            AccountingDbContext accDb,
            string? startDate = null,
            string? endDate = null) =>
        {
            var start = !string.IsNullOrEmpty(startDate) ? DateTime.Parse(startDate) : DateTime.UtcNow.AddMonths(-12);
            var end = !string.IsNullOrEmpty(endDate) ? DateTime.Parse(endDate) : DateTime.UtcNow.AddDays(1);

            // Revenue from sales
            var monthlyRevenue = await salesDb.Orders
                .Where(o => o.OrderDate >= start && o.OrderDate < end && o.Status != OrderStatus.Cancelled)
                .GroupBy(o => new { o.OrderDate.Year, o.OrderDate.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Revenue = g.Sum(o => o.TotalAmount), OrderCount = g.Count() })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToListAsync();

            // Expenses by month
            var monthlyExpenses = await accDb.Expenses
                .Where(e => e.Status == ExpenseStatus.Paid && e.ExpenseDate >= start && e.ExpenseDate < end)
                .GroupBy(e => new { e.ExpenseDate.Year, e.ExpenseDate.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Expense = g.Sum(e => e.TotalAmount), Count = g.Count() })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToListAsync();

            // Expense by category
            var expenseByCategory = await accDb.Expenses
                .Where(e => e.Status == ExpenseStatus.Paid && e.ExpenseDate >= start && e.ExpenseDate < end)
                .Include(e => e.Category)
                .GroupBy(e => new { e.CategoryId, CategoryName = e.Category!.Name })
                .Select(g => new { g.Key.CategoryName, Total = g.Sum(e => e.TotalAmount), Count = g.Count() })
                .OrderByDescending(x => x.Total)
                .ToListAsync();

            var totalRevenue = monthlyRevenue.Sum(m => m.Revenue);
            var totalExpenses = monthlyExpenses.Sum(m => m.Expense);

            return Results.Ok(new
            {
                Period = new { Start = start, End = end },
                Summary = new
                {
                    TotalRevenue = totalRevenue,
                    TotalExpenses = totalExpenses,
                    GrossProfit = totalRevenue - totalExpenses,
                    ProfitMargin = totalRevenue > 0 ? (totalRevenue - totalExpenses) / totalRevenue * 100 : 0
                },
                MonthlyData = monthlyRevenue.Select(r => new
                {
                    Month = $"{r.Month:00}/{r.Year}",
                    r.Revenue,
                    Expense = monthlyExpenses.FirstOrDefault(e => e.Year == r.Year && e.Month == r.Month)?.Expense ?? 0,
                    Profit = r.Revenue - (monthlyExpenses.FirstOrDefault(e => e.Year == r.Year && e.Month == r.Month)?.Expense ?? 0)
                }),
                ExpenseByCategory = expenseByCategory
            });
        });

        // Balance overview (Assets vs Liabilities)
        group.MapGet("/balance-overview", async (
            AccountingDbContext accDb,
            InventoryDbContext invDb,
            CatalogDbContext catalogDb) =>
        {
            // Assets
            var arOutstanding = await accDb.Invoices
                .Where(i => i.Type == InvoiceType.Receivable && i.Status != InvoiceStatus.Paid && i.Status != InvoiceStatus.Cancelled)
                .SumAsync(i => (decimal?)i.OutstandingAmount) ?? 0;

            var inventoryValue = await invDb.InventoryItems
                .SumAsync(i => (decimal?)i.QuantityOnHand * i.AverageCost) ?? 0;

            // Liabilities
            var apOutstanding = await accDb.Invoices
                .Where(i => i.Type == InvoiceType.Payable && i.Status != InvoiceStatus.Paid && i.Status != InvoiceStatus.Cancelled)
                .SumAsync(i => (decimal?)i.OutstandingAmount) ?? 0;

            var pendingExpenses = await accDb.Expenses
                .Where(e => e.Status == ExpenseStatus.Approved)
                .SumAsync(e => (decimal?)e.TotalAmount) ?? 0;

            // AR/AP aging
            var arAging = await accDb.Invoices
                .Where(i => i.Type == InvoiceType.Receivable && i.Status != InvoiceStatus.Paid && i.Status != InvoiceStatus.Cancelled)
                .GroupBy(i => i.AgingBucket)
                .Select(g => new { Bucket = g.Key.ToString(), Amount = g.Sum(i => i.OutstandingAmount), Count = g.Count() })
                .ToListAsync();

            var apAging = await accDb.Invoices
                .Where(i => i.Type == InvoiceType.Payable && i.Status != InvoiceStatus.Paid && i.Status != InvoiceStatus.Cancelled)
                .GroupBy(i => i.AgingBucket)
                .Select(g => new { Bucket = g.Key.ToString(), Amount = g.Sum(i => i.OutstandingAmount), Count = g.Count() })
                .ToListAsync();

            return Results.Ok(new
            {
                Assets = new
                {
                    AccountsReceivable = arOutstanding,
                    InventoryValue = inventoryValue,
                    TotalAssets = arOutstanding + inventoryValue
                },
                Liabilities = new
                {
                    AccountsPayable = apOutstanding,
                    PendingExpenses = pendingExpenses,
                    TotalLiabilities = apOutstanding + pendingExpenses
                },
                NetPosition = (arOutstanding + inventoryValue) - (apOutstanding + pendingExpenses),
                ARAgingBreakdown = arAging,
                APAgingBreakdown = apAging
            });
        });

        // Export financial report
        group.MapGet("/export/financial", async (
            SalesDbContext salesDb,
            AccountingDbContext accDb,
            InventoryDbContext invDb,
            string? startDate = null,
            string? endDate = null) =>
        {
            var start = !string.IsNullOrEmpty(startDate) ? DateTime.Parse(startDate) : DateTime.UtcNow.AddMonths(-12);
            var end = !string.IsNullOrEmpty(endDate) ? DateTime.Parse(endDate) : DateTime.UtcNow.AddDays(1);

            using var workbook = new XLWorkbook();

            // Summary sheet
            var summary = workbook.Worksheets.Add("Tổng quan tài chính");
            summary.Cell(1, 1).Value = "BÁO CÁO TÀI CHÍNH";
            summary.Cell(1, 1).Style.Font.Bold = true;
            summary.Cell(1, 1).Style.Font.FontSize = 18;
            summary.Cell(2, 1).Value = $"Kỳ báo cáo: {start:dd/MM/yyyy} - {end:dd/MM/yyyy}";

            var totalRevenue = await salesDb.Orders
                .Where(o => o.OrderDate >= start && o.OrderDate < end && o.Status != OrderStatus.Cancelled)
                .SumAsync(o => (decimal?)o.TotalAmount) ?? 0;

            var totalExpenses = await accDb.Expenses
                .Where(e => e.Status == ExpenseStatus.Paid && e.ExpenseDate >= start && e.ExpenseDate < end)
                .SumAsync(e => (decimal?)e.TotalAmount) ?? 0;

            var arOutstanding = await accDb.Invoices
                .Where(i => i.Type == InvoiceType.Receivable && i.Status != InvoiceStatus.Paid)
                .SumAsync(i => (decimal?)i.OutstandingAmount) ?? 0;

            var apOutstanding = await accDb.Invoices
                .Where(i => i.Type == InvoiceType.Payable && i.Status != InvoiceStatus.Paid)
                .SumAsync(i => (decimal?)i.OutstandingAmount) ?? 0;

            summary.Cell(4, 1).Value = "DOANH THU VÀ CHI PHÍ";
            summary.Cell(4, 1).Style.Font.Bold = true;
            summary.Cell(5, 1).Value = "Tổng doanh thu:";
            summary.Cell(5, 2).Value = totalRevenue;
            summary.Cell(6, 1).Value = "Tổng chi phí:";
            summary.Cell(6, 2).Value = totalExpenses;
            summary.Cell(7, 1).Value = "Lợi nhuận gộp:";
            summary.Cell(7, 2).Value = totalRevenue - totalExpenses;

            summary.Cell(9, 1).Value = "CÔNG NỢ";
            summary.Cell(9, 1).Style.Font.Bold = true;
            summary.Cell(10, 1).Value = "Công nợ phải thu (AR):";
            summary.Cell(10, 2).Value = arOutstanding;
            summary.Cell(11, 1).Value = "Công nợ phải trả (AP):";
            summary.Cell(11, 2).Value = apOutstanding;
            summary.Cell(12, 1).Value = "Chênh lệch:";
            summary.Cell(12, 2).Value = arOutstanding - apOutstanding;

            summary.Range("B5:B12").Style.NumberFormat.Format = "#,##0";
            summary.Columns().AdjustToContents();

            // Revenue by month
            var monthlyRevenue = await salesDb.Orders
                .Where(o => o.OrderDate >= start && o.OrderDate < end && o.Status != OrderStatus.Cancelled)
                .GroupBy(o => new { o.OrderDate.Year, o.OrderDate.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Revenue = g.Sum(o => o.TotalAmount) })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToListAsync();

            var revenueSheet = workbook.Worksheets.Add("Doanh thu theo tháng");
            revenueSheet.Cell(1, 1).Value = "Tháng";
            revenueSheet.Cell(1, 2).Value = "Doanh thu";
            revenueSheet.Range(1, 1, 1, 2).Style.Font.Bold = true;
            revenueSheet.Range(1, 1, 1, 2).Style.Fill.BackgroundColor = XLColor.LightGray;

            for (int i = 0; i < monthlyRevenue.Count; i++)
            {
                revenueSheet.Cell(i + 2, 1).Value = $"{monthlyRevenue[i].Month:00}/{monthlyRevenue[i].Year}";
                revenueSheet.Cell(i + 2, 2).Value = monthlyRevenue[i].Revenue;
            }
            revenueSheet.Columns().AdjustToContents();

            // Expenses by category
            var expensesByCategory = await accDb.Expenses
                .Where(e => e.Status == ExpenseStatus.Paid && e.ExpenseDate >= start && e.ExpenseDate < end)
                .Include(e => e.Category)
                .GroupBy(e => e.Category!.Name)
                .Select(g => new { Category = g.Key, Total = g.Sum(e => e.TotalAmount), Count = g.Count() })
                .OrderByDescending(x => x.Total)
                .ToListAsync();

            var expenseSheet = workbook.Worksheets.Add("Chi phí theo danh mục");
            expenseSheet.Cell(1, 1).Value = "Danh mục";
            expenseSheet.Cell(1, 2).Value = "Tổng tiền";
            expenseSheet.Cell(1, 3).Value = "Số lượng";
            expenseSheet.Range(1, 1, 1, 3).Style.Font.Bold = true;
            expenseSheet.Range(1, 1, 1, 3).Style.Fill.BackgroundColor = XLColor.LightGray;

            for (int i = 0; i < expensesByCategory.Count; i++)
            {
                expenseSheet.Cell(i + 2, 1).Value = expensesByCategory[i].Category;
                expenseSheet.Cell(i + 2, 2).Value = expensesByCategory[i].Total;
                expenseSheet.Cell(i + 2, 3).Value = expensesByCategory[i].Count;
            }
            expenseSheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            stream.Position = 0;

            return Results.File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"BaoCaoTaiChinh_{start:yyyyMMdd}_{end:yyyyMMdd}.xlsx");
        });
    }
}
