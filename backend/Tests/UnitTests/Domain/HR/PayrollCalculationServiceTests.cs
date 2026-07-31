using BuildingBlocks.TaxEngine;
using FluentAssertions;
using HR.Application.Payroll;
using HR.Domain;
using Xunit;

namespace UnitTests.Domain.HR;

/// <summary>
/// TEST TRỌNG TÂM PHASE 06 — đối chiếu 7 mốc thu nhập theo Luật Thuế TNCN VN.
/// PayrollCalculationService.ComputeCore dùng VietnameseTaxEngine (không tự tính thuế).
///
/// Kịch bản: Nhân viên đi làm ĐỦ CÔNG (ratio = 1), không có OT, không có phụ cấp.
/// InsurableSalary = BaseSalary (không vượt trần 46.8tr trừ khi bậc cuối).
/// So NetPay + InsuranceEmployee + PIT ≈ Gross (sai số làm tròn cho phép).
///
/// Bảng đối chiếu tay (theo TT 111/2013/TT-BTC, mức GT bản thân 11tr, phụ thuộc 4.4tr):
/// | Lương gross | Phụ thuộc | BHXH+BHYT+BHTN (10.5%) | Thu nhập tính thuế              | Thuế TNCN |
/// | 5.000.000   | 0         | 525.000                    | max(0, 5tr-525k-11tr) = 0       | 0         |
/// | 12.000.000  | 0         | 1.260.000                  | max(0, 12tr-1.26tr-11tr) = 0    | 0         |
/// | 20.000.000  | 0         | 2.100.000                  | 20-2.1-11 = 6.9tr → 5*5% + 1.9*10% = 250k+190k = 440.000 |
/// | 35.000.000  | 0         | 3.675.000                  | 35-3.675-11 = 20.325tr → bậc 4 (18-32tr 20%) |
/// | 60.000.000  | 0         | 4.914.000 (trần 46.8tr)    | 60-4.914-11 = 44.086 → bậc 5 (32-52tr 25%)   |
/// | 90.000.000  | 0         | 4.914.000                  | 90-4.914-11 = 74.086 → bậc 6 (52-80tr 30%)   |
/// | 150.000.000 | 0         | 4.914.000                  | 150-4.914-11 = 134.086 → bậc 7 (>80tr 35%)   |
/// </summary>
public class PayrollCalculationServiceTests
{
    // ============================================================
    // Helper — tạo MonthlyTimesheet + SalaryStructure đủ công
    // ============================================================

    private static MonthlyTimesheet FullMonthTimesheet(Guid empId, int year = 2026, int month = 6, decimal standardDays = 22m)
    {
        var ts = new MonthlyTimesheet(empId, year, month);
        ts.SetAttendanceAggregation(
            standardWorkDays: standardDays,
            actualWorkDays: standardDays,   // đi làm đủ
            absentDays: 0, halfDays: 0,
            totalLateMinutes: 0, totalEarlyLeaveMinutes: 0);
        ts.SetOvertimeBreakdown(0, 0, 0, 0);
        ts.SetLeaveDays(0, 0);
        ts.Lock(Guid.NewGuid());
        return ts;
    }

    private static SalaryStructure Salary(Guid empId, decimal baseSalary, decimal? insurable = null)
        => new(empId, baseSalary, insurable ?? baseSalary, new DateTime(2026, 1, 1));

    // ============================================================
    // 7 MỐC THU NHẬP — Table-driven test
    // ============================================================

    public static IEnumerable<object[]> TaxTiers()
    {
        // gross, dependents, expectedPit (đối chiếu tay, làm tròn 0đ)
        yield return new object[] { 5_000_000m, 0, 0m };
        yield return new object[] { 12_000_000m, 0, 0m };
        yield return new object[] { 20_000_000m, 0, 440_000m };
        yield return new object[] { 35_000_000m, 0, ExpectedPit35Tr };
        yield return new object[] { 60_000_000m, 0, ExpectedPit60Tr };
        yield return new object[] { 90_000_000m, 0, ExpectedPit90Tr };
        yield return new object[] { 150_000_000m, 0, ExpectedPit150Tr };
        // Cận biên có phụ thuộc
        yield return new object[] { 25_000_000m, 1, ExpectedPit25TrWith1Dep };
    }

    // ---- Đối chiếu TAY chi tiết ----
    // 35tr: TN tính thuế = 35 - 3.675 - 11 = 20.325tr
    //   Bậc 1: 5 × 5% = 250.000
    //   Bậc 2: 5 × 10% = 500.000
    //   Bậc 3: 8 × 15% = 1.200.000
    //   Bậc 4: 2.325 × 20% = 465.000
    //   ⇒ 2.415.000
    private const decimal ExpectedPit35Tr = 2_415_000m;

    // 60tr:
    //   BHXH: 46.8tr × 8% = 3.744.000 (trần 46.8tr)
    //   BHYT: 46.8tr × 1.5% = 702.000  (trần 46.8tr)
    //   BHTN: 60tr × 1% = 600.000 (chưa vượt trần 20×min vùng = 99.2tr)
    //   Tổng BHXH+BHYT+BHTN NLĐ: 5.046.000
    //   TN trước thuế = 60tr - 5.046tr = 54.954tr
    //   TN tính thuế = 54.954 - 11 = 43.954tr
    //   Bậc 1: 5*5% = 250.000
    //   Bậc 2: 5*10% = 500.000
    //   Bậc 3: 8*15% = 1.200.000
    //   Bậc 4: 14*20% = 2.800.000
    //   Bậc 5: 11.954*25% = 2.988.500
    //   ⇒ 7.738.500
    private const decimal ExpectedPit60Tr = 7_738_500m;

    // 90tr:
    //   Insurance: 3.744 + 702 + 900 (BHTN 90tr×1%) = 5.346.000
    //   TN tính thuế = 90 - 5.346 - 11 = 73.654tr
    //   Bậc 1..5: 250+500+1200+2800+5000 = 9.750
    //   Bậc 6: (73.654-52)*30% = 21.654*30% = 6.496.200
    //   ⇒ 16.246.200
    private const decimal ExpectedPit90Tr = 16_246_200m;

    // 150tr:
    //   Insurance: 3.744 + 702 + 992 (BHTN trần 99.2tr×1%) = 5.438.000
    //   TN tính thuế = 150 - 5.438 - 11 = 133.562tr
    //   Bậc 1..5: 9.750, Bậc 6: 28*30% = 8.400
    //   Bậc 7: (133.562-80)*35% = 53.562*35% = 18.746.700
    //   ⇒ 36.896.700
    private const decimal ExpectedPit150Tr = 36_896_700m;

    // 25tr + 1 phụ thuộc: BHXH = 2.625.000. TN tính thuế = 25 - 2.625 - 11 - 4.4 = 6.975tr
    //   Bậc 1: 5*5% = 250.000
    //   Bậc 2: 1.975*10% = 197.500
    //   ⇒ 447.500
    private const decimal ExpectedPit25TrWith1Dep = 447_500m;

    [Theory]
    [MemberData(nameof(TaxTiers))]
    public void ComputeCore_MocThuNhap_PitKhopBangTinhTay(decimal gross, int dependents, decimal expectedPit)
    {
        var empId = Guid.NewGuid();
        var ts = FullMonthTimesheet(empId);
        var salary = Salary(empId, gross);

        var result = PayrollCalculationService.ComputeCore(ts, salary, Array.Empty<Allowance>(), dependents);

        result.Pit.Should().Be(expectedPit, $"tại mức lương {gross:N0}, {dependents} phụ thuộc");
    }

    // ============================================================
    // Insurance cap 46.8tr
    // ============================================================
    [Fact]
    public void ComputeCore_Luong60Tr_BHXHTinhTrenTran46_8Tr_KhongPhai60Tr()
    {
        var empId = Guid.NewGuid();
        var ts = FullMonthTimesheet(empId);
        var salary = Salary(empId, 60_000_000m);

        var res = PayrollCalculationService.ComputeCore(ts, salary, Array.Empty<Allowance>(), 0);

        // BHXH + BHYT tính trên trần 46.8tr (không phải 60tr), BHTN vẫn tính trên 60tr
        // 46.8tr × (8% + 1.5%) + 60tr × 1% = 3.744 + 702 + 600 = 5.046tr
        res.InsuranceEmployee.Should().BeInRange(5_000_000m, 5_100_000m);
    }

    // ============================================================
    // Ngày công không đủ → prorate
    // ============================================================
    [Fact]
    public void ComputeCore_LamNuaThang_LuongCoBanChiaDoi()
    {
        var empId = Guid.NewGuid();
        var ts = new MonthlyTimesheet(empId, 2026, 6);
        ts.SetAttendanceAggregation(standardWorkDays: 22, actualWorkDays: 11,
            absentDays: 11, halfDays: 0, totalLateMinutes: 0, totalEarlyLeaveMinutes: 0);
        ts.SetOvertimeBreakdown(0, 0, 0, 0);
        ts.SetLeaveDays(0, 0);
        ts.Lock(Guid.NewGuid());
        var salary = Salary(empId, 20_000_000m);

        var res = PayrollCalculationService.ComputeCore(ts, salary, Array.Empty<Allowance>(), 0);

        res.BaseSalaryProrated.Should().Be(10_000_000m);  // 20tr × 11/22
    }

    // ============================================================
    // OT hệ số 150/200/300% + đêm +30%
    // ============================================================
    [Fact]
    public void ComputeCore_OtChuNhat_HeSo200PhanTram()
    {
        var empId = Guid.NewGuid();
        var ts = new MonthlyTimesheet(empId, 2026, 6);
        ts.SetAttendanceAggregation(22, 22, 0, 0, 0, 0);
        ts.SetOvertimeBreakdown(weekday: 0, sunday: 2, holiday: 0, night: 0);
        ts.SetLeaveDays(0, 0);
        ts.Lock(Guid.NewGuid());
        // Lương 20tr / 176h = 113.636/h; OT CN 2h × 113.636 × 2.0 ≈ 454.545
        var salary = Salary(empId, 20_000_000m);

        var res = PayrollCalculationService.ComputeCore(ts, salary, Array.Empty<Allowance>(), 0);

        // HourlyRate làm tròn: 20tr / (22*8) = 113.636 → round 113.636
        // OT CN 2h × 113.636 × 2.0 = 454.545 → round
        res.OvertimePay.Should().BeInRange(450_000m, 460_000m);
    }

    [Fact]
    public void ComputeCore_OtNgayLe_HeSo300PhanTram()
    {
        var empId = Guid.NewGuid();
        var ts = new MonthlyTimesheet(empId, 2026, 6);
        ts.SetAttendanceAggregation(22, 22, 0, 0, 0, 0);
        ts.SetOvertimeBreakdown(weekday: 0, sunday: 0, holiday: 2, night: 0);
        ts.SetLeaveDays(0, 0);
        ts.Lock(Guid.NewGuid());
        var salary = Salary(empId, 20_000_000m);

        var res = PayrollCalculationService.ComputeCore(ts, salary, Array.Empty<Allowance>(), 0);

        // OT lễ 2h × 113.636 × 3.0 ≈ 681.818
        res.OvertimePay.Should().BeInRange(675_000m, 685_000m);
    }

    // ============================================================
    // NetPay = 0 khi không hợp lệ, không âm
    // ============================================================
    [Fact]
    public void ComputeCore_LuongThapPhatCao_NetPayBangKhongKhongAm()
    {
        var empId = Guid.NewGuid();
        var ts = new MonthlyTimesheet(empId, 2026, 6);
        ts.SetAttendanceAggregation(22, 22, 0, 0, totalLateMinutes: 20_000, totalEarlyLeaveMinutes: 0);
        ts.SetOvertimeBreakdown(0, 0, 0, 0);
        ts.SetLeaveDays(0, 0);
        ts.Lock(Guid.NewGuid());
        var salary = Salary(empId, 5_000_000m);

        // Late fine 20k * 1000 = 20tr phạt, vượt lương
        var res = PayrollCalculationService.ComputeCore(ts, salary, Array.Empty<Allowance>(), 0, lateFinePerMinute: 1000m);

        res.NetPay.Should().Be(0);
    }

    // ============================================================
    // Gross ↔ Net bisection
    // ============================================================
    [Fact]
    public void CalculateGrossFromNet_15TrNet_KhongPhuThuoc_TraGrossHopLy()
    {
        var targetNet = 15_000_000m;

        var gross = PayrollCalculationService.CalculateGrossFromNet(targetNet, numberOfDependents: 0);

        var back = VietnameseTaxEngine.CalculatePayroll(gross, 0);
        back.NetSalary.Should().BeInRange(targetNet - 5000m, targetNet + 5000m);
    }

    [Fact]
    public void CalculateGrossFromNet_NetZero_TraVeZero()
    {
        var g = PayrollCalculationService.CalculateGrossFromNet(0);
        g.Should().Be(0);
    }
}
