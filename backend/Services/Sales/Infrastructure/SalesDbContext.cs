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
    // Phase 07: chính sách đổi trả cấu hình được.
    public DbSet<ReturnPolicy> ReturnPolicies { get; set; }
    public DbSet<WishlistItem> WishlistItems { get; set; }
    public DbSet<LoyaltyAccount> LoyaltyAccounts { get; set; }
    public DbSet<LoyaltyTransaction> LoyaltyTransactions { get; set; }
    public DbSet<CustomerAddress> CustomerAddresses { get; set; }
    public DbSet<CheckoutSession> CheckoutSessions { get; set; }
    public DbSet<InstallmentApplication> InstallmentApplications { get; set; }

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
                // Biến thể sản phẩm — nullable, snapshot lịch sử.
                item.Property(i => i.VariantId).HasColumnName("VariantId");
                item.Property(i => i.VariantName).HasColumnName("VariantName");
                item.Property(i => i.VariantSku).HasColumnName("VariantSku");
                // Phase 04: gift flag + promotion snapshot.
                item.Property(i => i.IsGift).HasColumnName("IsGift").HasDefaultValue(false);
                item.Property(i => i.AppliedPromotionCode).HasColumnName("AppliedPromotionCode").HasMaxLength(50);
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
            // Phase 04: freeship discount + snapshot promotions đã áp.
            entity.Property(o => o.ShippingDiscount).HasPrecision(18, 2).HasDefaultValue(0m);
            entity.Property(o => o.AppliedPromotionsJson).HasColumnType("text");
            // JSON extensibility — freeform key/value attributes, default '{}'
            entity.Property(o => o.Attributes).HasColumnType("jsonb").HasDefaultValueSql("'{}'::jsonb");
            // Snapshot tên/email/sđt khách hàng lúc đặt hàng — admin order list cần hiển thị tên thay vì Guid.
            entity.Property(o => o.CustomerName).HasMaxLength(200);
            entity.Property(o => o.CustomerEmail).HasMaxLength(200);
            entity.Property(o => o.CustomerPhone).HasMaxLength(30);
            
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
                // Biến thể sản phẩm — nullable, snapshot lịch sử đơn hàng.
                item.Property(i => i.VariantId).HasColumnName("VariantId");
                item.Property(i => i.VariantName).HasColumnName("VariantName");
                item.Property(i => i.VariantSku).HasColumnName("VariantSku");
                // Phase 04: gift flag + promotion snapshot.
                item.Property(i => i.IsGift).HasColumnName("IsGift").HasDefaultValue(false);
                item.Property(i => i.AppliedPromotionCode).HasColumnName("AppliedPromotionCode").HasMaxLength(50);
            });
        });

        // Phase 04: CheckoutSession — phiên giữ chỗ 15 phút.
        modelBuilder.Entity<CheckoutSession>(entity =>
        {
            entity.ToTable("CheckoutSessions");
            entity.HasKey(cs => cs.Id);
            entity.Property(cs => cs.CartId).IsRequired();
            entity.Property(cs => cs.Status).HasConversion<int>();
            entity.HasIndex(cs => cs.CartId).HasDatabaseName("ix_checkout_sessions_cart_id");
            entity.HasIndex(cs => new { cs.Status, cs.ExpiresAt })
                .HasDatabaseName("ix_checkout_sessions_status_expires");
            // Reservation IDs — lưu JSON để không phải join sang InventoryDb.
            entity.Property<string>("ReservationIdsJson")
                .HasColumnName("ReservationIdsJson")
                .HasColumnType("text");
            entity.Ignore(cs => cs.ReservationIds);
            entity.HasQueryFilter(cs => cs.IsActive);
        });

        // Phase 04: InstallmentApplication — hồ sơ trả góp.
        modelBuilder.Entity<InstallmentApplication>(entity =>
        {
            entity.ToTable("InstallmentApplications");
            entity.HasKey(i => i.Id);
            entity.Property(i => i.OrderId).IsRequired();
            entity.Property(i => i.Provider).IsRequired().HasMaxLength(50);
            entity.Property(i => i.DownPayment).HasPrecision(18, 2);
            entity.Property(i => i.MonthlyAmount).HasPrecision(18, 2);
            entity.Property(i => i.TotalAmount).HasPrecision(18, 2);
            entity.Property(i => i.Status).HasConversion<int>();
            entity.Property(i => i.DocumentUrls).HasColumnType("text");
            entity.Property(i => i.RejectionReason).HasMaxLength(500);
            entity.HasIndex(i => i.OrderId).HasDatabaseName("ix_installment_applications_order_id");
            entity.HasIndex(i => i.Status).HasDatabaseName("ix_installment_applications_status");
            entity.HasQueryFilter(i => i.IsActive);
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
            entity.ToTable("ReturnRequests");
            entity.HasKey(rr => rr.Id);
            entity.Property(rr => rr.RefundAmount).HasPrecision(18, 2);
            // Phase 07: 3 luồng + kiểm hàng + ảnh + chênh lệch giá.
            entity.Property(rr => rr.Type).HasConversion<int>();
            entity.Property(rr => rr.ReceivedCondition).HasConversion<int?>();
            entity.Property(rr => rr.PriceDifference).HasPrecision(18, 2);
            entity.Property(rr => rr.AttachmentUrls).HasColumnType("text");
            entity.Property(rr => rr.InspectionNotes).HasColumnType("text");

            entity.HasOne<Order>()
                .WithMany()
                .HasForeignKey(rr => rr.OrderId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_return_requests_order_id");

            entity.HasIndex(rr => new { rr.OrderId, rr.Status })
                .HasDatabaseName("ix_return_requests_order_id_status");

            entity.HasIndex(rr => rr.Status)
                .HasDatabaseName("ix_return_requests_status");
            entity.HasIndex(rr => rr.Type)
                .HasDatabaseName("ix_return_requests_type");
        });

        // Phase 07: ReturnPolicy — cấu hình đổi trả theo Category.
        modelBuilder.Entity<ReturnPolicy>(entity =>
        {
            entity.ToTable("ReturnPolicies");
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Name).IsRequired().HasMaxLength(200);
            entity.Property(p => p.RestockingFeePercent).HasPrecision(5, 2);
            entity.HasIndex(p => p.CategoryId).HasDatabaseName("ix_return_policies_category_id");
            entity.HasQueryFilter(p => p.IsActive);
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

        // CustomerAddress configuration
        modelBuilder.Entity<CustomerAddress>(entity =>
        {
            entity.ToTable("CustomerAddresses");
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Label).HasMaxLength(50);
            entity.Property(a => a.FullName).IsRequired().HasMaxLength(100);
            entity.Property(a => a.Phone).IsRequired().HasMaxLength(20);
            entity.Property(a => a.Province).IsRequired().HasMaxLength(100);
            entity.Property(a => a.District).IsRequired().HasMaxLength(100);
            entity.Property(a => a.Ward).IsRequired().HasMaxLength(100);
            entity.Property(a => a.StreetAddress).IsRequired().HasMaxLength(300);
            entity.HasIndex(a => new { a.UserId, a.IsDefault })
                .HasDatabaseName("ix_customer_addresses_user_default");
            entity.HasQueryFilter(a => a.IsActive);
        });
    }
}
