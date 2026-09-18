using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using BuildingBlocks.Spreadsheet;
using HR.Application.Statutory;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace HR.Endpoints.Statutory;

/// <summary>
/// W2-25 / D06 §4 — bảng kê giờ + tiền làm thêm/làm đêm (NĐ 253/2026 Đ.26.1).
/// Tiền OT được miễn thuế TNCN từ kỳ 2026, nhưng chỉ khi doanh nghiệp lập được bảng kê này.
/// Quyền: <c>HR.ViewPayroll</c> (dữ liệu lương là dữ liệu nhạy cảm nhất trong hệ thống).
/// </summary>
public static class OvertimeScheduleEndpoints
{
    public static void MapOvertimeScheduleEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hr/payroll/overtime-schedule")
            .RequirePermission(Permissions.HR.ViewPayroll);

        // GET /api/hr/payroll/overtime-schedule?year=2026&month=9
        group.MapGet("", async (OvertimeScheduleService svc, int year, int month, CancellationToken ct) =>
        {
            if (month is < 1 or > 12) throw new RequestValidationException("month", "Tháng phải từ 1 đến 12.");
            if (year is < 2000 or > 2100) throw new RequestValidationException("year", "Năm không hợp lệ.");
            return Results.Ok(await svc.BuildAsync(year, month, ct));
        });

        // GET /api/hr/payroll/overtime-schedule/export?year=&month=  -> CSV cho cơ quan thuế.
        group.MapGet("/export", async (OvertimeScheduleService svc, int year, int month, CancellationToken ct) =>
        {
            if (month is < 1 or > 12) throw new RequestValidationException("month", "Tháng phải từ 1 đến 12.");
            var schedule = await svc.BuildAsync(year, month, ct);

            var csv = new System.Text.StringBuilder();
            csv.AppendLine($"Bảng kê giờ làm thêm và làm đêm - kỳ {month:D2}/{year}");
            csv.AppendLine(schedule.LegalBasis);
            csv.AppendLine("Mã NV,Họ tên,Lương giờ,Giờ thường,Giờ nghỉ tuần,Giờ lễ,"
                           + "Giờ đêm thường,Giờ đêm nghỉ tuần,Giờ đêm lễ,Tổng giờ,Tổng tiền,Giờ miễn thuế,Tiền miễn thuế,Tiền chịu thuế");

            foreach (var l in schedule.Lines)
            {
                csv.AppendLine(string.Join(',',
                    ExcelSafeText.Neutralize(l.EmployeeCode),
                    ExcelSafeText.Neutralize(l.FullName),
                    l.HourlyRate, l.WeekdayHours, l.RestDayHours, l.HolidayHours,
                    l.NightWeekdayHours, l.NightRestDayHours, l.NightHolidayHours,
                    l.TotalHours, l.TotalPay, l.ExemptHours, l.ExemptPay, l.TaxablePay));
            }

            var bytes = System.Text.Encoding.UTF8.GetPreamble()
                .Concat(System.Text.Encoding.UTF8.GetBytes(csv.ToString())).ToArray();
            return Results.File(bytes, "text/csv; charset=utf-8", $"bang-ke-lam-them-{year}-{month:D2}.csv");
        });
    }
}
