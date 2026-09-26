using BuildingBlocks.Configuration;
using BuildingBlocks.Endpoints;
using Microsoft.EntityFrameworkCore;
using Repair.Domain;
using Repair.Infrastructure;

namespace Repair.Application.Bookings;

/// <summary>
/// Sức chứa mỗi khung giờ đặt lịch, cấu hình trong SystemConfig:
/// <c>Repair.BookingSlotCapacity.{Morning|Afternoon|Evening}</c> nếu có, không thì
/// <c>Repair.BookingSlotCapacity</c>, không thì <see cref="DefaultCapacity"/>. Giá trị ≤ 0 = không giới hạn.
/// Chỉ lịch Pending/Approved/Converted chiếm chỗ (<see cref="ServiceBooking.OccupiesSlot"/>).
/// </summary>
public static class BookingSlotCapacity
{
    public const string SettingKey = "Repair.BookingSlotCapacity";
    public const int DefaultCapacity = 5;

    public static int Resolve(IAppSettings settings, TimeSlot slot)
        => settings.GetInt($"{SettingKey}.{slot}", settings.GetInt(SettingKey, DefaultCapacity));

    public static bool IsUnlimited(int capacity) => capacity <= 0;

    public static bool HasRoom(int occupied, int capacity) => IsUnlimited(capacity) || occupied < capacity;

    public static int? Remaining(int occupied, int capacity) => IsUnlimited(capacity) ? null : Math.Max(0, capacity - occupied);

    public static IQueryable<ServiceBooking> Occupying(RepairDbContext db, DateOnly day, TimeSlot slot)
    {
        var from = DateTime.SpecifyKind(day.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var to = from.AddDays(1);
        return db.ServiceBookings.Where(b => b.PreferredDate >= from && b.PreferredDate < to
            && b.PreferredTimeSlot == slot
            && (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Approved || b.Status == BookingStatus.Converted));
    }

    /// <summary>Khoá cố vấn cho một cặp (ngày, khung): namespace 'REPR' + yyyyMMdd*10 + slot (vừa int4).</summary>
    public static (int Namespace, int Key) LockKey(DateOnly day, TimeSlot slot)
        => (0x52455052, (day.Year * 10000 + day.Month * 100 + day.Day) * 10 + (int)slot);

    /// <summary>
    /// Lưu lịch hẹn mới NẾU khung giờ còn chỗ — an toàn khi nhiều khách đặt cùng lúc: trong MỘT
    /// transaction, lấy <c>pg_advisory_xact_lock</c> theo (ngày, khung) rồi mới đếm và INSERT, nên hai
    /// request cho cùng khung xếp hàng ở khoá, request sau đếm thấy dòng của request trước. Khoá tự
    /// nhả khi commit/rollback. Chạy trong execution strategy vì DbContext bật EnableRetryOnFailure.
    /// </summary>
    public static Task SaveIfRoomAsync(RepairDbContext db, ServiceBooking booking, int capacity, CancellationToken ct)
    {
        var strategy = db.Database.CreateExecutionStrategy();
        return strategy.ExecuteAsync(async () =>
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            var (ns, key) = LockKey(booking.PreferredDay, booking.PreferredTimeSlot);
            await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock({ns}, {key})", ct);

            if (!IsUnlimited(capacity))
            {
                var occupied = await Occupying(db, booking.PreferredDay, booking.PreferredTimeSlot).CountAsync(ct);
                if (!HasRoom(occupied, capacity))
                    throw new ConflictException("Khung giờ này đã kín lịch. Vui lòng chọn khung giờ hoặc ngày khác.");
            }

            db.ServiceBookings.Add(booking);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        });
    }
}
