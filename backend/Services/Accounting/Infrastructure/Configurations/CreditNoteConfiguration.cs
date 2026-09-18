using Accounting.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Accounting.Infrastructure.Configurations;

/// <summary>Giấy báo có / báo nợ.</summary>
public class CreditNoteConfiguration : IEntityTypeConfiguration<CreditNote>
{
    public void Configure(EntityTypeBuilder<CreditNote> entity)
    {
        entity.HasKey(e => e.Id);
        entity.UseXminAsConcurrencyToken();
        entity.Property(e => e.CreditNoteNumber).HasMaxLength(60).IsRequired();
        entity.Property(e => e.OriginalInvoiceNumber).HasMaxLength(60);
        entity.Property(e => e.SourceKey).HasMaxLength(120).IsRequired();
        entity.Property(e => e.Reason).HasMaxLength(1000);
        entity.Property(e => e.Amount).HasPrecision(18, 2);
        entity.Property(e => e.NetAmount).HasPrecision(18, 2);
        entity.Property(e => e.VatAmount).HasPrecision(18, 2);
        entity.Property(e => e.VatRate).HasPrecision(18, 2);

        entity.HasIndex(e => e.CreditNoteNumber).IsUnique()
            .HasDatabaseName("IX_CreditNotes_Number_Unique");
        // Chống trùng khi sự kiện huỷ đơn / hoàn tiền / trả hàng được phát lại.
        entity.HasIndex(e => e.SourceKey).IsUnique()
            .HasDatabaseName("IX_CreditNotes_SourceKey_Unique");
        entity.HasIndex(e => e.OriginalInvoiceId).HasDatabaseName("IX_CreditNotes_OriginalInvoiceId");
        entity.HasIndex(e => e.OrderId).HasDatabaseName("IX_CreditNotes_OrderId");

        entity.ToTable(t =>
        {
            t.HasCheckConstraint("CK_CreditNotes_Amount_Positive", "\"Amount\" > 0");
            t.HasCheckConstraint("CK_CreditNotes_VatAmount_NonNegative", "\"VatAmount\" >= 0");
            t.HasCheckConstraint("CK_CreditNotes_VatRate_Percent", "\"VatRate\" >= 0 AND \"VatRate\" <= 100");
        });
    }
}
