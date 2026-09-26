using Microsoft.EntityFrameworkCore;
using Repair.Domain;

namespace Repair.Infrastructure;

/// <summary>Mapping bảng <c>RepairQuoteLines</c> — tách riêng để RepairDbContext không phình thêm.</summary>
internal static class RepairQuoteLineConfiguration
{
    public static void Configure(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<RepairQuoteLine>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Description).HasMaxLength(RepairQuoteCalculator.MaxDescriptionLength).IsRequired();
            entity.Property(e => e.Quantity).HasPrecision(18, 2);
            entity.Property(e => e.UnitPrice).HasPrecision(18, 2);
            entity.Property(e => e.LineDiscount).HasPrecision(18, 2);
            entity.Property(e => e.GrossAmount).HasPrecision(18, 2);
            entity.Property(e => e.AllocatedDiscount).HasPrecision(18, 2);
            entity.Property(e => e.LineTotal).HasPrecision(18, 2);
            entity.Property(e => e.VatRate).HasPrecision(5, 4);
            entity.Property(e => e.NetAmount).HasPrecision(18, 2);
            entity.Property(e => e.VatAmount).HasPrecision(18, 2);

            entity.HasIndex(e => new { e.QuoteId, e.Sequence }).IsUnique();

            entity.ToTable("RepairQuoteLines", t =>
            {
                t.HasCheckConstraint("CK_RepairQuoteLines_Quantity_Positive", "\"Quantity\" > 0");
                t.HasCheckConstraint("CK_RepairQuoteLines_UnitPrice_NonNegative", "\"UnitPrice\" >= 0");
                t.HasCheckConstraint("CK_RepairQuoteLines_LineDiscount_NonNegative", "\"LineDiscount\" >= 0");
                t.HasCheckConstraint("CK_RepairQuoteLines_LineTotal_NonNegative", "\"LineTotal\" >= 0");
            });
        });
    }
}
