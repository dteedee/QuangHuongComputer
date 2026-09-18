using Microsoft.EntityFrameworkCore;
using Sales.Domain;

namespace Sales.Infrastructure.Data;

/// <summary>Cấu hình EF cho giỏ hàng, phiên checkout và sổ địa chỉ.</summary>
internal static class SalesCartModelConfiguration
{
    public static void Apply(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Cart>(entity =>
        {
            entity.ToTable("Carts");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.DiscountAmount).HasPrecision(18, 2);
            entity.Property(c => c.ShippingAmount).HasPrecision(18, 2);
            entity.Property(c => c.TaxRate).HasPrecision(5, 4);

            // Giỏ của khách vãng lai: khoá theo cookie thay vì theo tài khoản.
            entity.Property(c => c.AnonymousId).HasMaxLength(64);

            entity.HasIndex(c => c.CustomerId).HasDatabaseName("ix_carts_customer_id");
            // Một khách vãng lai chỉ có đúng một giỏ đang hoạt động.
            entity.HasIndex(c => c.AnonymousId).HasDatabaseName("ix_carts_anonymous_id");

            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Carts_DiscountAmount_NonNegative", "\"DiscountAmount\" >= 0");
                t.HasCheckConstraint("CK_Carts_ShippingAmount_NonNegative", "\"ShippingAmount\" >= 0");
                t.HasCheckConstraint("CK_Carts_TaxRate_Fraction", "\"TaxRate\" >= 0 AND \"TaxRate\" <= 1");
            });

            entity.OwnsMany(c => c.Items, item =>
            {
                item.ToTable("CartItem");
                item.Property(i => i.Price).HasPrecision(18, 2);
                item.HasIndex(i => i.ProductId).HasDatabaseName("ix_cart_item_product_id");
                item.Property(i => i.VariantId).HasColumnName("VariantId");
                item.Property(i => i.VariantName).HasColumnName("VariantName");
                item.Property(i => i.VariantSku).HasColumnName("VariantSku");
                item.Property(i => i.IsGift).HasColumnName("IsGift").HasDefaultValue(false);
                item.Property(i => i.AppliedPromotionCode).HasColumnName("AppliedPromotionCode").HasMaxLength(50);
                item.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_CartItem_Price_NonNegative", "\"Price\" >= 0");
                    t.HasCheckConstraint("CK_CartItem_Quantity_Positive", "\"Quantity\" > 0");
                });
            });
        });

        modelBuilder.Entity<CheckoutSession>(entity =>
        {
            entity.ToTable("CheckoutSessions");
            entity.HasKey(cs => cs.Id);
            entity.Property(cs => cs.CartId).IsRequired();
            entity.Property(cs => cs.Status).HasConversion<int>();
            entity.HasIndex(cs => cs.CartId).HasDatabaseName("ix_checkout_sessions_cart_id");
            entity.HasIndex(cs => new { cs.Status, cs.ExpiresAt }).HasDatabaseName("ix_checkout_sessions_status_expires");
            // Reservation IDs — lưu JSON để không phải join sang InventoryDb.
            entity.Property<string>("ReservationIdsJson").HasColumnName("ReservationIdsJson").HasColumnType("text");
            entity.Ignore(cs => cs.ReservationIds);
            entity.HasQueryFilter(cs => cs.IsActive);
        });

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
            entity.HasIndex(a => new { a.UserId, a.IsDefault }).HasDatabaseName("ix_customer_addresses_user_default");
            entity.HasQueryFilter(a => a.IsActive);
        });
    }
}
