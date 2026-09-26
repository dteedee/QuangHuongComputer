using FluentAssertions;
using HR.Application.Commission;
using HR.Domain;
using Microsoft.EntityFrameworkCore;
using Xunit;
using static UnitTests.Domain.HR.Commission.CommissionTestData;

namespace UnitTests.Domain.HR.Commission;

/// <summary>Ghi nhận / idempotent / huỷ / thu hồi hoa hồng từ phiếu sửa đã thu tiền.</summary>
public class CommissionAccrualServiceTests
{
    private readonly FakeRepairCommissionSourceQuery _repair = new();

    [Fact]
    public async Task Phieu_da_thanh_toan_sinh_mot_khoan_cho_duyet_theo_muc_rieng()
    {
        using var db = NewDb();
        var userId = Guid.NewGuid();
        var employee = Technician(db, userId);
        Policy(db, employee.Id, 10m, 5_000m);
        var wo = _repair.Put(Paid(userId, labor: 400_000m, serviceFee: 100_000m));

        var outcome = await Service(db, _repair).ReconcileWorkOrderAsync(wo.WorkOrderId);

        outcome.Should().Be(AccrualOutcome.Created);
        var entry = await db.CommissionEntries.SingleAsync();
        entry.EmployeeId.Should().Be(employee.Id);
        entry.SourceType.Should().Be(CommissionSourceTypes.RepairWorkOrder);
        entry.SourceReference.Should().Be(wo.TicketNumber);
        entry.BaseAmount.Should().Be(500_000m);
        entry.Amount.Should().Be(55_000m);
        entry.Period.Should().Be("2026-09");
        entry.Status.Should().Be(CommissionStatus.Pending);
    }

    [Fact]
    public async Task Ghi_nhan_lai_cung_phieu_la_no_op()
    {
        using var db = NewDb();
        var userId = Guid.NewGuid();
        Policy(db, Technician(db, userId).Id, 10m);
        var wo = _repair.Put(Paid(userId));
        var service = Service(db, _repair);

        await service.ReconcileWorkOrderAsync(wo.WorkOrderId);
        var second = await service.ReconcileWorkOrderAsync(wo.WorkOrderId);
        var sync = await service.SyncPeriodAsync("2026-09");

        second.Should().Be(AccrualOutcome.AlreadyRecorded);
        sync.AlreadyRecorded.Should().Be(1);
        sync.Created.Should().Be(0);
        (await db.CommissionEntries.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task Ky_thuat_vien_chua_gan_nhan_vien_duoc_bao_cao_khong_ghi_so()
    {
        using var db = NewDb();
        _repair.Put(Paid(Guid.NewGuid()));

        var sync = await Service(db, _repair).SyncPeriodAsync("2026-09");

        sync.Unmapped.Should().HaveCount(1);
        (await db.CommissionEntries.AnyAsync()).Should().BeFalse();
    }

    [Fact]
    public async Task Khong_co_muc_rieng_va_mac_dinh_bang_khong_thi_khong_sinh_khoan_0_dong()
    {
        using var db = NewDb();
        var userId = Guid.NewGuid();
        Technician(db, userId);
        var wo = _repair.Put(Paid(userId));

        (await Service(db, _repair).ReconcileWorkOrderAsync(wo.WorkOrderId)).Should().Be(AccrualOutcome.ZeroAmount);
        (await db.CommissionEntries.AnyAsync()).Should().BeFalse();
    }

    [Fact]
    public async Task Phieu_bi_huy_sau_thanh_toan_huy_khoan_chua_tra()
    {
        using var db = NewDb();
        var userId = Guid.NewGuid();
        Policy(db, Technician(db, userId).Id, 10m);
        var wo = _repair.Put(Paid(userId));
        var service = Service(db, _repair);
        await service.ReconcileWorkOrderAsync(wo.WorkOrderId);

        _repair.Put(Voided(wo));
        (await service.ReconcileWorkOrderAsync(wo.WorkOrderId)).Should().Be(AccrualOutcome.Reversed);

        var entry = await db.CommissionEntries.SingleAsync();
        entry.Status.Should().Be(CommissionStatus.Reversed);
        entry.ReversalReason.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Phieu_bi_huy_sau_khi_hoa_hong_da_tra_sinh_mot_but_toan_thu_hoi()
    {
        using var db = NewDb();
        var userId = Guid.NewGuid();
        Policy(db, Technician(db, userId).Id, 10m);
        var wo = _repair.Put(Paid(userId));
        var service = Service(db, _repair);
        await service.ReconcileWorkOrderAsync(wo.WorkOrderId);
        var original = await db.CommissionEntries.SingleAsync();
        original.Approve("hr", DateTime.UtcNow);
        original.LinkToPayroll(Guid.NewGuid());
        original.MarkPaid(DateTime.UtcNow);
        await db.SaveChangesAsync();

        _repair.Put(Voided(wo));
        (await service.ReconcileWorkOrderAsync(wo.WorkOrderId)).Should().Be(AccrualOutcome.ClawbackCreated);
        (await service.ReconcileWorkOrderAsync(wo.WorkOrderId)).Should().Be(AccrualOutcome.AlreadyRecorded);

        var clawback = await db.CommissionEntries.SingleAsync(e => e.SourceType == CommissionSourceTypes.RepairWorkOrderClawback);
        clawback.Amount.Should().Be(-original.Amount);
        clawback.Status.Should().Be(CommissionStatus.Pending);
        original.Status.Should().Be(CommissionStatus.Paid, "khoản đã trả không bị sửa, chỉ bù trừ bằng bút toán âm");
    }

    [Fact]
    public async Task Doi_soat_ky_chi_lay_phieu_thanh_toan_trong_ky_theo_gio_VN()
    {
        using var db = NewDb();
        var userId = Guid.NewGuid();
        Policy(db, Technician(db, userId).Id, 10m);
        _repair.Put(Paid(userId, paidAt: new DateTime(2026, 9, 30, 16, 0, 0, DateTimeKind.Utc)));  // 23:00 VN 30/9
        _repair.Put(Paid(userId, paidAt: new DateTime(2026, 9, 30, 18, 0, 0, DateTimeKind.Utc)));  // 01:00 VN 1/10

        var sync = await Service(db, _repair).SyncPeriodAsync("2026-09");

        sync.Scanned.Should().Be(1);
        sync.Created.Should().Be(1);
        (await db.CommissionEntries.SingleAsync()).Period.Should().Be("2026-09");
    }
}
