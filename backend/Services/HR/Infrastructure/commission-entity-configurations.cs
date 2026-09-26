using HR.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HR.Infrastructure;

/// <summary>Mapping hoa hồng kỹ thuật (tách khỏi HRDbContext cho file dưới 200 dòng).</summary>
public sealed class CommissionEntryConfiguration : IEntityTypeConfiguration<CommissionEntry>
{
    public void Configure(EntityTypeBuilder<CommissionEntry> entity)
    {
        entity.ToTable("CommissionEntries", t =>
        {
            t.HasCheckConstraint("CK_CommissionEntries_Period", "\"Period\" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'");
            // Chỉ bút toán thu hồi được âm; mọi khoản khác phải dương.
            t.HasCheckConstraint("CK_CommissionEntries_AmountSign",
                "(\"SourceType\" = 'RepairWorkOrderClawback' AND \"Amount\" < 0) OR (\"SourceType\" <> 'RepairWorkOrderClawback' AND \"Amount\" > 0)");
        });
        entity.HasKey(e => e.Id);
        entity.Property(e => e.SourceType).IsRequired().HasMaxLength(50);
        entity.Property(e => e.SourceReference).IsRequired().HasMaxLength(100);
        entity.Property(e => e.Period).IsRequired().HasMaxLength(7);
        entity.Property(e => e.BaseAmount).HasPrecision(18, 0);
        entity.Property(e => e.RatePercent).HasPrecision(5, 2);
        entity.Property(e => e.FixedAmount).HasPrecision(18, 0);
        entity.Property(e => e.Amount).HasPrecision(18, 0);
        entity.Property(e => e.ApprovedBy).HasMaxLength(200);
        entity.Property(e => e.ReversalReason).HasMaxLength(500);

        // Idempotent: một chứng từ nguồn chỉ sinh MỘT khoản (sự kiện trùng/đối soát lại là no-op).
        entity.HasIndex(e => new { e.SourceType, e.SourceId }).IsUnique()
            .HasDatabaseName("IX_CommissionEntries_Source_Unique");
        entity.HasIndex(e => new { e.Period, e.Status }).HasDatabaseName("IX_CommissionEntries_Period_Status");
        entity.HasIndex(e => new { e.EmployeeId, e.Status }).HasDatabaseName("IX_CommissionEntries_Employee_Status");
        entity.HasIndex(e => e.PayrollId).HasDatabaseName("IX_CommissionEntries_PayrollId");
    }
}

public sealed class CommissionPolicyConfiguration : IEntityTypeConfiguration<CommissionPolicy>
{
    public void Configure(EntityTypeBuilder<CommissionPolicy> entity)
    {
        entity.ToTable("CommissionPolicies", t =>
        {
            t.HasCheckConstraint("CK_CommissionPolicies_LaborPercent", "\"LaborPercent\" >= 0 AND \"LaborPercent\" <= 100");
            t.HasCheckConstraint("CK_CommissionPolicies_FixedAmount", "\"FixedAmountPerJob\" >= 0");
        });
        entity.HasKey(e => e.Id);
        entity.Property(e => e.LaborPercent).HasPrecision(5, 2);
        entity.Property(e => e.FixedAmountPerJob).HasPrecision(18, 0);
        entity.Property(e => e.Note).HasMaxLength(500);
        entity.HasIndex(e => new { e.EmployeeId, e.EffectiveFrom })
            .HasDatabaseName("IX_CommissionPolicies_Employee_EffectiveFrom");
    }
}
