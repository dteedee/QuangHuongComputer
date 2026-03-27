using Microsoft.EntityFrameworkCore;
using Omnichannel.Domain;

namespace Omnichannel.Infrastructure;

public class OmnichannelDbContext : DbContext
{
    public OmnichannelDbContext(DbContextOptions<OmnichannelDbContext> options) : base(options) { }

    public DbSet<ChannelConnection> ChannelConnections { get; set; }
    public DbSet<ChannelProduct> ChannelProducts { get; set; }
    public DbSet<ChannelOrder> ChannelOrders { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Global query filters
        modelBuilder.Entity<ChannelConnection>().HasQueryFilter(c => c.IsActive);

        // ChannelConnection
        modelBuilder.Entity<ChannelConnection>(entity =>
        {
            entity.ToTable("ChannelConnections");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PlatformName).IsRequired().HasMaxLength(50);
            entity.Property(e => e.ShopId).IsRequired().HasMaxLength(100);
            
            entity.HasIndex(e => new { e.PlatformName, e.ShopId })
                .IsUnique()
                .HasDatabaseName("ix_channel_connections_platform_shop");
        });

        // ChannelProduct
        modelBuilder.Entity<ChannelProduct>(entity =>
        {
            entity.ToTable("ChannelProducts");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ExternalProductId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.ExternalSku).IsRequired().HasMaxLength(100);
            entity.Property(e => e.ExternalVariantId).HasMaxLength(100);
            entity.Property(e => e.OverridePrice).HasPrecision(18, 2);

            entity.HasIndex(e => new { e.ChannelConnectionId, e.ExternalProductId })
                .IsUnique()
                .HasDatabaseName("ix_channel_products_connection_ext_product");

            entity.HasIndex(e => e.InternalProductId)
                .HasDatabaseName("ix_channel_products_internal_product_id");
        });

        // ChannelOrder
        modelBuilder.Entity<ChannelOrder>(entity =>
        {
            entity.ToTable("ChannelOrders");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ExternalOrderId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.ExternalOrderStatus).IsRequired().HasMaxLength(50);
            entity.Property(e => e.RawOrderDataJson).HasColumnType("jsonb").IsRequired();

            entity.HasIndex(e => new { e.ChannelConnectionId, e.ExternalOrderId })
                .IsUnique()
                .HasDatabaseName("ix_channel_orders_connection_ext_order");
                
            entity.HasIndex(e => e.InternalOrderId)
                .HasDatabaseName("ix_channel_orders_internal_order_id");
        });
    }
}
