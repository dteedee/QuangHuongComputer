using Microsoft.EntityFrameworkCore;
using Payments.Domain;

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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema("payments");

        modelBuilder.Entity<PaymentIntent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Currency).HasMaxLength(3);
            entity.Property(e => e.IdempotencyKey).IsRequired().HasMaxLength(100);

            entity.HasIndex(e => e.IdempotencyKey).IsUnique();
            entity.HasIndex(e => e.OrderId);
            entity.HasIndex(e => e.ExternalId);
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
    }
}
