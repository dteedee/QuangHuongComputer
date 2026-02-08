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

        // Cart configuration
        modelBuilder.Entity<Cart>(entity =>
        {
            entity.ToTable("carts");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.DiscountAmount).HasPrecision(18, 2);
            entity.Property(c => c.ShippingAmount).HasPrecision(18, 2);
            entity.Property(c => c.TaxRate).HasPrecision(5, 4); // e.g., 0.1000 for 10%
            entity.OwnsMany(c => c.Items, item =>
            {
                item.Property(i => i.Price).HasPrecision(18, 2);
            });
        });

        // Order configuration
        modelBuilder.Entity<Order>(entity =>
        {
            entity.ToTable("orders");
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
                item.Property(i => i.UnitPrice).HasPrecision(18, 2);
                item.Property(i => i.OriginalPrice).HasPrecision(18, 2);
                item.Property(i => i.DiscountAmount).HasPrecision(18, 2);
                item.Property(i => i.LineTotal).HasPrecision(18, 2);
            });
        });

        // OrderHistory configuration
        modelBuilder.Entity<OrderHistory>(entity =>
        {
            entity.ToTable("order_histories");
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
            entity.ToTable("return_requests");
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
    }
}
