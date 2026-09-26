using Microsoft.EntityFrameworkCore;
using Catalog.Domain;
using Catalog.Application.Search;
using Catalog.Application.PriceHistory;
using Catalog.Infrastructure.Data.Configurations;
using BuildingBlocks.Database;

namespace Catalog.Infrastructure;

public class CatalogDbContext : DbContext
{
    private readonly PriceChangeContext? _priceChangeContext;

    public CatalogDbContext(DbContextOptions<CatalogDbContext> options, PriceChangeContext? priceChangeContext = null)
        : base(options)
    {
        _priceChangeContext = priceChangeContext;
    }

    public DbSet<Product> Products { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<Brand> Brands { get; set; }
    public DbSet<ProductReview> ProductReviews { get; set; }
    public DbSet<ProductReviewHelpfulVote> ProductReviewHelpfulVotes { get; set; } = default!;
    public DbSet<ProductPriceChange> ProductPriceChanges { get; set; } = default!;
    public DbSet<ProductAttribute> ProductAttributes { get; set; }
    public DbSet<SavedPcBuild> SavedPcBuilds { get; set; }
    public DbSet<SavedPcBuildItem> SavedPcBuildItems { get; set; }
    public DbSet<ProductBundle> ProductBundles { get; set; }
    public DbSet<ProductBundleItem> ProductBundleItems { get; set; }

    // Phase 03: Media / Variant / Specification
    public DbSet<ProductMedia> ProductMedias { get; set; } = default!;
    public DbSet<ProductVariant> ProductVariants { get; set; } = default!;
    public DbSet<ProductVariantOption> ProductVariantOptions { get; set; } = default!;
    public DbSet<ProductOptionType> ProductOptionTypes { get; set; } = default!;
    public DbSet<ProductOptionValue> ProductOptionValues { get; set; } = default!;
    public DbSet<SpecificationGroup> SpecificationGroups { get; set; } = default!;
    public DbSet<SpecificationAttribute> SpecificationAttributes { get; set; } = default!;
    public DbSet<ProductSpecificationValue> ProductSpecificationValues { get; set; } = default!;

    /// <summary>
    /// D10: MỘT VÀ CHỈ MỘT nơi ghi `ProductPriceChanges` - so sánh giá trị gốc/hiện tại của mọi
    /// `Product` đang `Modified` trước khi SaveChanges thật sự chạy. Endpoint chỉ đặt
    /// `PriceChangeContext.Source`; không endpoint nào tự `Add` vào bảng này.
    /// </summary>
    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        CapturePriceChanges();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        CapturePriceChanges();
        return base.SaveChanges();
    }

    private void CapturePriceChanges()
    {
        var source = _priceChangeContext?.Source ?? "Manual";
        var actorId = _priceChangeContext?.ActorId;

        foreach (var entry in ChangeTracker.Entries<Product>())
        {
            if (entry.State != EntityState.Modified) continue;

            var oldPrice = entry.OriginalValues.GetValue<decimal>(nameof(Product.Price));
            var newPrice = entry.CurrentValues.GetValue<decimal>(nameof(Product.Price));
            var oldCost = entry.OriginalValues.GetValue<decimal>(nameof(Product.CostPrice));
            var newCost = entry.CurrentValues.GetValue<decimal>(nameof(Product.CostPrice));

            if (oldPrice == newPrice && oldCost == newCost) continue;

            ProductPriceChanges.Add(new ProductPriceChange(entry.Entity.Id, oldPrice, newPrice, oldCost, newCost, source, actorId));
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(CatalogDbContext).Assembly);

        // Ánh xạ wrapper IMMUTABLE của unaccent() để ApplySearch dùng được trong LINQ
        // và để chỉ mục GIN trigram trên cùng biểu thức này được tối ưu hoá nhận ra.
        modelBuilder
            .HasDbFunction(typeof(PostgresTextFunctions).GetMethod(nameof(PostgresTextFunctions.QhUnaccent))!)
            .HasName("qh_unaccent_immutable")
            .HasSchema("public");

        // Configure PostgreSQL settings
        PostgreSQLConfig.ConfigurePostgreSQL(modelBuilder, "public");
        PostgreSQLConfig.ConfigureCommonColumnProperties(modelBuilder);
        
        // Soft delete filters
        modelBuilder.Entity<Product>().HasQueryFilter(p => p.IsActive);
        modelBuilder.Entity<Category>().HasQueryFilter(c => c.IsActive);
        modelBuilder.Entity<Brand>().HasQueryFilter(b => b.IsActive);
        modelBuilder.Entity<Brand>().HasQueryFilter(b => b.IsActive);
        modelBuilder.Entity<ProductReview>().HasQueryFilter(pr => pr.IsActive);
        modelBuilder.Entity<SavedPcBuild>().HasQueryFilter(pc => pc.IsActive);
        modelBuilder.Entity<SavedPcBuildItem>().HasQueryFilter(pi => pi.IsActive);
        modelBuilder.Entity<ProductBundle>().HasQueryFilter(pb => pb.IsActive);
        modelBuilder.Entity<ProductBundleItem>().HasQueryFilter(pbi => pbi.IsActive);

        // Product configurations
        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("Products");
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Price).HasPrecision(18, 2);
            entity.Property(p => p.CostPrice).HasPrecision(18, 2);
            // W1-11 / audit db-schema-migrations-23: OldPrice còn là numeric không giới hạn.
            // AverageRating vẫn là `real` vì Product.AverageRating là `float` (Domain/Product.cs:40)
            // và Npgsql không ánh xạ float sang numeric - đổi kiểu CLR nằm ngoài ownership của
            // W1-11 (xem integration request W1-11-IR-01). Ở đây chỉ chặn giá trị vô lý bằng CHECK.
            entity.Property(p => p.OldPrice).HasPrecision(18, 2);
            entity.Property(p => p.Weight).HasPrecision(10, 3);
            entity.Property(p => p.Name).IsRequired().HasMaxLength(200);
            entity.Property(p => p.Sku).IsRequired().HasMaxLength(50);
            entity.Property(p => p.Description).HasColumnType("text");
            entity.Property(p => p.Specifications).HasColumnType("jsonb");
            entity.Property(p => p.GalleryImages).HasColumnType("jsonb");
            // JSON extensibility — freeform key/value attributes, default '{}'
            entity.Property(p => p.Attributes).HasColumnType("jsonb").HasDefaultValueSql("'{}'::jsonb");

            // D08: bảo hành theo số tháng (NULL = dùng chính sách hiệu lực của ngành hàng)
            // + cờ loại trừ khỏi quyền đổi trả tự nguyện.
            entity.Property(p => p.WarrantyMonths);
            entity.Property(p => p.IsReturnExcluded).HasDefaultValue(false);

            // D07: đơn vị tính - "Chiếc" mặc định, cần cho dòng hoá đơn (Accounting đọc qua sự kiện).
            entity.Property(p => p.UnitName).HasMaxLength(30).HasDefaultValue("Chiếc").IsRequired();

            // Foreign Keys with Navigation Properties
            entity.HasOne(p => p.Category)
                .WithMany()
                .HasForeignKey(p => p.CategoryId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_products_category_id");
                
            entity.HasOne(p => p.Brand)
                .WithMany()
                .HasForeignKey(p => p.BrandId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_products_brand_id");
            
            // Unique constraints
            entity.HasIndex(p => p.Sku)
                .IsUnique()
                .HasFilter("\"IsActive\" = true")
                .HasDatabaseName("uq_products_sku");

            entity.Property(p => p.Slug).HasMaxLength(300);
            entity.HasIndex(p => p.Slug)
                .IsUnique()
                .HasFilter("\"Slug\" IS NOT NULL AND \"Slug\" != ''")
                .HasDatabaseName("uq_products_slug");
            
            // Indexes for common queries
            entity.HasIndex(p => new { p.Name, p.IsActive })
                .HasDatabaseName("ix_products_name_status");
                
            entity.HasIndex(p => new { p.CategoryId, p.IsActive })
                .HasDatabaseName("ix_products_category_id_status");
                
            entity.HasIndex(p => new { p.BrandId, p.IsActive })
                .HasDatabaseName("ix_products_brand_id_status");
                
            entity.HasIndex(p => new { p.Price, p.IsActive })
                .HasDatabaseName("ix_products_price_status");
                
            entity.HasIndex(p => p.CreatedAt)
                .HasDatabaseName("ix_products_created_at");
                
            entity.HasIndex(p => new { p.StockQuantity, p.IsActive })
                .HasFilter("\"StockQuantity\" <= \"LowStockThreshold\"")
                .HasDatabaseName("ix_products_low_stock");

            // Phase 03: expose private list nav (Medias / Variants / SpecValues) qua backing field
            entity.HasMany(typeof(ProductMedia), "_medias")
                .WithOne()
                .HasForeignKey("ProductId")
                .OnDelete(DeleteBehavior.Cascade);
            entity.Navigation("_medias").UsePropertyAccessMode(PropertyAccessMode.Field);

            entity.HasMany(typeof(ProductVariant), "_variants")
                .WithOne()
                .HasForeignKey("ProductId")
                .OnDelete(DeleteBehavior.Cascade);
            entity.Navigation("_variants").UsePropertyAccessMode(PropertyAccessMode.Field);

            entity.HasMany(typeof(ProductSpecificationValue), "_specValues")
                .WithOne()
                .HasForeignKey("ProductId")
                .OnDelete(DeleteBehavior.Cascade);
            entity.Navigation("_specValues").UsePropertyAccessMode(PropertyAccessMode.Field);

            entity.Ignore(p => p.Medias);
            entity.Ignore(p => p.Variants);
            entity.Ignore(p => p.SpecValues);
            entity.Ignore(p => p.EffectiveImageUrl);
            entity.Ignore(p => p.EffectivePrice);

            // W1-11: CSDL tự chặn tiền âm / tồn âm (audit db-schema-migrations-11: 0 CHECK).
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Products_Price_NonNegative", "\"Price\" >= 0");
                t.HasCheckConstraint("CK_Products_CostPrice_NonNegative", "\"CostPrice\" >= 0");
                t.HasCheckConstraint(
                    "CK_Products_OldPrice_NonNegative",
                    "\"OldPrice\" IS NULL OR \"OldPrice\" >= 0");
                t.HasCheckConstraint("CK_Products_StockQuantity_NonNegative", "\"StockQuantity\" >= 0");
                t.HasCheckConstraint(
                    "CK_Products_AverageRating_Range",
                    "\"AverageRating\" >= 0 AND \"AverageRating\" <= 5");
            });
        });

        // Category configurations
        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("Categories");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Name).IsRequired().HasMaxLength(100);
            entity.Property(c => c.Description).HasColumnType("text");

            entity.Property(c => c.Slug).HasMaxLength(300);
            entity.HasIndex(c => c.Slug)
                .IsUnique()
                .HasFilter("\"Slug\" IS NOT NULL AND \"Slug\" != ''")
                .HasDatabaseName("uq_categories_slug");

            // D01: VatRate lưu dưới dạng PHÂN SỐ (0.10 = 10%), nên cần 4 chữ số thập phân để
            // biểu diễn được các mức 0.08 / 0.0825... và CHECK giữ nó trong [0, 1].
            entity.Property(c => c.VatRate).HasPrecision(5, 4).HasDefaultValue(0.10m);
            // D01: VatRate là thuế suất THEO LUẬT; cờ này quyết định ngành hàng có được
            // áp mức giảm của kỳ giảm thuế hay không.
            entity.Property(c => c.VatReductionEligible).HasDefaultValue(true);
            // D08: bảo hành theo serial cho ngành hàng này.
            entity.Property(c => c.IsSerialTracked).HasDefaultValue(false);

            // Cây danh mục: tự tham chiếu, Restrict để không bao giờ xoá dây chuyền cả nhánh.
            entity.HasOne(c => c.Parent)
                .WithMany()
                .HasForeignKey(c => c.ParentId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_categories_parent_id");

            entity.Property(c => c.ImageUrl).HasMaxLength(1024);
            entity.Property(c => c.Icon).HasMaxLength(100);
            entity.Property(c => c.DisplayOrder).HasDefaultValue(0);
            entity.Property(c => c.MetaTitle).HasMaxLength(200);
            // ConfigureCommonColumnProperties chạy TRƯỚC khối này và ép mọi cột tên chứa
            // "description" chưa có MaxLength về `text`; CSDL thật lại là varchar(500)
            // (migration 20260918090000 của W0-5). Ghim kiểu cột để model khớp CSDL.
            entity.Property(c => c.MetaDescription)
                .HasMaxLength(500)
                .HasColumnType("character varying(500)");

            entity.HasIndex(c => new { c.ParentId, c.DisplayOrder })
                .HasDatabaseName("ix_categories_parent_id_display_order");

            entity.ToTable(t => t.HasCheckConstraint(
                "CK_Categories_VatRate_Fraction",
                "\"VatRate\" >= 0 AND \"VatRate\" <= 1"));
        });

        // Brand configurations
        modelBuilder.Entity<Brand>(entity =>
        {
            entity.ToTable("Brands");
            entity.HasKey(b => b.Id);
            entity.Property(b => b.Name).IsRequired().HasMaxLength(100);
            entity.Property(b => b.Description).HasColumnType("text");

            // IsRequired(false) BẮT BUỘC: migration tạo cột "Slug" NULL được và backfill CHỈ các
            // thương hiệu đang hoạt động (D03 - 4 hàng rác bị W0-6 xoá cứng), nên trong DB vẫn còn
            // Slug = NULL. CLR property là `string` không-null nên nếu không khai báo nullable ở
            // đây, EF coi cột là NOT NULL và trình vật chất hoá KHÔNG chèn kiểm tra null -> mọi
            // truy vấn admin dùng IgnoreQueryFilters() (GET /brands?includeInactive=true, PUT,
            // DELETE, activate trên hàng rác) sẽ ném lỗi đọc giá trị thay vì trả dữ liệu.
            entity.Property(b => b.Slug).HasMaxLength(300).IsRequired(false);
            // Filtered unique: các hàng rác (slug NULL/rỗng) không chặn nhau.
            entity.HasIndex(b => b.Slug)
                .IsUnique()
                .HasFilter("\"Slug\" IS NOT NULL AND \"Slug\" != ''")
                .HasDatabaseName("uq_brands_slug");

            entity.Property(b => b.LogoUrl).HasMaxLength(1024);
            entity.Property(b => b.Website).HasMaxLength(500);
            entity.Property(b => b.DisplayOrder).HasDefaultValue(0);

            entity.HasIndex(b => b.DisplayOrder)
                .HasDatabaseName("ix_brands_display_order");
        });

        // ProductReview configurations
        modelBuilder.Entity<ProductReview>(entity =>
        {
            entity.ToTable("ProductReviews");
            entity.HasKey(pr => pr.Id);
            entity.Property(pr => pr.Rating).IsRequired();
            entity.Property(pr => pr.Comment).IsRequired().HasColumnType("text");
            entity.Property(pr => pr.Title).HasMaxLength(200);
            entity.Property(pr => pr.ImageUrls).HasColumnType("jsonb");
            // W2: ưu/nhược điểm + "Phản hồi từ Quang Hưởng".
            entity.Property(pr => pr.Pros).HasMaxLength(ProductReview.MaxProsConsLength);
            entity.Property(pr => pr.Cons).HasMaxLength(ProductReview.MaxProsConsLength);
            entity.Property(pr => pr.ReplyText).HasColumnType("text");
            entity.Property(pr => pr.RepliedBy).HasMaxLength(450);
            
            entity.HasOne<Product>()
                .WithMany()
                .HasForeignKey(pr => pr.ProductId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_product_reviews_product_id");
            
            entity.HasIndex(pr => new { pr.ProductId, pr.IsApproved })
                .HasDatabaseName("ix_product_reviews_product_id_approved");
                
            entity.HasIndex(pr => pr.Rating)
                .HasDatabaseName("ix_product_reviews_rating");

            // W1-11 / audit db-schema-migrations-12: "đánh giá của tôi" quét toàn bảng.
            entity.HasIndex(pr => pr.CustomerId)
                .HasDatabaseName("ix_product_reviews_customer_id");

            entity.ToTable(t => t.HasCheckConstraint(
                "CK_ProductReviews_Rating_Range",
                "\"Rating\" >= 1 AND \"Rating\" <= 5"));
        });

        // W2-1 (Todo "hide unapproved reviews" + "require auth + one vote per user"): 1 vote / user / review.
        modelBuilder.Entity<ProductReviewHelpfulVote>(entity =>
        {
            entity.ToTable("ProductReviewHelpfulVotes");
            entity.HasKey(v => v.Id);
            entity.Property(v => v.UserId).IsRequired().HasMaxLength(450); // khớp ASP.NET Identity key length

            entity.HasOne<ProductReview>()
                .WithMany()
                .HasForeignKey(v => v.ReviewId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_product_review_helpful_votes_review_id");

            entity.HasIndex(v => new { v.ReviewId, v.UserId })
                .IsUnique()
                .HasDatabaseName("uq_product_review_helpful_votes_review_user");
        });

        // D10: lịch sử giá - MỘT nơi ghi (SaveChanges hook trên chính DbContext này, xem trên).
        modelBuilder.Entity<ProductPriceChange>(entity =>
        {
            entity.ToTable("ProductPriceChanges");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.OldPrice).HasPrecision(18, 2);
            entity.Property(c => c.NewPrice).HasPrecision(18, 2);
            entity.Property(c => c.OldCostPrice).HasPrecision(18, 2);
            entity.Property(c => c.NewCostPrice).HasPrecision(18, 2);
            entity.Property(c => c.Source).IsRequired().HasMaxLength(30);
            entity.Property(c => c.ActorId).HasMaxLength(450);

            entity.HasOne<Product>()
                .WithMany()
                .HasForeignKey(c => c.ProductId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_product_price_changes_product_id");

            entity.HasIndex(c => new { c.ProductId, c.At })
                .HasDatabaseName("ix_product_price_changes_product_id_at");
        });

        // ProductAttribute configurations
        modelBuilder.Entity<ProductAttribute>(entity =>
        {
            entity.ToTable("ProductAttributes");
            entity.HasKey(pa => pa.Id);
            entity.Property(pa => pa.AttributeName).IsRequired().HasMaxLength(100);
            entity.Property(pa => pa.AttributeValue).IsRequired().HasMaxLength(500);
            
            entity.HasOne<Product>()
                .WithMany()
                .HasForeignKey(pa => pa.ProductId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_product_attributes_product_id");
            
            entity.HasIndex(pa => new { pa.ProductId, pa.AttributeName })
                .HasDatabaseName("ix_product_attributes_product_id_name");
                
            entity.HasIndex(pa => new { pa.AttributeName, pa.IsFilterable })
                .HasDatabaseName("ix_product_attributes_name_filterable");
        });

        // SavedPcBuild configurations
        modelBuilder.Entity<SavedPcBuild>(entity =>
        {
            entity.ToTable("SavedPcBuilds");
            entity.HasKey(pc => pc.Id);
            entity.Property(pc => pc.BuildCode).IsRequired().HasMaxLength(20);
            entity.Property(pc => pc.Name).IsRequired().HasMaxLength(150);
            entity.Property(pc => pc.TotalPrice).HasPrecision(18, 2);
            entity.Property(pc => pc.CompatibilityIssues).HasColumnType("jsonb");

            entity.HasIndex(pc => pc.BuildCode)
                .IsUnique()
                .HasDatabaseName("uq_saved_pc_builds_code");

            entity.HasIndex(pc => pc.CustomerId)
                .HasDatabaseName("ix_saved_pc_builds_customer_id");
        });

        // SavedPcBuildItem configurations
        modelBuilder.Entity<SavedPcBuildItem>(entity =>
        {
            entity.ToTable("SavedPcBuildItems");
            entity.HasKey(pi => pi.Id);
            entity.Property(pi => pi.ComponentType).IsRequired().HasMaxLength(50);
            entity.Property(pi => pi.UnitPrice).HasPrecision(18, 2);

            entity.HasOne<SavedPcBuild>()
                .WithMany(pc => pc.Items)
                .HasForeignKey(pi => pi.BuildId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_saved_pc_build_items_build_id");
                
            entity.HasOne<Product>()
                .WithMany()
                .HasForeignKey(pi => pi.ProductId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_saved_pc_build_items_product_id");

            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_SavedPcBuildItems_Quantity_Positive", "\"Quantity\" > 0");
                t.HasCheckConstraint("CK_SavedPcBuildItems_UnitPrice_NonNegative", "\"UnitPrice\" >= 0");
            });
        });

        // ProductBundle configurations
        modelBuilder.Entity<ProductBundle>(entity =>
        {
            entity.ToTable("ProductBundles");
            entity.HasKey(pb => pb.Id);
            entity.Property(pb => pb.Name).IsRequired().HasMaxLength(200);
            entity.Property(pb => pb.Description).HasColumnType("text");
            entity.Property(pb => pb.TotalPrice).HasPrecision(18, 2);
            entity.Property(pb => pb.OriginalPrice).HasPrecision(18, 2);
            // Chế độ giá % (null = giá cố định TotalPrice) — W2 combo.
            entity.Property(pb => pb.DiscountPercent).HasPrecision(5, 2);
            
            entity.HasIndex(pb => pb.ValidFrom)
                .HasDatabaseName("ix_product_bundles_valid_from");
                
            entity.HasIndex(pb => pb.ValidTo)
                .HasDatabaseName("ix_product_bundles_valid_to");

            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_ProductBundles_TotalPrice_NonNegative", "\"TotalPrice\" >= 0");
                t.HasCheckConstraint("CK_ProductBundles_OriginalPrice_NonNegative", "\"OriginalPrice\" >= 0");
                t.HasCheckConstraint(
                    "CK_ProductBundles_DiscountPercent_Range",
                    "\"DiscountPercent\" IS NULL OR (\"DiscountPercent\" > 0 AND \"DiscountPercent\" < 100)");
            });
        });

        // ProductBundleItem configurations
        modelBuilder.Entity<ProductBundleItem>(entity =>
        {
            entity.ToTable("ProductBundleItems");
            entity.HasKey(pbi => pbi.Id);
            entity.Property(pbi => pbi.OriginalUnitPrice).HasPrecision(18, 2);
            entity.Property(pbi => pbi.DiscountPercentage).HasPrecision(5, 2);

            entity.HasOne<ProductBundle>()
                .WithMany(pb => pb.Items)
                .HasForeignKey(pbi => pbi.BundleId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_product_bundle_items_bundle_id");
                
            entity.HasOne<Product>()
                .WithMany()
                .HasForeignKey(pbi => pbi.ProductId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_product_bundle_items_product_id");
                
            entity.HasIndex(pbi => new { pbi.ProductId, pbi.IsMainItem })
                .HasDatabaseName("ix_product_bundle_items_product_id_main");

            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_ProductBundleItems_Quantity_Positive", "\"Quantity\" > 0");
                t.HasCheckConstraint(
                    "CK_ProductBundleItems_OriginalUnitPrice_NonNegative",
                    "\"OriginalUnitPrice\" >= 0");
                t.HasCheckConstraint(
                    "CK_ProductBundleItems_DiscountPercentage_Range",
                    "\"DiscountPercentage\" >= 0 AND \"DiscountPercentage\" <= 100");
            });
        });

        // ------- Phase 03: ProductMedia / Variant / Specification -------

        modelBuilder.Entity<ProductMedia>(entity =>
        {
            entity.ToTable("ProductMedias");
            entity.HasKey(m => m.Id);
            entity.Property(m => m.Url).IsRequired().HasMaxLength(1024);
            entity.Property(m => m.ThumbnailUrl).HasMaxLength(1024);
            entity.Property(m => m.AltText).HasMaxLength(500);

            entity.HasOne(m => m.Product)
                .WithMany()
                .HasForeignKey(m => m.ProductId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_product_medias_product_id");

            // Note: VariantId FK là "soft" — không set ràng buộc DB để tránh cascade phức tạp;
            // xử lý orphan ở tầng ứng dụng khi xoá variant.

            entity.HasIndex(m => new { m.ProductId, m.SortOrder })
                .HasDatabaseName("ix_product_medias_product_id_sort");

            // W2-1: filtered UNIQUE - CSDL tự chặn 2 ảnh chính/sản phẩm (trước đây chỉ index
            // thường, "đảm bảo ở tầng ứng dụng" - tầng ứng dụng có thể có race/bug, CSDL thì không).
            entity.HasIndex(m => m.ProductId)
                .IsUnique()
                .HasFilter("\"IsPrimary\" = true")
                .HasDatabaseName("ix_product_medias_primary");

            entity.HasIndex(m => m.VariantId)
                .HasDatabaseName("ix_product_medias_variant_id");
        });

        modelBuilder.Entity<ProductOptionType>(entity =>
        {
            entity.ToTable("ProductOptionTypes");
            entity.HasKey(o => o.Id);
            entity.Property(o => o.Name).IsRequired().HasMaxLength(100);
            entity.Property(o => o.DisplayName).IsRequired().HasMaxLength(200);
            entity.Property(o => o.InputType).HasConversion<int>();

            entity.HasIndex(o => o.Name)
                .IsUnique()
                .HasDatabaseName("uq_product_option_types_name");
        });

        modelBuilder.Entity<ProductOptionValue>(entity =>
        {
            entity.ToTable("ProductOptionValues");
            entity.HasKey(v => v.Id);
            entity.Property(v => v.Value).IsRequired().HasMaxLength(200);
            entity.Property(v => v.DisplayValue).IsRequired().HasMaxLength(200);
            entity.Property(v => v.ColorHex).HasMaxLength(7);

            entity.HasOne(v => v.OptionType)
                .WithMany()
                .HasForeignKey(v => v.OptionTypeId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_product_option_values_option_type_id");

            entity.HasIndex(v => new { v.OptionTypeId, v.Value })
                .IsUnique()
                .HasDatabaseName("uq_product_option_values_type_value");
        });

        modelBuilder.Entity<ProductVariant>(entity =>
        {
            entity.ToTable("ProductVariants");
            entity.HasKey(v => v.Id);
            entity.Property(v => v.Sku).IsRequired().HasMaxLength(50);
            entity.Property(v => v.Name).IsRequired().HasMaxLength(300);
            entity.Property(v => v.Barcode).HasMaxLength(50);
            entity.Property(v => v.Price).HasPrecision(18, 2);
            entity.Property(v => v.OldPrice).HasPrecision(18, 2);
            entity.Property(v => v.CostPrice).HasPrecision(18, 2);
            entity.Property(v => v.Status).HasConversion<int>();

            entity.HasOne(v => v.Product)
                .WithMany()
                .HasForeignKey(v => v.ProductId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_product_variants_product_id");

            // Backing field _options → ProductVariantOption; dùng FK có sẵn "VariantId" để không sinh shadow FK.
            entity.HasMany(typeof(ProductVariantOption), "_options")
                .WithOne()
                .HasForeignKey("VariantId")
                .OnDelete(DeleteBehavior.Cascade);
            entity.Navigation("_options").UsePropertyAccessMode(PropertyAccessMode.Field);
            entity.Ignore(v => v.Options);

            entity.HasIndex(v => new { v.ProductId, v.Sku })
                .IsUnique()
                .HasDatabaseName("uq_product_variants_product_sku");

            entity.HasIndex(v => new { v.ProductId, v.IsDefault })
                .HasDatabaseName("ix_product_variants_product_default");

            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_ProductVariants_Price_NonNegative", "\"Price\" >= 0");
                t.HasCheckConstraint("CK_ProductVariants_CostPrice_NonNegative", "\"CostPrice\" >= 0");
                t.HasCheckConstraint(
                    "CK_ProductVariants_OldPrice_NonNegative",
                    "\"OldPrice\" IS NULL OR \"OldPrice\" >= 0");
                t.HasCheckConstraint(
                    "CK_ProductVariants_StockQuantity_NonNegative",
                    "\"StockQuantity\" >= 0");
            });
        });

        modelBuilder.Entity<ProductVariantOption>(entity =>
        {
            entity.ToTable("ProductVariantOptions");
            entity.HasKey(o => o.Id);

            // Quan hệ Variant do ProductVariant._options định nghĩa (HasMany + FK VariantId) — không lặp lại ở đây.
            entity.Ignore(o => o.Variant);

            entity.HasOne(o => o.OptionType)
                .WithMany()
                .HasForeignKey(o => o.OptionTypeId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_product_variant_options_option_type_id");

            entity.HasOne(o => o.OptionValue)
                .WithMany()
                .HasForeignKey(o => o.OptionValueId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_product_variant_options_option_value_id");

            entity.HasIndex(o => new { o.VariantId, o.OptionTypeId })
                .IsUnique()
                .HasDatabaseName("uq_product_variant_options_variant_type");
        });

        modelBuilder.Entity<SpecificationGroup>(entity =>
        {
            entity.ToTable("SpecificationGroups");
            entity.HasKey(g => g.Id);
            entity.Property(g => g.Name).IsRequired().HasMaxLength(200);

            entity.HasIndex(g => g.CategoryId)
                .HasDatabaseName("ix_specification_groups_category_id");
        });

        modelBuilder.Entity<SpecificationAttribute>(entity =>
        {
            entity.ToTable("SpecificationAttributes");
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Key).IsRequired().HasMaxLength(100);
            entity.Property(a => a.Name).IsRequired().HasMaxLength(200);
            entity.Property(a => a.Unit).HasMaxLength(50);
            entity.Property(a => a.DataType).HasConversion<int>();
            entity.Property(a => a.EnumValuesJson).HasColumnType("jsonb");

            entity.HasOne(a => a.Group)
                .WithMany()
                .HasForeignKey(a => a.GroupId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_specification_attributes_group_id");

            // Key unique per group — cùng "ram_gb" có thể xuất hiện ở group Laptop và group PC.
            // Filter builder khi query "ram_gb" tìm mọi attribute có key này (đã join theo product).
            entity.HasIndex(a => new { a.GroupId, a.Key })
                .IsUnique()
                .HasDatabaseName("uq_specification_attributes_group_key");

            entity.HasIndex(a => a.Key)
                .HasDatabaseName("ix_specification_attributes_key");

            entity.HasIndex(a => new { a.GroupId, a.SortOrder })
                .HasDatabaseName("ix_specification_attributes_group_sort");
        });

        modelBuilder.Entity<ProductSpecificationValue>(entity =>
        {
            entity.ToTable("ProductSpecificationValues");
            entity.HasKey(v => v.Id);
            entity.Property(v => v.ValueText).HasMaxLength(500);
            entity.Property(v => v.ValueNumber).HasPrecision(18, 4);
            entity.Property(v => v.ValueEnum).HasMaxLength(100);

            entity.HasOne(v => v.Product)
                .WithMany()
                .HasForeignKey(v => v.ProductId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_product_spec_values_product_id");

            entity.HasOne(v => v.Attribute)
                .WithMany()
                .HasForeignKey(v => v.AttributeId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_product_spec_values_attribute_id");

            entity.HasIndex(v => new { v.ProductId, v.AttributeId })
                .IsUnique()
                .HasDatabaseName("uq_product_spec_values_product_attribute");

            // Index cho filter theo giá trị
            entity.HasIndex(v => new { v.AttributeId, v.ValueNumber })
                .HasDatabaseName("ix_product_spec_values_attribute_number");

            entity.HasIndex(v => new { v.AttributeId, v.ValueText })
                .HasDatabaseName("ix_product_spec_values_attribute_text");

            entity.HasIndex(v => new { v.AttributeId, v.ValueEnum })
                .HasDatabaseName("ix_product_spec_values_attribute_enum");
        });
    }
}
