using Accounting.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Accounting.Infrastructure.Configurations;

/// <summary>Phiếu thu / phiếu chi của sổ quỹ.</summary>
public class CashVoucherConfiguration : IEntityTypeConfiguration<CashVoucher>
{
    public void Configure(EntityTypeBuilder<CashVoucher> entity)
    {
        entity.HasKey(e => e.Id);
        entity.UseXminAsConcurrencyToken();
        entity.Property(e => e.VoucherNumber).HasMaxLength(60).IsRequired();
        entity.Property(e => e.FundCode).HasMaxLength(50).IsRequired();
        entity.Property(e => e.Description).HasMaxLength(500).IsRequired();
        entity.Property(e => e.CounterpartyName).HasMaxLength(255);
        entity.Property(e => e.SourceKey).HasMaxLength(120);
        entity.Property(e => e.Amount).HasPrecision(18, 2);

        entity.HasIndex(e => e.VoucherNumber).IsUnique()
            .HasDatabaseName("IX_CashVouchers_Number_Unique");
        entity.HasIndex(e => e.SourceKey).IsUnique()
            .HasFilter("\"SourceKey\" IS NOT NULL")
            .HasDatabaseName("IX_CashVouchers_SourceKey_Unique");
        // Sổ quỹ luôn đọc theo (quỹ, ngày) để cộng dồn số dư — index này là đường đi của nó.
        entity.HasIndex(e => new { e.FundCode, e.VoucherDate })
            .HasDatabaseName("IX_CashVouchers_Fund_Date");
        entity.HasIndex(e => e.ShiftSessionId).HasDatabaseName("IX_CashVouchers_ShiftSessionId");

        entity.ToTable(t =>
            t.HasCheckConstraint("CK_CashVouchers_Amount_Positive", "\"Amount\" > 0"));
    }
}
