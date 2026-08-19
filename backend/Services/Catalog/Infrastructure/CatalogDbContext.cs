using Microsoft.EntityFrameworkCore;
using Catalog.Domain;
using Catalog.Infrastructure.Data.Configurations;
using BuildingBlocks.Database;

namespace Catalog.Infrastructure;

public class CatalogDbContext : DbContext
{
    public CatalogDbContext(DbContextOptions<CatalogDbContext> options) : base(options)
    {
    }

    public DbSet<Product> Products { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<Brand> Brands { get; set; }
    public DbSet<ProductReview> ProductReviews { get; set; }
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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(CatalogDbContext).Assembly);
        
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
            entity.Property(p => p.Weight).HasPrecision(10, 3);
            entity.Property(p => p.Name).IsRequired().HasMaxLength(200);
            entity.Property(p => p.Sku).IsRequired().HasMaxLength(50);
            entity.Property(p => p.Description).HasColumnType("text");
            entity.Property(p => p.Specifications).HasColumnType("jsonb");
            entity.Property(p => p.GalleryImages).HasColumnType("jsonb");
            // JSON extensibility — freeform key/value attributes, default '{}'
            entity.Property(p => p.Attributes).HasColumnType("jsonb").HasDefaultValueSql("'{}'::jsonb");
            
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

            entity.Property(c => c.VatRate).HasPrecision(5, 2).HasDefaultValue(0.10m);
        });

        // Brand configurations
        modelBuilder.Entity<Brand>(entity =>
        {
            entity.ToTable("Brands");
            entity.HasKey(b => b.Id);
            entity.Property(b => b.Name).IsRequired().HasMaxLength(100);
            entity.Property(b => b.Description).HasColumnType("text");
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
            
            entity.HasOne<Product>()
                .WithMany()
                .HasForeignKey(pr => pr.ProductId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_product_reviews_product_id");
            
            entity.HasIndex(pr => new { pr.ProductId, pr.IsApproved })
                .HasDatabaseName("ix_product_reviews_product_id_approved");
                
            entity.HasIndex(pr => pr.Rating)
                .HasDatabaseName("ix_product_reviews_rating");
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
            
            entity.HasIndex(pb => pb.ValidFrom)
                .HasDatabaseName("ix_product_bundles_valid_from");
                
            entity.HasIndex(pb => pb.ValidTo)
                .HasDatabaseName("ix_product_bundles_valid_to");
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

            // Partial index: chỉ 1 primary per product (đảm bảo ở tầng ứng dụng, đây là index tăng tốc query "ảnh chính")
            entity.HasIndex(m => m.ProductId)
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
