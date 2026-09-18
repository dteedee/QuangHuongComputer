using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure.Data;
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

    /// <summary>Dòng thu tiền (tender lines) — W2-10 POS và W2-23 vòng đời đơn là bên ghi.</summary>
    public DbSet<OrderPayment> OrderPayments { get; set; }

    /// <summary>Đơn tạm giữ ở quầy POS — W2-10 là bên ghi.</summary>
    public DbSet<HeldOrder> HeldOrders { get; set; }

    public DbSet<ReturnRequest> ReturnRequests { get; set; }
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

        PostgreSQLConfig.ConfigurePostgreSQL(modelBuilder, "public");
        PostgreSQLConfig.ConfigureCommonColumnProperties(modelBuilder);

        // Soft delete filters
        modelBuilder.Entity<Order>().HasQueryFilter(o => o.IsActive);
        modelBuilder.Entity<Cart>().HasQueryFilter(c => c.IsActive);
        modelBuilder.Entity<OrderHistory>().HasQueryFilter(oh => oh.IsActive);
        modelBuilder.Entity<ReturnRequest>().HasQueryFilter(rr => rr.IsActive);
        modelBuilder.Entity<WishlistItem>().HasQueryFilter(w => w.IsActive);

        SalesOrderModelConfiguration.Apply(modelBuilder);
        SalesCartModelConfiguration.Apply(modelBuilder);
        SalesAfterSalesModelConfiguration.Apply(modelBuilder);

        ApplySchemaReality(modelBuilder);
    }

    /// <summary>
    /// W1-11: đưa model về đúng thực tế của CSDL sau khi mọi entity đã được cấu hình.
    ///
    ///  1. 20 cột thời gian của Sales là `timestamptz` trong CSDL nhưng snapshot ghi
    ///     `timestamp without time zone` — migration 20260728073010_FixSalesSchemaAndIndexes
    ///     chỉ đổi kiểu trong Down(), không đổi trong Up(). Ghim lại đúng các cột đó.
    ///  2. ConfigurePostgreSQL() đặt MỌI khoá ngoại về Restrict, kể cả khoá ngoại sở hữu
    ///     (owned collection). Bản ghi con của owned type phải xoá theo cha.
    /// </summary>
    private static void ApplySchemaReality(ModelBuilder modelBuilder)
    {
        var timestamptzColumns = new Dictionary<string, string[]>
        {
            ["Carts"] = new[] { "CreatedAt", "UpdatedAt" },
            ["LoyaltyAccounts"] = new[] { "CreatedAt", "UpdatedAt", "LastActivityAt", "TierExpiresAt" },
            ["LoyaltyTransactions"] = new[] { "CreatedAt", "UpdatedAt" },
            ["OrderItem"] = new[] { "CreatedAt", "UpdatedAt" },
            ["OrderPayments"] = new[] { "CreatedAt", "UpdatedAt", "ReceivedAt" },
            ["HeldOrders"] = new[] { "CreatedAt", "UpdatedAt", "ResumedAt" },
            ["Orders"] = new[]
            {
                "CreatedAt", "UpdatedAt", "OrderDate", "ConfirmedAt", "PaidAt",
                "FulfilledAt", "ShippedAt", "DeliveredAt", "CompletedAt", "CancelledAt",
                "PaymentDueDate",
            },
        };

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            var table = entityType.GetTableName();
            if (table is not null && timestamptzColumns.TryGetValue(table, out var columns))
            {
                foreach (var property in entityType.GetProperties())
                {
                    if (columns.Contains(property.Name))
                    {
                        property.SetColumnType("timestamp with time zone");
                    }
                }
            }

            foreach (var foreignKey in entityType.GetForeignKeys())
            {
                if (foreignKey.IsOwnership)
                {
                    foreignKey.DeleteBehavior = DeleteBehavior.Cascade;
                }
            }
        }
    }
}
