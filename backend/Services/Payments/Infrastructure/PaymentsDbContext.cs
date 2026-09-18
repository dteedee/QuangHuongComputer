using Microsoft.EntityFrameworkCore;
using Payments.Domain;
using BuildingBlocks.Database;

namespace Payments.Infrastructure;

public class PaymentsDbContext : DbContext
{
    public PaymentsDbContext(DbContextOptions<PaymentsDbContext> options) : base(options)
    {
    }

    public DbSet<PaymentIntent> PaymentIntents { get; set; }
    public DbSet<SePayTransaction> SePayTransactions { get; set; }
    public DbSet<PaymentConfig> PaymentConfigs { get; set; }
    public DbSet<ProcessedWebhook> ProcessedWebhooks { get; set; }
    public DbSet<PaymentRefund> PaymentRefunds { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema("payments");

        modelBuilder.Entity<PaymentIntent>(entity =>
        {
            entity.HasKey(e => e.Id);
            // W1-11: xmin - webhook nhà cung cấp và người dùng bấm "đã thanh toán" có thể
            // cập nhật cùng một PaymentIntent đồng thời; ghi đè lặng lẽ là mất tiền.
            entity.UseXminAsConcurrencyToken();
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Currency).HasMaxLength(3);
            entity.Property(e => e.IdempotencyKey).IsRequired().HasMaxLength(100);

            entity.HasIndex(e => e.IdempotencyKey).IsUnique();
            entity.HasIndex(e => e.OrderId);
            entity.HasIndex(e => e.ExternalId);
            entity.HasIndex(e => new { e.Status, e.CreatedAt })
                .HasDatabaseName("IX_PaymentIntents_Status_CreatedAt");

            // W2-4: mã thanh toán (nội dung chuyển khoản) là khoá đối soát — phải duy nhất và
            // tra được trong một index, vì mỗi webhook SePay đều tra theo nó.
            entity.Property(e => e.PaymentCode).HasMaxLength(20);
            entity.HasIndex(e => e.PaymentCode)
                .IsUnique()
                .HasDatabaseName("IX_PaymentIntents_PaymentCode")
                .HasFilter("\"PaymentCode\" IS NOT NULL");
            entity.Property(e => e.AmountRefunded).HasPrecision(18, 2);
            entity.Property(e => e.ReconciliationReference).HasMaxLength(100);

            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_PaymentIntents_Amount_NonNegative", "\"Amount\" >= 0");
                // Không bao giờ hoàn quá số đã thu: chặn ở CSDL, không chỉ ở code.
                t.HasCheckConstraint(
                    "CK_PaymentIntents_Refund_NotOverAmount",
                    "\"AmountRefunded\" >= 0 AND \"AmountRefunded\" <= \"Amount\"");
            });
        });

        // W2-4 (D04 mục 4) — phiếu hoàn tiền.
        modelBuilder.Entity<PaymentRefund>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.UseXminAsConcurrencyToken();
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Reason).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Reference).HasMaxLength(100);
            entity.Property(e => e.FailureReason).HasMaxLength(500);
            entity.Property(e => e.IdempotencyKey).IsRequired().HasMaxLength(100);

            entity.HasIndex(e => e.IdempotencyKey)
                .IsUnique()
                .HasDatabaseName("IX_PaymentRefunds_IdempotencyKey");
            entity.HasIndex(e => e.PaymentIntentId).HasDatabaseName("IX_PaymentRefunds_PaymentIntentId");
            entity.HasIndex(e => e.OrderId).HasDatabaseName("IX_PaymentRefunds_OrderId");
            entity.HasIndex(e => new { e.Status, e.RequestedAt })
                .HasDatabaseName("IX_PaymentRefunds_Status_RequestedAt");

            entity.ToTable(t => t.HasCheckConstraint(
                "CK_PaymentRefunds_Amount_Positive", "\"Amount\" > 0"));
        });

        // W1-11 / audit db-schema-migrations-23: TransferAmount + Accumulated còn thả nổi kiểu,
        // và RelatedOrderId là cột đối soát nóng nhưng chưa có index.
        modelBuilder.Entity<SePayTransaction>(entity =>
        {
            entity.Property(e => e.TransferAmount).HasPrecision(18, 2);
            entity.Property(e => e.Accumulated).HasPrecision(18, 2);
            entity.HasIndex(e => e.RelatedOrderId)
                .HasDatabaseName("IX_SePayTransactions_RelatedOrderId");
        });

        // Phase 04: ProcessedWebhooks — chống xử lý lặp theo (Provider, TransactionId).
        modelBuilder.Entity<ProcessedWebhook>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Provider).IsRequired().HasMaxLength(20);
            entity.Property(e => e.TransactionId).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Result).HasMaxLength(20);
            entity.HasIndex(e => new { e.Provider, e.TransactionId })
                .IsUnique()
                .HasDatabaseName("IX_ProcessedWebhooks_Provider_TxnId");
            entity.HasIndex(e => e.OrderId).HasDatabaseName("IX_ProcessedWebhooks_OrderId");
        });

        // W1-11 / audit db-schema-migrations-07: module này chưa gọi ConfigureCommonColumnProperties
        // nên model của Npgsql 8 đòi timestamptz cho mọi cột DateTime trong khi CSDL thật là
        // `timestamp without time zone`. Ghim lại đúng thực tế (chuyển đổi hàng loạt: backlog).
        PostgreSQLConfig.ConfigureCommonColumnProperties(modelBuilder);
    }
}
