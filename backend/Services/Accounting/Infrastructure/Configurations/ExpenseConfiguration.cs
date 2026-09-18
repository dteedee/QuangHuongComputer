using Accounting.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Accounting.Infrastructure.Configurations;

/// <summary>Khoản chi.</summary>
public class ExpenseConfiguration : IEntityTypeConfiguration<Expense>
{
    public void Configure(EntityTypeBuilder<Expense> entity)
    {
        entity.HasKey(e => e.Id);
        // W1-11: xmin - duyệt/chi cùng lúc trên một khoản chi phải bị phát hiện.
        entity.UseXminAsConcurrencyToken();
        entity.Property(e => e.ExpenseNumber).HasMaxLength(50).IsRequired();
        entity.Property(e => e.Description).HasMaxLength(500).IsRequired();
        entity.Property(e => e.Amount).HasPrecision(18, 2);
        entity.Property(e => e.VatAmount).HasPrecision(18, 2);
        entity.Property(e => e.TotalAmount).HasPrecision(18, 2);
        entity.HasIndex(e => e.ExpenseNumber).IsUnique();
        entity.HasIndex(e => e.Status);
        entity.HasIndex(e => e.ExpenseDate);

        entity.HasOne(e => e.Category)
            .WithMany()
            .HasForeignKey(e => e.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasIndex(e => e.SupplierId).HasDatabaseName("IX_Expenses_SupplierId");
        entity.HasIndex(e => e.EmployeeId).HasDatabaseName("IX_Expenses_EmployeeId");
        entity.HasIndex(e => e.CategoryId).HasDatabaseName("IX_Expenses_CategoryId");

        entity.ToTable(t =>
        {
            t.HasCheckConstraint("CK_Expenses_Amount_NonNegative", "\"Amount\" >= 0");
            t.HasCheckConstraint("CK_Expenses_VatAmount_NonNegative", "\"VatAmount\" >= 0");
            t.HasCheckConstraint("CK_Expenses_TotalAmount_NonNegative", "\"TotalAmount\" >= 0");
        });
    }
}
