using Microsoft.EntityFrameworkCore;
using Sales.Domain;

namespace Sales.Infrastructure.Data;

/// <summary>
/// Cấu hình EF cho phần hậu mãi + báo giá.
///
/// QUY ƯỚC QUAN TRỌNG: các cột do D08/D10 yêu cầu trên những entity thuộc quyền sở hữu của
/// W2-10/W2-19/W2-20 được khai bằng SHADOW PROPERTY. W2-3 sở hữu migration nên phải TẠO cột,
/// nhưng KHÔNG được sửa file domain của track khác. Track sở hữu sau này chỉ việc đổi shadow
/// property thành property thật — schema không đổi, không cần migration thứ hai.
/// </summary>
internal static class SalesAfterSalesModelConfiguration
{
    /// <summary>D08 — 6 mã lý do trả hàng, lưu dạng int.</summary>
    internal const string ReasonCodeColumn = "ReasonCode";

    public static void Apply(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ReturnRequest>(entity =>
        {
            entity.ToTable("ReturnRequests");
            entity.HasKey(rr => rr.Id);
            entity.Property(rr => rr.RefundAmount).HasPrecision(18, 2);
            entity.Property(rr => rr.Type).HasConversion<int>();
            entity.Property(rr => rr.ReceivedCondition).HasConversion<int?>();
            entity.Property(rr => rr.PriceDifference).HasPrecision(18, 2);
            entity.Property(rr => rr.AttachmentUrls).HasColumnType("text");
            entity.Property(rr => rr.InspectionNotes).HasColumnType("text");

            // D08 — lý do trả hàng có cấu trúc (Defect, WrongItem, ShippingDamage,
            // NotAsDescribed, InfoDefect, ChangeOfMind). Quyết định phí và quyền trả phụ thuộc vào nó.
            entity.Property<int?>(ReasonCodeColumn).HasColumnName(ReasonCodeColumn);

            entity.HasOne<Order>().WithMany()
                .HasForeignKey(rr => rr.OrderId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_return_requests_order_id");

            entity.HasIndex(rr => new { rr.OrderId, rr.Status }).HasDatabaseName("ix_return_requests_order_id_status");
            entity.HasIndex(rr => rr.Status).HasDatabaseName("ix_return_requests_status");
            entity.HasIndex(rr => rr.Type).HasDatabaseName("ix_return_requests_type");
        });

        modelBuilder.Entity<ReturnPolicy>(entity =>
        {
            entity.ToTable("ReturnPolicies");
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Name).IsRequired().HasMaxLength(200);
            entity.Property(p => p.RestockingFeePercent).HasPrecision(5, 2);

            // D08 — ba tham số chính sách còn thiếu.
            entity.Property<bool>("AllowOpenedBoxReturn").HasDefaultValue(false);
            entity.Property<decimal>("MissingAccessoriesFeePercent").HasPrecision(5, 2).HasDefaultValue(0m);
            entity.Property<int>("DaysForStatutoryReturn").HasDefaultValue(0);

            entity.HasIndex(p => p.CategoryId).HasDatabaseName("ix_return_policies_category_id");
            entity.HasQueryFilter(p => p.IsActive);
        });

        modelBuilder.Entity<WishlistItem>(entity =>
        {
            entity.ToTable("WishlistItems");
            entity.HasKey(w => w.Id);
            entity.HasIndex(w => new { w.UserId, w.ProductId }).IsUnique().HasDatabaseName("ix_wishlist_items_user_product");
            entity.HasIndex(w => w.UserId).HasDatabaseName("ix_wishlist_items_user_id");
        });

        modelBuilder.Entity<LoyaltyAccount>(entity =>
        {
            entity.ToTable("LoyaltyAccounts");
            entity.HasKey(l => l.Id);
            // Cộng/trừ điểm đồng thời phải bị phát hiện thay vì ghi đè lặng lẽ.
            entity.UseXminAsConcurrencyToken();
            entity.HasIndex(l => l.UserId).IsUnique().HasDatabaseName("ix_loyalty_accounts_user_id");
            entity.HasIndex(l => l.Tier).HasDatabaseName("ix_loyalty_accounts_tier");
            entity.Ignore(l => l.Transactions);
        });

        modelBuilder.Entity<LoyaltyTransaction>(entity =>
        {
            entity.ToTable("LoyaltyTransactions");
            entity.HasKey(t => t.Id);
            // W2-10 — huỷ/trả đơn phải ĐẢO điểm đã cộng, và phải trỏ được về bút toán gốc
            // để không đảo hai lần cho cùng một đơn.
            entity.Property<Guid?>("ReversalOf");
            entity.HasIndex(t => new { t.AccountId, t.CreatedAt }).HasDatabaseName("ix_loyalty_transactions_account_created");
            entity.HasIndex(t => t.OrderId).HasDatabaseName("ix_loyalty_transactions_order_id");
            entity.HasIndex(t => t.Type).HasDatabaseName("ix_loyalty_transactions_type");
            entity.HasIndex("ReversalOf").HasDatabaseName("ix_loyalty_transactions_reversal_of");
        });

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

            // D10 — hồ sơ trả góp ở chế độ "lead": số hợp đồng tài chính khi được duyệt,
            // hạn giữ đơn, và thời điểm khách đồng ý điều khoản.
            entity.Property<string>("FinanceContractNumber").HasMaxLength(60);
            entity.Property<DateTime?>("ExpiresAt");
            entity.Property<DateTime?>("ConsentAt");

            entity.HasIndex(i => i.OrderId).HasDatabaseName("ix_installment_applications_order_id");
            entity.HasIndex(i => i.Status).HasDatabaseName("ix_installment_applications_status");
            entity.HasIndex("ExpiresAt").HasDatabaseName("ix_installment_applications_expires_at");
            entity.HasQueryFilter(i => i.IsActive);
        });

        ConfigureQuotations(modelBuilder);
    }

    /// <summary>
    /// D10 — bảng báo giá B2B. W2-3 chỉ TẠO BẢNG (migration là của W2-3); entity có kiểu thật
    /// là việc của W2-19 (<c>Domain/SalesQuotation.cs</c>). Dùng shared-type entity (property bag)
    /// để schema có thật mà không phải tạo file domain thuộc glob của track khác.
    /// </summary>
    private static void ConfigureQuotations(ModelBuilder modelBuilder)
    {
        modelBuilder.SharedTypeEntity<Dictionary<string, object>>("SalesQuotation", entity =>
        {
            entity.ToTable("SalesQuotations");
            entity.Property<Guid>("Id");
            entity.HasKey("Id");
            entity.Property<string>("QuotationNumber").HasMaxLength(40).IsRequired();
            entity.Property<int>("Status").HasDefaultValue(0);
            entity.Property<Guid?>("CustomerId");
            entity.Property<string>("CustomerName").HasMaxLength(200);
            entity.Property<string>("CustomerPhone").HasMaxLength(30);
            entity.Property<string>("CustomerEmail").HasMaxLength(200);
            // Khối người mua của D07 được sao chép sang đơn lúc chuyển đổi.
            entity.Property<int>("BuyerType").HasDefaultValue(0);
            entity.Property<string>("BuyerLegalName").HasMaxLength(250);
            entity.Property<string>("BuyerTaxCode").HasMaxLength(20);
            entity.Property<string>("BuyerBudgetUnitCode").HasMaxLength(20);
            entity.Property<string>("BuyerAddress").HasMaxLength(400);
            entity.Property<decimal>("SubtotalAmount").HasPrecision(18, 2).HasDefaultValue(0m);
            entity.Property<decimal>("DiscountAmount").HasPrecision(18, 2).HasDefaultValue(0m);
            entity.Property<decimal>("TaxAmount").HasPrecision(18, 2).HasDefaultValue(0m);
            entity.Property<decimal>("TotalAmount").HasPrecision(18, 2).HasDefaultValue(0m);
            entity.Property<int>("PaymentTermDays").HasDefaultValue(0);
            entity.Property<DateTime?>("ValidUntil");
            entity.Property<DateTime?>("AcceptedAt");
            entity.Property<DateTime?>("ConvertedAt");
            entity.Property<Guid?>("ConvertedOrderId");
            entity.Property<string>("TermsText").HasColumnType("text");
            entity.Property<string>("Notes").HasColumnType("text");
            entity.Property<string>("CreatedBy").HasMaxLength(200);
            entity.Property<DateTime>("CreatedAt").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property<DateTime?>("UpdatedAt");
            entity.Property<bool>("IsActive").HasDefaultValue(true);
            entity.HasIndex("QuotationNumber").IsUnique().HasDatabaseName("ix_sales_quotations_number");
            entity.HasIndex("CustomerId").HasDatabaseName("ix_sales_quotations_customer_id");
            entity.HasIndex("Status", "ValidUntil").HasDatabaseName("ix_sales_quotations_status_valid_until");
        });

        modelBuilder.SharedTypeEntity<Dictionary<string, object>>("SalesQuotationLine", entity =>
        {
            entity.ToTable("SalesQuotationLines");
            entity.Property<Guid>("Id");
            entity.HasKey("Id");
            entity.Property<Guid>("QuotationId");
            entity.Property<int>("Sequence").HasDefaultValue(0);
            entity.Property<Guid>("ProductId");
            entity.Property<Guid?>("VariantId");
            entity.Property<string>("ProductName").HasMaxLength(300).IsRequired();
            entity.Property<string>("ProductSku").HasMaxLength(100);
            entity.Property<string>("UnitName").HasMaxLength(50);
            entity.Property<int>("Quantity").HasDefaultValue(1);
            entity.Property<decimal>("UnitPrice").HasPrecision(18, 2).HasDefaultValue(0m);
            entity.Property<decimal>("LineDiscount").HasPrecision(18, 2).HasDefaultValue(0m);
            entity.Property<decimal>("VatStatutoryRate").HasPrecision(5, 4).HasDefaultValue(0m);
            entity.Property<bool>("VatReductionEligible").HasDefaultValue(true);
            entity.Property<decimal>("VatRate").HasPrecision(5, 4).HasDefaultValue(0m);
            entity.Property<decimal>("LineTotal").HasPrecision(18, 2).HasDefaultValue(0m);
            entity.Property<string>("Notes").HasMaxLength(500);
            entity.HasIndex("QuotationId").HasDatabaseName("ix_sales_quotation_lines_quotation_id");
            entity.ToTable(t => t.HasCheckConstraint("CK_SalesQuotationLines_Quantity_Positive", "\"Quantity\" > 0"));
        });
    }
}
