using Microsoft.EntityFrameworkCore;
using Repair.Domain;

namespace Repair.Infrastructure;

/// <summary>Mapping danh mục dịch vụ sửa chữa + khoá ngoại từ lịch hẹn / phiếu sửa.</summary>
internal static class RepairServiceTypeConfiguration
{
    public static void Configure(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<RepairServiceType>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Code).HasMaxLength(RepairServiceType.MaxCodeLength).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(RepairServiceType.MaxNameLength).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(RepairServiceType.MaxDescriptionLength);
            entity.Property(e => e.BasePrice).HasPrecision(18, 2);
            entity.Ignore(e => e.LegacyServiceType);

            entity.HasIndex(e => e.Code).IsUnique();
            entity.HasIndex(e => new { e.IsActive, e.SortOrder });

            entity.ToTable("RepairServiceTypes", t =>
            {
                t.HasCheckConstraint("CK_RepairServiceTypes_BasePrice_NonNegative", "\"BasePrice\" >= 0");
                t.HasCheckConstraint("CK_RepairServiceTypes_EstimatedMinutes_NonNegative", "\"EstimatedMinutes\" >= 0");
            });
        });

        // Không xoá dịch vụ đang được lịch hẹn/phiếu sửa tham chiếu — tắt (IsActive=false) thay vì xoá.
        modelBuilder.Entity<ServiceBooking>()
            .HasOne<RepairServiceType>()
            .WithMany()
            .HasForeignKey(b => b.ServiceTypeId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ServiceBooking>().HasIndex(b => b.ServiceTypeId);

        modelBuilder.Entity<WorkOrder>()
            .HasOne<RepairServiceType>()
            .WithMany()
            .HasForeignKey(w => w.ServiceTypeId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<WorkOrder>().HasIndex(w => w.ServiceTypeId);
    }
}
