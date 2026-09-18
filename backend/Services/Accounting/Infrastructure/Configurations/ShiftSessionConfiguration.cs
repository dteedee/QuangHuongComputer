using Accounting.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Accounting.Infrastructure.Configurations;

/// <summary>Ca thu ngân và các giao dịch tiền mặt trong ca.</summary>
public class ShiftSessionConfiguration : IEntityTypeConfiguration<ShiftSession>
{
    public void Configure(EntityTypeBuilder<ShiftSession> entity)
    {
        entity.HasKey(e => e.Id);
        entity.Property(e => e.OpeningBalance).HasPrecision(18, 2);
        entity.Property(e => e.ClosingBalance).HasPrecision(18, 2);
        // W2-14: số LẼ RA phải có và chênh lệch được CHỐT LẠI khi đóng ca. Tính lại lúc đọc
        // là sai: giao dịch phát sinh sau đó sẽ làm đổi ngược con số đã ký biên bản.
        entity.Property(e => e.ExpectedCash).HasPrecision(18, 2);
        entity.Property(e => e.Variance).HasPrecision(18, 2);
        entity.Property(e => e.VarianceReason).HasMaxLength(500);

        entity.OwnsMany(e => e.Transactions, transaction =>
        {
            transaction.WithOwner().HasForeignKey("ShiftSessionId");
            transaction.HasKey(t => t.Id);
            transaction.Property(t => t.Id).ValueGeneratedNever();
            transaction.Property(t => t.Amount).HasPrecision(18, 2);
        });

        entity.HasIndex(e => new { e.CashierId, e.WarehouseId, e.OpenedAt, e.Status })
            .HasDatabaseName("IX_ShiftSession_UniqueOpenShift");

        // W2-14 verify: "một thu ngân một ca mở" trước đây CHỈ là kiểm tra tầng ứng dụng — hai lần
        // bấm "Mở ca" đồng thời đều qua. Index trên (tên có chữ Unique) thực ra không unique.
        // 0 = ShiftStatus.Open.
        entity.HasIndex(e => e.CashierId)
            .IsUnique()
            .HasFilter("\"Status\" = 0")
            .HasDatabaseName("IX_ShiftSessions_Cashier_Open_Unique");

        entity.ToTable(t =>
        {
            t.HasCheckConstraint("CK_ShiftSessions_OpeningBalance_NonNegative", "\"OpeningBalance\" >= 0");
            t.HasCheckConstraint(
                "CK_ShiftSessions_ClosingBalance_NonNegative",
                "\"ClosingBalance\" IS NULL OR \"ClosingBalance\" >= 0");
        });
    }
}
