using Microsoft.EntityFrameworkCore;
using InventoryModule.Domain;

namespace InventoryModule.Infrastructure;

public class InventoryDbContext : DbContext
{
    public InventoryDbContext(DbContextOptions<InventoryDbContext> options) : base(options)
    {
    }

    public DbSet<InventoryItem> InventoryItems { get; set; }
    public DbSet<Supplier> Suppliers { get; set; }
    public DbSet<PurchaseOrder> PurchaseOrders { get; set; }
    public DbSet<StockTransfer> StockTransfers { get; set; }
    public DbSet<StockAdjustment> StockAdjustments { get; set; }
    public DbSet<StockReservation> StockReservations { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Soft delete filters
        modelBuilder.Entity<InventoryItem>().HasQueryFilter(e => e.IsActive);
        modelBuilder.Entity<Supplier>().HasQueryFilter(e => e.IsActive);
        modelBuilder.Entity<PurchaseOrder>().HasQueryFilter(e => e.IsActive);
        modelBuilder.Entity<StockTransfer>().HasQueryFilter(e => e.IsActive);
        modelBuilder.Entity<StockAdjustment>().HasQueryFilter(e => e.IsActive);
        modelBuilder.Entity<StockReservation>().HasQueryFilter(e => e.IsActive);

        modelBuilder.Entity<InventoryItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.AverageCost).HasPrecision(18, 2);

            // Indexes for common queries
            entity.HasIndex(e => new { e.ProductId, e.WarehouseId })
                .HasDatabaseName("IX_Inventory_Product_Warehouse");

            entity.HasIndex(e => new { e.QuantityOnHand, e.IsActive })
                .HasFilter("\"QuantityOnHand\" <= \"LowStockThreshold\"")
                .HasDatabaseName("IX_Inventory_LowStock");

            entity.HasIndex(e => e.Barcode)
                .HasDatabaseName("IX_Inventory_Barcode");

            entity.HasIndex(e => e.BatchNumber)
                .HasDatabaseName("IX_Inventory_BatchNumber");
        });

        modelBuilder.Entity<Supplier>(entity =>
        {
            entity.HasKey(e => e.Id);

            // Basic info
            entity.Property(e => e.Code).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.ShortName).HasMaxLength(50);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Website).HasMaxLength(200);
            entity.Property(e => e.LogoUrl).HasMaxLength(500);

            // Business info
            entity.Property(e => e.TaxCode).HasMaxLength(20);
            entity.Property(e => e.BankAccount).HasMaxLength(30);
            entity.Property(e => e.BankName).HasMaxLength(100);
            entity.Property(e => e.BankBranch).HasMaxLength(100);
            entity.Property(e => e.CreditLimit).HasPrecision(18, 2);
            entity.Property(e => e.CurrentDebt).HasPrecision(18, 2);

            // Contact
            entity.Property(e => e.ContactPerson).IsRequired().HasMaxLength(100);
            entity.Property(e => e.ContactTitle).HasMaxLength(50);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Phone).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Fax).HasMaxLength(20);

            // Address
            entity.Property(e => e.Address).IsRequired().HasMaxLength(300);
            entity.Property(e => e.Ward).HasMaxLength(100);
            entity.Property(e => e.District).HasMaxLength(100);
            entity.Property(e => e.City).HasMaxLength(100);
            entity.Property(e => e.Country).HasMaxLength(100);
            entity.Property(e => e.PostalCode).HasMaxLength(20);

            // Notes
            entity.Property(e => e.Notes).HasMaxLength(2000);
            entity.Property(e => e.Categories).HasMaxLength(500);
            entity.Property(e => e.Brands).HasMaxLength(500);

            // Statistics
            entity.Property(e => e.TotalPurchaseAmount).HasPrecision(18, 2);

            // Indexes
            entity.HasIndex(e => e.Code).IsUnique().HasDatabaseName("IX_Supplier_Code");
            entity.HasIndex(e => e.Name).HasDatabaseName("IX_Supplier_Name");
            entity.HasIndex(e => e.TaxCode).HasDatabaseName("IX_Supplier_TaxCode");
            entity.HasIndex(e => e.Email).HasDatabaseName("IX_Supplier_Email");
            entity.HasIndex(e => e.IsActive).HasDatabaseName("IX_Supplier_Active");
            entity.HasIndex(e => e.SupplierType).HasDatabaseName("IX_Supplier_Type");
            entity.HasIndex(e => e.City).HasDatabaseName("IX_Supplier_City");
            entity.HasIndex(e => new { e.CurrentDebt, e.CreditLimit })
                .HasFilter("\"CurrentDebt\" > 0")
                .HasDatabaseName("IX_Supplier_Debt");
        });

        modelBuilder.Entity<PurchaseOrder>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.PONumber).IsUnique();
            entity.Property(e => e.TotalAmount).HasPrecision(18, 2);

            entity.HasIndex(e => new { e.SupplierId, e.CreatedAt })
                .HasDatabaseName("IX_PurchaseOrder_Supplier_Date");

            entity.HasIndex(e => e.Status)
                .HasDatabaseName("IX_PurchaseOrder_Status");

            entity.OwnsMany(e => e.Items, item =>
            {
                item.Property(i => i.UnitPrice).HasPrecision(18, 2);
            });
        });

        modelBuilder.Entity<StockTransfer>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.TransferNumber).IsUnique();

            entity.HasIndex(e => new { e.FromWarehouseId, e.Status })
                .HasDatabaseName("IX_StockTransfer_From_Status");

            entity.HasIndex(e => new { e.ToWarehouseId, e.Status })
                .HasDatabaseName("IX_StockTransfer_To_Status");

            entity.HasIndex(e => e.RequestedAt)
                .HasDatabaseName("IX_StockTransfer_RequestedAt");
        });

        modelBuilder.Entity<StockAdjustment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.AdjustmentNumber).IsUnique();

            entity.HasIndex(e => new { e.WarehouseId, e.AdjustedAt })
                .HasDatabaseName("IX_StockAdjustment_Warehouse_Date");

            entity.HasIndex(e => e.Type)
                .HasDatabaseName("IX_StockAdjustment_Type");

            entity.HasIndex(e => new { e.IsApproved, e.AdjustedAt })
                .HasDatabaseName("IX_StockAdjustment_Approved_Date");
        });

        modelBuilder.Entity<StockReservation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ReferenceId);
            entity.HasIndex(e => new { e.ProductId, e.InventoryItemId, e.Status });
            entity.HasIndex(e => e.ExpiresAt);
        });
    }
}
