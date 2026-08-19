using SystemConfig.Domain;
using Microsoft.EntityFrameworkCore;

namespace SystemConfig.Infrastructure.Data;

/// <summary>
/// Seed các cấu hình bảng dữ liệu (data-grid) mặc định cho các trang admin cốt lõi
/// (products/orders/leads). Idempotent — chỉ insert Key còn thiếu, không ghi đè tuỳ biến của admin.
/// </summary>
public static class TableViewDefinitionSeeder
{
    public static async Task SeedAsync(SystemConfigDbContext context)
    {
        var defaults = new List<TableViewDefinition>
        {
            new TableViewDefinition
            {
                Key = "admin.products",
                Name = "Danh sách sản phẩm",
                IsSystem = true,
                ColumnsJson = """
                [
                  {"key":"name","label":"Tên sản phẩm","type":"text","sortable":true,"visible":true,"width":260},
                  {"key":"sku","label":"SKU","type":"text","sortable":true,"visible":true,"width":140},
                  {"key":"categoryId","label":"Danh mục","type":"text","sortable":false,"visible":true,"width":160},
                  {"key":"price","label":"Giá bán","type":"currency","sortable":true,"visible":true,"width":140,"format":"vnd"},
                  {"key":"stockQuantity","label":"Tồn kho","type":"number","sortable":true,"visible":true,"width":100},
                  {"key":"status","label":"Trạng thái","type":"badge","sortable":false,"visible":true,"width":120},
                  {"key":"isActive","label":"Hiển thị","type":"boolean","sortable":false,"visible":true,"width":100}
                ]
                """,
                FiltersJson = """[{"key":"categoryId","label":"Danh mục","type":"select"},{"key":"status","label":"Trạng thái","type":"select"}]"""
            },
            new TableViewDefinition
            {
                Key = "admin.orders",
                Name = "Danh sách đơn hàng",
                IsSystem = true,
                ColumnsJson = """
                [
                  {"key":"orderNumber","label":"Mã đơn","type":"text","sortable":true,"visible":true,"width":160},
                  {"key":"customerId","label":"Khách hàng","type":"text","sortable":false,"visible":true,"width":200},
                  {"key":"status","label":"Trạng thái","type":"badge","sortable":true,"visible":true,"width":140},
                  {"key":"paymentStatus","label":"Thanh toán","type":"badge","sortable":true,"visible":true,"width":140},
                  {"key":"totalAmount","label":"Tổng tiền","type":"currency","sortable":true,"visible":true,"width":140,"format":"vnd"},
                  {"key":"orderDate","label":"Ngày đặt","type":"date","sortable":true,"visible":true,"width":160}
                ]
                """,
                FiltersJson = """[{"key":"status","label":"Trạng thái","type":"select"},{"key":"paymentStatus","label":"Thanh toán","type":"select"}]"""
            },
            new TableViewDefinition
            {
                Key = "admin.leads",
                Name = "Danh sách lead (CRM)",
                IsSystem = true,
                ColumnsJson = """
                [
                  {"key":"fullName","label":"Họ tên","type":"text","sortable":true,"visible":true,"width":200},
                  {"key":"email","label":"Email","type":"text","sortable":false,"visible":true,"width":220},
                  {"key":"phone","label":"Điện thoại","type":"text","sortable":false,"visible":true,"width":140},
                  {"key":"source","label":"Nguồn","type":"badge","sortable":true,"visible":true,"width":120},
                  {"key":"status","label":"Trạng thái","type":"badge","sortable":true,"visible":true,"width":120},
                  {"key":"estimatedValue","label":"Giá trị dự kiến","type":"currency","sortable":true,"visible":true,"width":160,"format":"vnd"}
                ]
                """,
                FiltersJson = """[{"key":"status","label":"Trạng thái","type":"select"},{"key":"source","label":"Nguồn","type":"select"}]"""
            }
        };

        var existingKeys = await context.TableViewDefinitions
            .Select(t => t.Key)
            .ToListAsync();

        var toInsert = defaults.Where(d => !existingKeys.Contains(d.Key)).ToList();
        if (toInsert.Count == 0) return;

        await context.TableViewDefinitions.AddRangeAsync(toInsert);
        await context.SaveChangesAsync();
    }
}
