using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using BuildingBlocks.Database;

namespace Sales.Infrastructure;

public class SalesDbContext : DbContext
{
    public SalesDbContext(DbContextOptions<SalesDbContext> options) : base(options)
    {
    }

    public DbSet<Cart> Carts { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<OrderHistory> OrderHistories { get; set; }
    public DbSet<ReturnRequest> ReturnRequests { get; set; }
    public DbSet<WishlistItem> WishlistItems { get; set; }
    public DbSet<LoyaltyAccount> LoyaltyAccounts { get; set; }
    public DbSet<LoyaltyTransaction> LoyaltyTransactions { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure PostgreSQL settings
        PostgreSQLConfig.ConfigurePostgreSQL(modelBuilder, "public");
        PostgreSQLConfig.ConfigureCommonColumnProperties(modelBuilder);

        // Soft delete filters
        modelBuilder.Entity<Order>().HasQueryFilter(o => o.IsActive);
        modelBuilder.Entity<Cart>().HasQueryFilter(c => c.IsActive);
        modelBuilder.Entity<OrderHistory>().HasQueryFilter(oh => oh.IsActive);
        modelBuilder.Entity<ReturnRequest>().HasQueryFilter(rr => rr.IsActive);
        modelBuilder.Entity<WishlistItem>().HasQueryFilter(w => w.IsActive);

        // Cart configuration
        modelBuilder.Entity<Cart>(entity =>
        {
            entity.ToTable("Carts");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.DiscountAmount).HasPrecision(18, 2);
            entity.Property(c => c.ShippingAmount).HasPrecision(18, 2);
            entity.Property(c => c.TaxRate).HasPrecision(5, 4); // e.g., 0.1000 for 10%
            entity.OwnsMany(c => c.Items, item =>
            {
                item.ToTable("CartItem");
                item.Property(i => i.Price).HasPrecision(18, 2);
            });
        });

        // Order configuration
        modelBuilder.Entity<Order>(entity =>
        {
            entity.ToTable("Orders");
            entity.HasKey(o => o.Id);
            entity.HasIndex(o => o.OrderNumber).IsUnique();
            entity.Property(o => o.SubtotalAmount).HasPrecision(18, 2);
            entity.Property(o => o.TaxAmount).HasPrecision(18, 2);
            entity.Property(o => o.TotalAmount).HasPrecision(18, 2);
            entity.Property(o => o.DiscountAmount).HasPrecision(18, 2);
            entity.Property(o => o.ShippingAmount).HasPrecision(18, 2);
            
            // Indexes for common queries
            entity.HasIndex(o => new { o.CustomerId, o.OrderDate })
                .HasDatabaseName("ix_orders_customer_id_order_date");
                
            entity.HasIndex(o => new { o.Status, o.OrderDate })
                .HasDatabaseName("ix_orders_status_order_date");
                
            entity.HasIndex(o => o.TotalAmount)
                .HasDatabaseName("ix_orders_total_amount");
                
            entity.HasIndex(o => new { o.PaymentStatus, o.OrderDate })
                .HasDatabaseName("ix_orders_payment_status_order_date");
                
            entity.HasIndex(o => new { o.FulfillmentStatus, o.OrderDate })
                .HasDatabaseName("ix_orders_fulfillment_status_order_date");
            
            entity.OwnsMany(o => o.Items, item =>
            {
                item.ToTable("OrderItem");
                item.Property(i => i.UnitPrice).HasPrecision(18, 2);
                item.Property(i => i.OriginalPrice).HasPrecision(18, 2);
                item.Property(i => i.DiscountAmount).HasPrecision(18, 2);
                item.Property(i => i.LineTotal).HasPrecision(18, 2);
            });
        });

        // OrderHistory configuration
        modelBuilder.Entity<OrderHistory>(entity =>
        {
            entity.ToTable("OrderHistories"); // Changed to match likely DB default
            entity.HasKey(oh => oh.Id);
            entity.Property(oh => oh.ChangedAt).IsRequired();
            
            entity.HasOne<Order>()
                .WithMany()
                .HasForeignKey(oh => oh.OrderId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_order_histories_order_id");
            
            entity.HasIndex(oh => new { oh.OrderId, oh.ChangedAt })
                .HasDatabaseName("ix_order_histories_order_id_changed_at");
        });

        // ReturnRequest configuration
        modelBuilder.Entity<ReturnRequest>(entity =>
        {
            entity.ToTable("ReturnRequests"); // Changed to match likely DB default
            entity.HasKey(rr => rr.Id);
            entity.Property(rr => rr.RefundAmount).HasPrecision(18, 2);
            
            entity.HasOne<Order>()
                .WithMany()
                .HasForeignKey(rr => rr.OrderId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_return_requests_order_id");
            
            entity.HasIndex(rr => new { rr.OrderId, rr.Status })
                .HasDatabaseName("ix_return_requests_order_id_status");
                
            entity.HasIndex(rr => rr.Status)
                .HasDatabaseName("ix_return_requests_status");
        });

        // WishlistItem configuration
        modelBuilder.Entity<WishlistItem>(entity =>
        {
            entity.ToTable("WishlistItems");
            entity.HasKey(w => w.Id);
            entity.HasIndex(w => new { w.UserId, w.ProductId }).IsUnique()
                .HasDatabaseName("ix_wishlist_items_user_product");
            entity.HasIndex(w => w.UserId)
                .HasDatabaseName("ix_wishlist_items_user_id");
        });

        // LoyaltyAccount configuration
        modelBuilder.Entity<LoyaltyAccount>(entity =>
        {
            entity.ToTable("LoyaltyAccounts");
            entity.HasKey(l => l.Id);
            entity.HasIndex(l => l.UserId).IsUnique()
                .HasDatabaseName("ix_loyalty_accounts_user_id");
            entity.HasIndex(l => l.Tier)
                .HasDatabaseName("ix_loyalty_accounts_tier");
            entity.Ignore(l => l.Transactions);
        });

        // LoyaltyTransaction configuration
        modelBuilder.Entity<LoyaltyTransaction>(entity =>
        {
            entity.ToTable("LoyaltyTransactions");
            entity.HasKey(t => t.Id);
            entity.HasIndex(t => new { t.AccountId, t.CreatedAt })
                .HasDatabaseName("ix_loyalty_transactions_account_created");
            entity.HasIndex(t => t.OrderId)
                .HasDatabaseName("ix_loyalty_transactions_order_id");
            entity.HasIndex(t => t.Type)
                .HasDatabaseName("ix_loyalty_transactions_type");
        });
    }
}
