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
        });

        // Category configurations
        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("Categories");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Name).IsRequired().HasMaxLength(100);
            entity.Property(c => c.Description).HasColumnType("text");
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
    }
}
