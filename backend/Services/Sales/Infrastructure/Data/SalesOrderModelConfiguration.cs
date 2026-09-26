using Microsoft.EntityFrameworkCore;
using Sales.Domain;

namespace Sales.Infrastructure.Data;

/// <summary>
/// Cấu hình EF cho Orders + OrderItem + khối người mua (D07) + dòng thu tiền + đơn giữ ở quầy.
/// Tách khỏi <see cref="SalesDbContext"/> để mỗi file dưới 200 dòng.
/// </summary>
internal static class SalesOrderModelConfiguration
{
    public static void Apply(ModelBuilder modelBuilder)
    {
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
            entity.Property(o => o.ShippingFee).HasPrecision(18, 2);
            entity.Property(o => o.TaxRate).HasPrecision(5, 4);
            entity.Property(o => o.ShippingDiscount).HasPrecision(18, 2).HasDefaultValue(0m);
            entity.Property(o => o.AppliedPromotionsJson).HasColumnType("text");
            entity.Property(o => o.Attributes).HasColumnType("jsonb").HasDefaultValueSql("'{}'::jsonb");
            entity.Property(o => o.CustomerName).HasMaxLength(200);
            entity.Property(o => o.CustomerEmail).HasMaxLength(200);
            entity.Property(o => o.CustomerPhone).HasMaxLength(30);

            // D01 §4 — phí ship là một dòng thuế riêng.
            entity.Property(o => o.ShippingVatRate).HasPrecision(5, 4).HasDefaultValue(0m);
            entity.Property(o => o.ShippingVatAmount).HasPrecision(18, 2).HasDefaultValue(0m);
            // D01 §2 — ngày giao dịch giờ VN; hoá đơn resolve lại thuế suất theo ngày lập.
            entity.Property(o => o.BusinessDate).HasColumnType("date");

            // Kênh bán + ngữ cảnh quầy (W2-10 POS).
            entity.Property(o => o.Channel).HasMaxLength(20).HasDefaultValue(OrderChannels.Web);
            entity.Property(o => o.AnonymousId).HasMaxLength(64);
            // D08 — phiên bản điều khoản khách đã chấp nhận.
            entity.Property(o => o.TermsVersion).HasMaxLength(40);

            ConfigureBuyerInvoice(entity);
            ConfigureOrderItems(entity);

            entity.HasIndex(o => new { o.CustomerId, o.OrderDate }).HasDatabaseName("ix_orders_customer_id_order_date");
            entity.HasIndex(o => new { o.Status, o.OrderDate }).HasDatabaseName("ix_orders_status_order_date");
            entity.HasIndex(o => o.TotalAmount).HasDatabaseName("ix_orders_total_amount");
            entity.HasIndex(o => new { o.PaymentStatus, o.OrderDate }).HasDatabaseName("ix_orders_payment_status_order_date");
            entity.HasIndex(o => new { o.FulfillmentStatus, o.OrderDate }).HasDatabaseName("ix_orders_fulfillment_status_order_date");
            entity.HasIndex(o => new { o.CustomerId, o.CreatedAt }).HasDatabaseName("ix_orders_customer_id_created_at");
            // W2-10: báo cáo doanh thu theo quầy/ca; W2-19: tra đơn theo báo giá.
            entity.HasIndex(o => new { o.StoreId, o.OrderDate }).HasDatabaseName("ix_orders_store_id_order_date");
            entity.HasIndex(o => o.ShiftId).HasDatabaseName("ix_orders_shift_id");
            entity.HasIndex(o => o.QuotationId).HasDatabaseName("ix_orders_quotation_id");
            // Tra cứu đơn khách vãng lai (gộp vào tài khoản khi đăng ký).
            entity.HasIndex(o => o.AnonymousId).HasDatabaseName("ix_orders_anonymous_id");

            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Orders_SubtotalAmount_NonNegative", "\"SubtotalAmount\" >= 0");
                t.HasCheckConstraint("CK_Orders_TaxAmount_NonNegative", "\"TaxAmount\" >= 0");
                t.HasCheckConstraint("CK_Orders_TotalAmount_NonNegative", "\"TotalAmount\" >= 0");
                t.HasCheckConstraint("CK_Orders_DiscountAmount_NonNegative", "\"DiscountAmount\" >= 0");
                t.HasCheckConstraint("CK_Orders_ShippingAmount_NonNegative", "\"ShippingAmount\" >= 0");
                t.HasCheckConstraint("CK_Orders_ShippingFee_NonNegative", "\"ShippingFee\" >= 0");
                t.HasCheckConstraint("CK_Orders_ShippingDiscount_NonNegative", "\"ShippingDiscount\" >= 0");
                t.HasCheckConstraint("CK_Orders_TaxRate_Fraction", "\"TaxRate\" >= 0 AND \"TaxRate\" <= 1");
                t.HasCheckConstraint("CK_Orders_ShippingVatRate_Fraction", "\"ShippingVatRate\" >= 0 AND \"ShippingVatRate\" <= 1");
                t.HasCheckConstraint("CK_Orders_ShippingVatAmount_NonNegative", "\"ShippingVatAmount\" >= 0");
            });
        });

        ConfigureOrderPayments(modelBuilder);
        ConfigureHeldOrders(modelBuilder);
        ConfigureOrderHistories(modelBuilder);
    }

    /// <summary>D07 — khối người mua nằm CÙNG BẢNG Orders (owned, không tách bảng phụ).</summary>
    private static void ConfigureBuyerInvoice(Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<Order> entity)
    {
        entity.OwnsOne(o => o.BuyerInvoice, buyer =>
        {
            buyer.Property(b => b.InvoiceRequested).HasColumnName("InvoiceRequested").HasDefaultValue(false);
            buyer.Property(b => b.BuyerType).HasColumnName("BuyerType").HasConversion<int>().HasDefaultValue(BuyerType.Individual);
            buyer.Property(b => b.BuyerLegalName).HasColumnName("BuyerLegalName").HasMaxLength(250);
            buyer.Property(b => b.BuyerFullName).HasColumnName("BuyerFullName").HasMaxLength(200);
            buyer.Property(b => b.BuyerTaxCode).HasColumnName("BuyerTaxCode").HasMaxLength(20);
            buyer.Property(b => b.BuyerBudgetUnitCode).HasColumnName("BuyerBudgetUnitCode").HasMaxLength(20);
            buyer.Property(b => b.BuyerAddress).HasColumnName("BuyerAddress").HasMaxLength(400);
            buyer.Property(b => b.BuyerEmail).HasColumnName("BuyerEmail").HasMaxLength(200);
            buyer.Property(b => b.BuyerPhone).HasColumnName("BuyerPhone").HasMaxLength(30);
        });
        entity.Navigation(o => o.BuyerInvoice).IsRequired();
    }

    /// <summary>D01 §4 + D07 — dòng đơn tự mang đủ số liệu thuế để xuất hoá đơn.</summary>
    private static void ConfigureOrderItems(Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<Order> entity)
    {
        entity.OwnsMany(o => o.Items, item =>
        {
            item.ToTable("OrderItem");
            item.Property(i => i.UnitPrice).HasPrecision(18, 2);
            item.Property(i => i.OriginalPrice).HasPrecision(18, 2);
            item.Property(i => i.DiscountAmount).HasPrecision(18, 2);
            item.Property(i => i.LineTotal).HasPrecision(18, 2);
            item.Property(i => i.VariantId).HasColumnName("VariantId");
            item.Property(i => i.VariantName).HasColumnName("VariantName");
            item.Property(i => i.VariantSku).HasColumnName("VariantSku");
            item.Property(i => i.IsGift).HasColumnName("IsGift").HasDefaultValue(false);
            item.Property(i => i.AppliedPromotionCode).HasColumnName("AppliedPromotionCode").HasMaxLength(50);

            // D01 §4 — 7 cột snapshot thuế/giảm giá.
            item.Property(i => i.Sequence).HasDefaultValue(0);
            item.Property(i => i.VatStatutoryRate).HasPrecision(5, 4).HasDefaultValue(0m);
            item.Property(i => i.VatReductionEligible).HasDefaultValue(true);
            item.Property(i => i.VatRate).HasPrecision(5, 4).HasDefaultValue(0m);
            item.Property(i => i.AllocatedOrderDiscount).HasPrecision(18, 2).HasDefaultValue(0m);
            item.Property(i => i.VatAmount).HasPrecision(18, 2).HasDefaultValue(0m);
            item.Property(i => i.GrossBeforeDiscount).HasPrecision(18, 2).HasDefaultValue(0m);
            item.Property(i => i.LineDiscount).HasPrecision(18, 2).HasDefaultValue(0m);
            // D07 — đơn vị tính in trên hoá đơn điện tử.
            item.Property(i => i.UnitName).HasMaxLength(50);
            // Combo đã áp giá combo lúc chốt đơn (snapshot).
            item.Property(i => i.BundleName).HasMaxLength(200);

            item.HasIndex(i => i.ProductId).HasDatabaseName("ix_order_item_product_id");
            item.ToTable(t =>
            {
                t.HasCheckConstraint("CK_OrderItem_UnitPrice_NonNegative", "\"UnitPrice\" >= 0");
                t.HasCheckConstraint("CK_OrderItem_LineTotal_NonNegative", "\"LineTotal\" >= 0");
                t.HasCheckConstraint("CK_OrderItem_DiscountAmount_NonNegative", "\"DiscountAmount\" >= 0");
                t.HasCheckConstraint("CK_OrderItem_Quantity_Positive", "\"Quantity\" > 0");
                t.HasCheckConstraint("CK_OrderItem_VatAmount_NonNegative", "\"VatAmount\" >= 0");
                t.HasCheckConstraint("CK_OrderItem_LineDiscount_NonNegative", "\"LineDiscount\" >= 0");
                t.HasCheckConstraint("CK_OrderItem_AllocatedOrderDiscount_NonNegative", "\"AllocatedOrderDiscount\" >= 0");
                t.HasCheckConstraint("CK_OrderItem_VatRate_Fraction", "\"VatRate\" >= 0 AND \"VatRate\" <= 1");
            });
        });
    }

    private static void ConfigureOrderPayments(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<OrderPayment>(entity =>
        {
            entity.ToTable("OrderPayments");
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Method).HasConversion<int>();
            entity.Property(p => p.Amount).HasPrecision(18, 2);
            entity.Property(p => p.TenderedAmount).HasPrecision(18, 2);
            entity.Property(p => p.ChangeAmount).HasPrecision(18, 2);
            entity.Property(p => p.Reference).HasMaxLength(100);
            entity.Property(p => p.ReceivedBy).HasMaxLength(200);
            entity.Property(p => p.Notes).HasMaxLength(500);

            entity.HasOne<Order>().WithMany()
                .HasForeignKey(p => p.OrderId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_order_payments_order_id");

            entity.HasIndex(p => p.OrderId).HasDatabaseName("ix_order_payments_order_id");
            entity.HasIndex(p => p.ShiftId).HasDatabaseName("ix_order_payments_shift_id");
            // Đối soát cổng thanh toán: một mã giao dịch chỉ được ghi nhận một lần.
            entity.HasIndex(p => new { p.Method, p.Reference }).HasDatabaseName("ix_order_payments_method_reference");
            entity.HasQueryFilter(p => p.IsActive);
            entity.ToTable(t => t.HasCheckConstraint("CK_OrderPayments_Amount_Positive", "\"Amount\" > 0"));
        });
    }

    private static void ConfigureHeldOrders(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<HeldOrder>(entity =>
        {
            entity.ToTable("HeldOrders");
            entity.HasKey(h => h.Id);
            entity.Property(h => h.Label).IsRequired().HasMaxLength(120);
            entity.Property(h => h.ItemsJson).HasColumnType("jsonb").HasDefaultValueSql("'[]'::jsonb");
            entity.Property(h => h.EstimatedTotal).HasPrecision(18, 2);
            entity.Property(h => h.CustomerName).HasMaxLength(200);
            entity.Property(h => h.CustomerPhone).HasMaxLength(30);
            entity.Property(h => h.Notes).HasMaxLength(500);
            entity.HasIndex(h => new { h.StoreId, h.ShiftId }).HasDatabaseName("ix_held_orders_store_shift");
            entity.HasQueryFilter(h => h.IsActive);
        });
    }

    private static void ConfigureOrderHistories(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<OrderHistory>(entity =>
        {
            entity.ToTable("OrderHistories");
            entity.HasKey(oh => oh.Id);
            entity.Property(oh => oh.ChangedAt).IsRequired();

            entity.HasOne<Order>().WithMany()
                .HasForeignKey(oh => oh.OrderId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_order_histories_order_id");

            entity.HasIndex(oh => new { oh.OrderId, oh.ChangedAt }).HasDatabaseName("ix_order_histories_order_id_changed_at");
        });
    }
}
