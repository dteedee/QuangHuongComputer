using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using HR.Infrastructure;
using HR.Domain;

namespace Reporting.Endpoints;

public static class HRReportEndpoints
{
    public static void MapHRReportEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/hr/attendance-summary", async (
            HRDbContext hrDb, string? startDate, string? endDate, Guid? departmentId) =>
        {
            var today = DateTime.UtcNow.Date;
            var start = !string.IsNullOrEmpty(startDate) ? DateTime.TryParse(startDate, out var _sd) ? _sd : DateTime.UtcNow.AddMonths(-3) : today.AddMonths(-1);
            var end = !string.IsNullOrEmpty(endDate) ? DateTime.TryParse(endDate, out var _ed) ? _ed : DateTime.UtcNow.AddDays(1).AddDays(1) : today.AddDays(1);

            var empQuery = hrDb.Employees.Where(e => e.Status == EmployeeStatus.Active);
            var employees = await empQuery.Select(e => new { e.Id, e.FullName, e.Department }).ToListAsync();

            var records = await hrDb.AttendanceRecords
                .Where(a => a.Date >= start && a.Date < end)
                .ToListAsync();

            var empLookup = employees.ToDictionary(e => e.Id);

            var grouped = records.GroupBy(a => a.EmployeeId).Select(g =>
            {
                var emp = empLookup.TryGetValue(g.Key, out var e) ? e : null;
                var total = g.Count();
                var present = g.Count(a => a.Status == AttendanceStatus.Present);
                var late = g.Count(a => a.Status == AttendanceStatus.Late);
                var halfDay = g.Count(a => a.Status == AttendanceStatus.HalfDay);
                var attendable = total > 0 ? total : 1;
                var punctualBase = present + late > 0 ? present + late : 1;
                return new
                {
                    EmployeeId = g.Key,
                    Name = emp?.FullName ?? "Unknown",
                    Department = emp?.Department ?? "",
                    AttendanceRate = Math.Round((double)(present + late + halfDay) / attendable * 100, 1),
                    PunctualityRate = Math.Round((double)present / punctualBase * 100, 1),
                    TotalOTHours = g.Sum(a => (decimal?)a.OvertimeHours) ?? 0,
                    Present = present, Late = late, Absent = g.Count(a => a.Status == AttendanceStatus.Absent)
                };
            }).ToList();

            var totalEmp = employees.Count;
            var avgAttendance = grouped.Any() ? Math.Round(grouped.Average(x => x.AttendanceRate), 1) : 0;
            var avgPunctuality = grouped.Any() ? Math.Round(grouped.Average(x => x.PunctualityRate), 1) : 0;
            var totalOT = grouped.Sum(x => x.TotalOTHours);

            return Results.Ok(new
            {
                TotalEmployees = totalEmp, AvgAttendanceRate = avgAttendance,
                AvgPunctualityRate = avgPunctuality, TotalOTHours = totalOT,
                Employees = grouped.OrderByDescending(x => x.AttendanceRate)
            });
        });

        group.MapGet("/hr/employee-performance", async (
            HRDbContext hrDb, string? startDate, string? endDate, int top = 20) =>
        {
            var today = DateTime.UtcNow;
            var parsedDate = DateTime.TryParse(startDate, out var sd) ? sd : today;
            var targetMonth = parsedDate.Month;
            var targetYear = parsedDate.Year;

            var payrolls = await hrDb.Payrolls
                .Include(p => p.Employee)
                .Where(p => p.Month == targetMonth && p.Year == targetYear && p.Employee != null)
                .ToListAsync();

            var result = payrolls
                .OrderByDescending(p => p.PerformanceBonus + p.AttendanceBonus)
                .Take(top)
                .Select((p, i) => new
                {
                    EmployeeId = p.EmployeeId,
                    Name = p.Employee!.FullName,
                    Department = p.Employee.Department,
                    Position = p.Employee.Position,
                    BaseSalary = p.BaseSalary,
                    PerformanceBonus = p.PerformanceBonus,
                    AttendanceBonus = p.AttendanceBonus,
                    OvertimePay = p.OvertimePay,
                    TotalBonuses = p.Bonuses,
                    NetPay = p.NetPay,
                    Rank = i + 1
                })
                .ToList();

            return Results.Ok(result);
        });

        group.MapGet("/hr/leave-summary", async (HRDbContext hrDb, int? year, string? departmentId) =>
        {
            var targetYear = year ?? DateTime.UtcNow.Year;
            var yearStart = new DateTime(targetYear, 1, 1);
            var yearEnd = yearStart.AddYears(1);

            var leaves = await hrDb.LeaveRequests
                .Where(l => l.Status == RequestStatus.Approved && l.StartDate >= yearStart && l.StartDate < yearEnd)
                .ToListAsync();

            var employees = await hrDb.Employees
                .Where(e => e.Status == EmployeeStatus.Active)
                .Select(e => new { e.Id, e.Department })
                .ToListAsync();

            var totalDays = leaves.Sum(l => l.Days);
            var byType = leaves.GroupBy(l => l.Type)
                .Select(g => new { Type = g.Key.ToString(), TotalDays = g.Sum(l => l.Days), Count = g.Count() })
                .OrderByDescending(x => x.TotalDays).ToList();

            var empDeptLookup = employees.ToDictionary(e => e.Id, e => e.Department);
            var byDepartment = leaves
                .Where(l => empDeptLookup.ContainsKey(l.EmployeeId))
                .GroupBy(l => empDeptLookup[l.EmployeeId])
                .Select(g => new { Department = g.Key, TotalDays = g.Sum(l => l.Days), Count = g.Count() })
                .OrderByDescending(x => x.TotalDays).ToList();

            // Annual leave quota: 12 days/employee/year
            const double annualQuota = 12.0;
            var utilizationRate = employees.Count > 0
                ? Math.Round((double)totalDays / (employees.Count * annualQuota) * 100, 1) : 0;

            return Results.Ok(new { TotalLeaveDays = totalDays, ByType = byType, ByDepartment = byDepartment, UtilizationRate = utilizationRate });
        });

        group.MapGet("/hr/timesheet-overview", async (HRDbContext hrDb, int? month, int? year, string? departmentId) =>
        {
            var today = DateTime.UtcNow.Date;
            var targetYear = year ?? today.Year;
            var targetMonth = month ?? today.Month;
            var periodStart = new DateTime(targetYear, targetMonth, 1);
            var periodEnd = periodStart.AddMonths(1);

            var timesheets = await hrDb.Timesheets
                .Where(t => t.Date >= periodStart && t.Date < periodEnd)
                .ToListAsync();

            var employees = await hrDb.Employees
                .Where(e => e.Status == EmployeeStatus.Active)
                .Select(e => new { e.Id, e.FullName, e.Department })
                .ToDictionaryAsync(e => e.Id);

            var daysInMonth = (periodEnd - periodStart).Days;
            var workdaysInMonth = Enumerable.Range(0, daysInMonth)
                .Count(d => periodStart.AddDays(d).DayOfWeek != DayOfWeek.Saturday && periodStart.AddDays(d).DayOfWeek != DayOfWeek.Sunday);
            var plannedHoursPerEmp = workdaysInMonth * 8m;

            var grouped = timesheets.GroupBy(t => t.EmployeeId).Select(g =>
            {
                var emp = employees.TryGetValue(g.Key, out var e) ? e : null;
                var actualHours = g.Sum(t => t.TotalHours);
                var otHours = g.Sum(t => t.OvertimeHours);
                return new
                {
                    EmployeeId = g.Key,
                    Name = emp?.FullName ?? "Unknown",
                    Department = emp?.Department ?? "",
                    ActualHours = actualHours, OvertimeHours = otHours,
                    PlannedHours = plannedHoursPerEmp,
                    Efficiency = plannedHoursPerEmp > 0 ? Math.Round((double)actualHours / (double)plannedHoursPerEmp * 100, 1) : 0
                };
            }).ToList();

            var totalActual = grouped.Sum(x => x.ActualHours);
            var totalPlanned = employees.Count * plannedHoursPerEmp;
            var totalOT = grouped.Sum(x => x.OvertimeHours);
            var efficiency = totalPlanned > 0 ? Math.Round((double)totalActual / (double)totalPlanned * 100, 1) : 0;

            return Results.Ok(new
            {
                TotalActualHours = totalActual, TotalPlannedHours = totalPlanned,
                TotalOTHours = totalOT, EfficiencyPercent = efficiency,
                Employees = grouped.OrderByDescending(x => x.Efficiency)
            });
        });

        group.MapGet("/hr/payroll-summary", async (HRDbContext hrDb, int? month, int? year) =>
        {
            var today = DateTime.UtcNow;
            var targetMonth = month ?? today.Month;
            var targetYear = year ?? today.Year;

            var payrolls = await hrDb.Payrolls
                .Include(p => p.Employee)
                .Where(p => p.Month == targetMonth && p.Year == targetYear)
                .ToListAsync();

            var totalGross = payrolls.Sum(p => p.BaseSalary + p.OvertimePay + p.Bonuses);
            var totalNet = payrolls.Sum(p => p.NetPay);
            var totalBonuses = payrolls.Sum(p => p.Bonuses);
            var totalDeductions = payrolls.Sum(p => p.Deductions);
            var totalInsurance = payrolls.Sum(p => p.InsuranceDeduction);
            var count = payrolls.Count;
            var avgNet = count > 0 ? Math.Round(totalNet / count, 0) : 0;

            var byDept = payrolls
                .Where(p => p.Employee != null)
                .GroupBy(p => p.Employee!.Department)
                .Select(g => new
                {
                    Department = g.Key,
                    EmployeeCount = g.Count(),
                    TotalGross = g.Sum(p => p.BaseSalary + p.OvertimePay + p.Bonuses),
                    TotalNet = g.Sum(p => p.NetPay),
                    AvgNet = g.Count() > 0 ? Math.Round(g.Sum(p => p.NetPay) / g.Count(), 0) : 0
                }).OrderByDescending(x => x.TotalNet).ToList();

            return Results.Ok(new
            {
                Month = targetMonth, Year = targetYear,
                TotalGrossSalary = totalGross, TotalNetSalary = totalNet,
                TotalBonuses = totalBonuses, TotalDeductions = totalDeductions,
                TotalInsurance = totalInsurance, EmployeeCount = count, AvgNetSalary = avgNet,
                ByDepartment = byDept
            });
        });

        group.MapGet("/hr/employee-ranking", async (
            HRDbContext hrDb, string? startDate, string? endDate, int top = 20) =>
        {
            var today = DateTime.UtcNow;
            var start = !string.IsNullOrEmpty(startDate) ? DateTime.TryParse(startDate, out var _sd) ? _sd : DateTime.UtcNow.AddMonths(-3) : today.AddMonths(-1);
            var end = !string.IsNullOrEmpty(endDate) ? DateTime.TryParse(endDate, out var _ed) ? _ed : DateTime.UtcNow.AddDays(1).AddDays(1) : today.AddDays(1);
            var targetMonth = start.Month;
            var targetYear = start.Year;

            var employees = await hrDb.Employees
                .Where(e => e.Status == EmployeeStatus.Active)
                .Select(e => new { e.Id, e.FullName, e.Department, e.Position })
                .ToListAsync();

            var attendance = await hrDb.AttendanceRecords
                .Where(a => a.Date >= start && a.Date < end)
                .ToListAsync();

            var payrolls = await hrDb.Payrolls
                .Where(p => p.Month == targetMonth && p.Year == targetYear)
                .Select(p => new { p.EmployeeId, p.PerformanceBonus, p.AttendanceBonus, p.NetPay })
                .ToListAsync();

            var leaves = await hrDb.LeaveRequests
                .Where(l => l.Status == RequestStatus.Approved && l.StartDate >= start && l.StartDate < end)
                .GroupBy(l => l.EmployeeId)
                .Select(g => new { EmployeeId = g.Key, TotalDays = g.Sum(l => l.Days) })
                .ToListAsync();

            var maxBonus = payrolls.Any() ? (double)payrolls.Max(p => p.PerformanceBonus + p.AttendanceBonus) : 1;
            if (maxBonus <= 0) maxBonus = 1;
            var maxLeaveDays = leaves.Any() ? (double)leaves.Max(l => l.TotalDays) : 1;

            var ranked = employees.Select(e =>
            {
                var att = attendance.Where(a => a.EmployeeId == e.Id).ToList();
                var total = att.Count > 0 ? att.Count : 1;
                var present = att.Count(a => a.Status == AttendanceStatus.Present);
                var late = att.Count(a => a.Status == AttendanceStatus.Late);
                var attendanceScore = (double)(present + late + att.Count(a => a.Status == AttendanceStatus.HalfDay)) / total * 100;
                var punctualityScore = (present + late) > 0 ? (double)present / (present + late) * 100 : 0;

                var payroll = payrolls.FirstOrDefault(p => p.EmployeeId == e.Id);
                var bonusScore = payroll != null ? (double)(payroll.PerformanceBonus + payroll.AttendanceBonus) / maxBonus * 100 : 0;

                var empLeave = leaves.FirstOrDefault(l => l.EmployeeId == e.Id);
                var leaveScore = empLeave != null ? Math.Max(0, (1 - (double)empLeave.TotalDays / (maxLeaveDays * 2)) * 100) : 100;

                // Weights: attendance 30%, performance bonus 30%, punctuality 20%, leave 20%
                var composite = attendanceScore * 0.3 + bonusScore * 0.3 + punctualityScore * 0.2 + leaveScore * 0.2;

                return new
                {
                    e.Id, e.FullName, e.Department, e.Position,
                    AttendanceScore = Math.Round(attendanceScore, 1),
                    PerformanceScore = Math.Round(bonusScore, 1),
                    PunctualityScore = Math.Round(punctualityScore, 1),
                    LeaveScore = Math.Round(leaveScore, 1),
                    CompositeScore = Math.Round(composite, 1)
                };
            })
            .OrderByDescending(x => x.CompositeScore)
            .Take(top)
            .Select((x, i) => new { Rank = i + 1, x.Id, x.FullName, x.Department, x.Position, x.AttendanceScore, x.PerformanceScore, x.PunctualityScore, x.LeaveScore, x.CompositeScore })
            .ToList();

            return Results.Ok(ranked);
        });
    }
}
