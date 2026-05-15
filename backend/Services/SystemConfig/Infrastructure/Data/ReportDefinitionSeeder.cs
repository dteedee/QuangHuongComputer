using SystemConfig.Domain;
using SystemConfig.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace SystemConfig.Infrastructure.Data;

public static class ReportDefinitionSeeder
{
    public static async Task SeedAsync(SystemConfigDbContext context)
    {
        if (await context.ReportDefinitions.AnyAsync()) return;

        var definitions = new List<ReportDefinition>
        {
            new ReportDefinition
            {
                Code = "sales_summary",
                Name = "Tổng hợp doanh thu",
                Description = "Doanh thu theo tháng, đơn hàng, phân phối trạng thái",
                Category = "Sales",
                DataSourceEndpoint = "/api/reports/sales-summary",
                DisplayOrder = 1,
                AvailableColumns = """
                [
                  {"key":"month","label":"Tháng","type":"string","defaultVisible":true},
                  {"key":"revenue","label":"Doanh thu","type":"currency","defaultVisible":true},
                  {"key":"orderCount","label":"Số đơn","type":"number","defaultVisible":true},
                  {"key":"todayRevenue","label":"Doanh thu hôm nay","type":"currency","defaultVisible":false},
                  {"key":"todayOrders","label":"Đơn hôm nay","type":"number","defaultVisible":false}
                ]
                """,
                AvailableFilters = """
                [
                  {"key":"startDate","label":"Từ ngày","type":"date"},
                  {"key":"endDate","label":"Đến ngày","type":"date"}
                ]
                """
            },
            new ReportDefinition
            {
                Code = "top_products",
                Name = "Top sản phẩm bán chạy",
                Description = "Xếp hạng sản phẩm theo doanh thu và số lượng bán",
                Category = "Sales",
                DataSourceEndpoint = "/api/reports/top-products",
                DisplayOrder = 2,
                AvailableColumns = """
                [
                  {"key":"rank","label":"Hạng","type":"number","defaultVisible":true},
                  {"key":"productName","label":"Sản phẩm","type":"string","defaultVisible":true},
                  {"key":"totalQuantity","label":"Số lượng","type":"number","defaultVisible":true},
                  {"key":"totalRevenue","label":"Doanh thu","type":"currency","defaultVisible":true},
                  {"key":"orderCount","label":"Số đơn","type":"number","defaultVisible":true}
                ]
                """,
                AvailableFilters = """
                [
                  {"key":"startDate","label":"Từ ngày","type":"date"},
                  {"key":"endDate","label":"Đến ngày","type":"date"},
                  {"key":"limit","label":"Số lượng top","type":"number"}
                ]
                """
            },
            new ReportDefinition
            {
                Code = "top_customers",
                Name = "Top khách hàng VIP",
                Description = "Khách hàng có chi tiêu cao nhất",
                Category = "CRM",
                DataSourceEndpoint = "/api/reports/top-customers",
                DisplayOrder = 3,
                AvailableColumns = """
                [
                  {"key":"rank","label":"Hạng","type":"number","defaultVisible":true},
                  {"key":"customerName","label":"Khách hàng","type":"string","defaultVisible":true},
                  {"key":"email","label":"Email","type":"string","defaultVisible":true},
                  {"key":"totalSpent","label":"Tổng chi tiêu","type":"currency","defaultVisible":true},
                  {"key":"orderCount","label":"Số đơn","type":"number","defaultVisible":true},
                  {"key":"lastOrderDate","label":"Mua gần nhất","type":"date","defaultVisible":true}
                ]
                """,
                AvailableFilters = """
                [
                  {"key":"limit","label":"Số lượng top","type":"number"}
                ]
                """
            },
            new ReportDefinition
            {
                Code = "inventory_value",
                Name = "Giá trị tồn kho",
                Description = "Tổng giá trị hàng tồn, sản phẩm sắp hết hàng",
                Category = "Inventory",
                DataSourceEndpoint = "/api/reports/inventory-value",
                DisplayOrder = 4,
                AvailableColumns = """
                [
                  {"key":"productName","label":"Sản phẩm","type":"string","defaultVisible":true},
                  {"key":"quantityOnHand","label":"Tồn kho","type":"number","defaultVisible":true},
                  {"key":"reorderPoint","label":"Điểm đặt lại","type":"number","defaultVisible":true},
                  {"key":"averageCost","label":"Giá vốn TB","type":"currency","defaultVisible":true}
                ]
                """,
                AvailableFilters = """[]"""
            },
            new ReportDefinition
            {
                Code = "tech_performance",
                Name = "Hiệu suất kỹ thuật viên",
                Description = "Số lượng công việc, tỷ lệ hoàn thành, doanh thu sửa chữa",
                Category = "Repair",
                DataSourceEndpoint = "/api/reports/tech-performance",
                DisplayOrder = 5,
                AvailableColumns = """
                [
                  {"key":"rank","label":"Hạng","type":"number","defaultVisible":true},
                  {"key":"technicianName","label":"Kỹ thuật viên","type":"string","defaultVisible":true},
                  {"key":"specialty","label":"Chuyên môn","type":"string","defaultVisible":true},
                  {"key":"totalJobs","label":"Tổng công việc","type":"number","defaultVisible":true},
                  {"key":"completedJobs","label":"Hoàn thành","type":"number","defaultVisible":true},
                  {"key":"successRate","label":"Tỷ lệ (%)","type":"number","defaultVisible":true},
                  {"key":"totalRevenue","label":"Doanh thu","type":"currency","defaultVisible":true}
                ]
                """,
                AvailableFilters = """
                [
                  {"key":"limit","label":"Số lượng top","type":"number"}
                ]
                """
            },
            new ReportDefinition
            {
                Code = "hr_attendance",
                Name = "Chấm công nhân sự",
                Description = "Thống kê chấm công, ngày nghỉ, tăng ca",
                Category = "HR",
                DataSourceEndpoint = "/api/reports/hr/attendance",
                DisplayOrder = 6,
                AvailableColumns = """
                [
                  {"key":"employeeName","label":"Nhân viên","type":"string","defaultVisible":true},
                  {"key":"department","label":"Phòng ban","type":"string","defaultVisible":true},
                  {"key":"presentDays","label":"Ngày có mặt","type":"number","defaultVisible":true},
                  {"key":"absentDays","label":"Ngày vắng","type":"number","defaultVisible":true},
                  {"key":"leaveDays","label":"Ngày nghỉ phép","type":"number","defaultVisible":true},
                  {"key":"overtimeHours","label":"Giờ tăng ca","type":"number","defaultVisible":false}
                ]
                """,
                AvailableFilters = """
                [
                  {"key":"month","label":"Tháng","type":"number"},
                  {"key":"year","label":"Năm","type":"number"},
                  {"key":"department","label":"Phòng ban","type":"string"}
                ]
                """
            },
            new ReportDefinition
            {
                Code = "hr_payroll",
                Name = "Bảng lương",
                Description = "Tổng hợp lương, phụ cấp, bảo hiểm theo tháng",
                Category = "HR",
                DataSourceEndpoint = "/api/reports/hr/payroll",
                DisplayOrder = 7,
                AvailableColumns = """
                [
                  {"key":"employeeName","label":"Nhân viên","type":"string","defaultVisible":true},
                  {"key":"baseSalary","label":"Lương cơ bản","type":"currency","defaultVisible":true},
                  {"key":"allowances","label":"Phụ cấp","type":"currency","defaultVisible":true},
                  {"key":"overtime","label":"Tăng ca","type":"currency","defaultVisible":true},
                  {"key":"deductions","label":"Khấu trừ","type":"currency","defaultVisible":false},
                  {"key":"netSalary","label":"Thực nhận","type":"currency","defaultVisible":true}
                ]
                """,
                AvailableFilters = """
                [
                  {"key":"month","label":"Tháng","type":"number"},
                  {"key":"year","label":"Năm","type":"number"}
                ]
                """
            },
            new ReportDefinition
            {
                Code = "warranty_claims",
                Name = "Yêu cầu bảo hành",
                Description = "Thống kê bảo hành, tỷ lệ xử lý, chi phí",
                Category = "Warranty",
                DataSourceEndpoint = "/api/reports/warranty/claims",
                DisplayOrder = 8,
                AvailableColumns = """
                [
                  {"key":"claimCode","label":"Mã yêu cầu","type":"string","defaultVisible":true},
                  {"key":"productName","label":"Sản phẩm","type":"string","defaultVisible":true},
                  {"key":"customerName","label":"Khách hàng","type":"string","defaultVisible":true},
                  {"key":"status","label":"Trạng thái","type":"enum","defaultVisible":true},
                  {"key":"createdAt","label":"Ngày tạo","type":"date","defaultVisible":true},
                  {"key":"cost","label":"Chi phí","type":"currency","defaultVisible":false}
                ]
                """,
                AvailableFilters = """
                [
                  {"key":"startDate","label":"Từ ngày","type":"date"},
                  {"key":"endDate","label":"Đến ngày","type":"date"},
                  {"key":"status","label":"Trạng thái","type":"enum","options":["Pending","InProgress","Resolved","Rejected"]}
                ]
                """
            },
            new ReportDefinition
            {
                Code = "crm_campaigns",
                Name = "Chiến dịch CRM",
                Description = "Hiệu quả chiến dịch marketing, tỷ lệ chuyển đổi",
                Category = "CRM",
                DataSourceEndpoint = "/api/reports/crm/campaigns",
                DisplayOrder = 9,
                AvailableColumns = """
                [
                  {"key":"campaignName","label":"Chiến dịch","type":"string","defaultVisible":true},
                  {"key":"channel","label":"Kênh","type":"string","defaultVisible":true},
                  {"key":"sent","label":"Đã gửi","type":"number","defaultVisible":true},
                  {"key":"opened","label":"Đã mở","type":"number","defaultVisible":true},
                  {"key":"clicked","label":"Đã click","type":"number","defaultVisible":false},
                  {"key":"converted","label":"Chuyển đổi","type":"number","defaultVisible":true},
                  {"key":"revenue","label":"Doanh thu","type":"currency","defaultVisible":true}
                ]
                """,
                AvailableFilters = """
                [
                  {"key":"startDate","label":"Từ ngày","type":"date"},
                  {"key":"endDate","label":"Đến ngày","type":"date"}
                ]
                """
            },
            new ReportDefinition
            {
                Code = "financial_pl",
                Name = "Báo cáo lãi lỗ",
                Description = "Doanh thu, chi phí, lợi nhuận theo kỳ",
                Category = "Finance",
                DataSourceEndpoint = "/api/reports/financial/pl",
                DisplayOrder = 10,
                AvailableColumns = """
                [
                  {"key":"period","label":"Kỳ","type":"string","defaultVisible":true},
                  {"key":"revenue","label":"Doanh thu","type":"currency","defaultVisible":true},
                  {"key":"cogs","label":"Giá vốn","type":"currency","defaultVisible":true},
                  {"key":"grossProfit","label":"Lợi nhuận gộp","type":"currency","defaultVisible":true},
                  {"key":"expenses","label":"Chi phí","type":"currency","defaultVisible":true},
                  {"key":"netProfit","label":"Lợi nhuận ròng","type":"currency","defaultVisible":true},
                  {"key":"margin","label":"Biên lợi nhuận (%)","type":"number","defaultVisible":false}
                ]
                """,
                AvailableFilters = """
                [
                  {"key":"startDate","label":"Từ ngày","type":"date"},
                  {"key":"endDate","label":"Đến ngày","type":"date"}
                ]
                """
            },
            new ReportDefinition
            {
                Code = "tax_report",
                Name = "Báo cáo thuế",
                Description = "VAT đầu vào, đầu ra, thuế phải nộp",
                Category = "Finance",
                DataSourceEndpoint = "/api/reports/tax",
                DisplayOrder = 11,
                AvailableColumns = """
                [
                  {"key":"period","label":"Kỳ","type":"string","defaultVisible":true},
                  {"key":"salesRevenue","label":"Doanh thu chịu thuế","type":"currency","defaultVisible":true},
                  {"key":"outputVat","label":"VAT đầu ra","type":"currency","defaultVisible":true},
                  {"key":"inputVat","label":"VAT đầu vào","type":"currency","defaultVisible":true},
                  {"key":"vatPayable","label":"VAT phải nộp","type":"currency","defaultVisible":true}
                ]
                """,
                AvailableFilters = """
                [
                  {"key":"month","label":"Tháng","type":"number"},
                  {"key":"year","label":"Năm","type":"number"}
                ]
                """
            },
            new ReportDefinition
            {
                Code = "period_comparison",
                Name = "So sánh kỳ kinh doanh",
                Description = "So sánh doanh thu, đơn hàng giữa các kỳ",
                Category = "Analytics",
                DataSourceEndpoint = "/api/reports/comparison",
                DisplayOrder = 12,
                AvailableColumns = """
                [
                  {"key":"metric","label":"Chỉ số","type":"string","defaultVisible":true},
                  {"key":"period1Value","label":"Kỳ 1","type":"currency","defaultVisible":true},
                  {"key":"period2Value","label":"Kỳ 2","type":"currency","defaultVisible":true},
                  {"key":"change","label":"Thay đổi","type":"currency","defaultVisible":true},
                  {"key":"changePercent","label":"% Thay đổi","type":"number","defaultVisible":true}
                ]
                """,
                AvailableFilters = """
                [
                  {"key":"period1Start","label":"Kỳ 1 từ","type":"date"},
                  {"key":"period1End","label":"Kỳ 1 đến","type":"date"},
                  {"key":"period2Start","label":"Kỳ 2 từ","type":"date"},
                  {"key":"period2End","label":"Kỳ 2 đến","type":"date"}
                ]
                """
            }
        };

        await context.ReportDefinitions.AddRangeAsync(definitions);
        await context.SaveChangesAsync();
    }
}
