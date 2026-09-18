using Microsoft.EntityFrameworkCore;
using Warranty.Domain;
using BuildingBlocks.Database;

namespace Warranty.Infrastructure;

public class WarrantyDbContext : DbContext
{
    public WarrantyDbContext(DbContextOptions<WarrantyDbContext> options) : base(options)
    {
    }

    public DbSet<WarrantyPolicy> Policies { get; set; }
    public DbSet<WarrantyClaim> Claims { get; set; }
    public DbSet<ProductWarranty> ProductWarranties { get; set; }

    // Phase 07
    public DbSet<WarrantyRma> Rmas { get; set; }
    public DbSet<LoanerDevice> LoanerDevices { get; set; }
    public DbSet<WarrantySlaPolicy> SlaPolicies { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<WarrantyPolicy>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Provider).HasConversion<int>();
            entity.Property(e => e.Exclusions).HasColumnType("text"); // JSON array as text
            // D08 §2/§4: 1 policy active / (CategoryId, Provider) — CategoryId NULL = DEFAULT toàn hệ thống.
            entity.HasIndex(e => new { e.CategoryId, e.Provider })
                .IsUnique()
                .HasFilter("\"IsActive\" = true")
                .HasDatabaseName("IX_Policies_CategoryId_Provider_Active");
        });

        modelBuilder.Entity<WarrantyClaim>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ClaimType).HasConversion<int?>();
            // W1-11 / audit db-schema-migrations-12: bảng Claims chỉ có khoá chính, mọi màn
            // hình tra bảo hành theo khách hàng / trạng thái đều quét toàn bảng.
            entity.HasIndex(e => e.CustomerId).HasDatabaseName("IX_Claims_CustomerId");
            entity.HasIndex(e => new { e.Status, e.CreatedAt }).HasDatabaseName("IX_Claims_Status_CreatedAt");
            entity.HasIndex(e => e.WorkOrderId).HasDatabaseName("IX_Claims_WorkOrderId");
            entity.HasIndex(e => e.RmaId).HasDatabaseName("IX_Claims_RmaId");
        });

        modelBuilder.Entity<ProductWarranty>(entity =>
        {
            entity.HasKey(e => e.Id);
            // Bỏ Unique(SerialNumber) — Phase 07: 1 máy có 2 warranty song song (Manufacturer + Store).
            entity.HasIndex(e => new { e.SerialNumber, e.Provider }).IsUnique();
            entity.Property(e => e.Provider).HasConversion<int>();
            // W1-11 / audit db-schema-migrations-12: 3 khoá ngoại nóng chưa có index.
            entity.HasIndex(e => e.CustomerId).HasDatabaseName("IX_ProductWarranties_CustomerId");
            entity.HasIndex(e => e.ProductId).HasDatabaseName("IX_ProductWarranties_ProductId");
            entity.HasIndex(e => e.SerialNumberId).HasDatabaseName("IX_ProductWarranties_SerialNumberId");
        });

        modelBuilder.Entity<WarrantyRma>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.RmaNumber).IsRequired().HasMaxLength(50);
            entity.HasIndex(e => e.RmaNumber).IsUnique();
            entity.Property(e => e.Status).HasConversion<int>();
            entity.Property(e => e.ItemsJson).HasColumnType("text");
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.SupplierId);
        });

        modelBuilder.Entity<LoanerDevice>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasConversion<int>();
            entity.HasIndex(e => e.SerialNumberId);
            entity.HasIndex(e => e.WarrantyClaimId);
            entity.HasIndex(e => e.CustomerId);
        });

        modelBuilder.Entity<WarrantySlaPolicy>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ClaimType).HasConversion<int>();
            entity.HasIndex(e => e.ClaimType).IsUnique();
            entity.ToTable(t => t.HasCheckConstraint(
                "CK_SlaPolicies_WarningAtPercent_Range",
                "\"WarningAtPercent\" >= 0 AND \"WarningAtPercent\" <= 100"));
        });

        // W1-11 / audit db-schema-migrations-07: module này chưa gọi
        // ConfigureCommonColumnProperties nên model của Npgsql 8 đòi timestamptz cho mọi cột
        // DateTime, trong khi CSDL thật là `timestamp without time zone`. Ghim lại đúng thực tế.
        PostgreSQLConfig.ConfigureCommonColumnProperties(modelBuilder);
    }
}
