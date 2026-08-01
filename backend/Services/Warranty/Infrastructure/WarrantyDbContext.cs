using Microsoft.EntityFrameworkCore;
using Warranty.Domain;

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
        });

        modelBuilder.Entity<WarrantyClaim>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ClaimType).HasConversion<int?>();
        });

        modelBuilder.Entity<ProductWarranty>(entity =>
        {
            entity.HasKey(e => e.Id);
            // Bỏ Unique(SerialNumber) — Phase 07: 1 máy có 2 warranty song song (Manufacturer + Store).
            entity.HasIndex(e => new { e.SerialNumber, e.Provider }).IsUnique();
            entity.Property(e => e.Provider).HasConversion<int>();
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
        });
    }
}
