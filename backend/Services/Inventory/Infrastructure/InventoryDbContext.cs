using Microsoft.EntityFrameworkCore;
using InventoryModule.Domain;
using BuildingBlocks.Database;

namespace InventoryModule.Infrastructure;

public partial class InventoryDbContext : DbContext
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
    public DbSet<Warehouse> Warehouses { get; set; }
    public DbSet<SerialNumber> SerialNumbers { get; set; }
    public DbSet<StockMovement> StockMovements { get; set; }
    public DbSet<GoodsReceivedNote> GoodsReceivedNotes { get; set; }
    public DbSet<GRNItem> GRNItems { get; set; }
    public DbSet<DeliveryNote> DeliveryNotes { get; set; }
    public DbSet<DNItem> DNItems { get; set; }
    public DbSet<InventoryCountSession> InventoryCountSessions { get; set; }
    public DbSet<InventoryCountItem> InventoryCountItems { get; set; }

    // Phase 05 luồng A — quy trình mua hàng chuyên nghiệp
    public DbSet<POApprovalRule> POApprovalRules { get; set; }
    public DbSet<POApprovalRequest> POApprovalRequests { get; set; }
    public DbSet<PurchaseRequisition> PurchaseRequisitions { get; set; }
    public DbSet<PurchaseRequisitionItem> PurchaseRequisitionItems { get; set; }
    public DbSet<RequestForQuotation> RequestForQuotations { get; set; }
    public DbSet<SupplierQuotation> SupplierQuotations { get; set; }
    public DbSet<SupplierQuotationItem> SupplierQuotationItems { get; set; }
    public DbSet<PurchaseReturn> PurchaseReturns { get; set; }
    public DbSet<PurchaseReturnItem> PurchaseReturnItems { get; set; }
    public DbSet<LandedCost> LandedCosts { get; set; }

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
            // W1-11: xmin - Inventory là NGUỒN SỰ THẬT của tồn kho. Hai lần trừ tồn đồng thời
            // (checkout song song) phải bị EF phát hiện thay vì mất một lần trừ.
            entity.UseXminAsConcurrencyToken();
            entity.Property(e => e.AverageCost).HasPrecision(18, 2);

            // Indexes for common queries
            entity.HasIndex(e => new { e.ProductId, e.WarehouseId })
                .HasDatabaseName("IX_Inventory_Product_Warehouse");

            // Unique per biến thể trong 1 kho: chặn tạo trùng InventoryItem.
            // Partial index WHERE VariantId IS NOT NULL — an toàn với cả Postgres < 15,
            // và không ràng buộc cho hàng cũ không có biến thể (VariantId=null).
            entity.HasIndex(e => new { e.ProductId, e.VariantId, e.WarehouseId })
                .IsUnique()
                .HasFilter("\"VariantId\" IS NOT NULL")
                .HasDatabaseName("IX_Inventory_Product_Variant_Warehouse_Unique");

            entity.HasIndex(e => new { e.QuantityOnHand, e.IsActive })
                .HasFilter("\"QuantityOnHand\" <= \"LowStockThreshold\"")
                .HasDatabaseName("IX_Inventory_LowStock");

            entity.HasIndex(e => e.Barcode)
                .HasDatabaseName("IX_Inventory_Barcode");

            entity.HasIndex(e => e.BatchNumber)
                .HasDatabaseName("IX_Inventory_BatchNumber");

            // W1-11 / audit db-schema-migrations-12: lọc tồn theo kho không có index riêng.
            entity.HasIndex(e => e.WarehouseId)
                .HasDatabaseName("IX_Inventory_WarehouseId");

            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_InventoryItems_QuantityOnHand_NonNegative", "\"QuantityOnHand\" >= 0");
                t.HasCheckConstraint("CK_InventoryItems_ReservedQuantity_NonNegative", "\"ReservedQuantity\" >= 0");
                // Không bao giờ giữ chỗ nhiều hơn số đang có trong kho.
                t.HasCheckConstraint(
                    "CK_InventoryItems_Reserved_LteOnHand",
                    "\"ReservedQuantity\" <= \"QuantityOnHand\"");
                t.HasCheckConstraint("CK_InventoryItems_AverageCost_NonNegative", "\"AverageCost\" >= 0");
                t.HasCheckConstraint("CK_InventoryItems_ReorderQuantity_NonNegative", "\"ReorderQuantity\" >= 0");
            });
        });

        // Cấu hình phía mua hàng (NCC, PO, duyệt PO, PR, RFQ, báo giá, trả hàng NCC,
        // phiếu nhập, phiếu xuất, landed cost) nằm ở InventoryDbContextPurchasing.cs —
        // W2-12 sở hữu các aggregate đó, và file này đã vượt 200 dòng.
        ConfigurePurchasing(modelBuilder);

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

            // W2-5: phiếu điều chỉnh có quy trình thật (lý do bắt buộc, duyệt bởi người khác, ghi sổ).
            entity.Property(e => e.AdjustmentNumber).IsRequired().HasMaxLength(30);
            entity.Property(e => e.Reason).IsRequired().HasMaxLength(500);
            entity.Property(e => e.AdjustedBy).HasMaxLength(100);
            entity.Property(e => e.ApprovedBy).HasMaxLength(100);
            entity.Property(e => e.RejectionReason).HasMaxLength(1000);
            entity.HasMany(e => e.Items).WithOne().HasForeignKey(i => i.StockAdjustmentId);
        });

        modelBuilder.Entity<StockAdjustmentItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ProductName).HasMaxLength(300);
            entity.Property(e => e.ProductSku).HasMaxLength(50);
            entity.HasIndex(e => e.InventoryItemId).HasDatabaseName("IX_StockAdjustmentItem_InventoryItem");
            entity.ToTable(t => t.HasCheckConstraint(
                "CK_StockAdjustmentItems_QuantityAfter_NonNegative", "\"QuantityAfter\" >= 0"));
        });

        modelBuilder.Entity<StockReservation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ReferenceId);
            entity.HasIndex(e => new { e.ProductId, e.InventoryItemId, e.Status });
            entity.HasIndex(e => e.ExpiresAt);
            // Index theo (ProductId, VariantId) — tra reservation của 1 biến thể cụ thể.
            entity.HasIndex(e => new { e.ProductId, e.VariantId, e.Status })
                .HasFilter("\"VariantId\" IS NOT NULL")
                .HasDatabaseName("IX_StockReservation_Product_Variant_Status");
            // >= 0 chứ không > 0: CSDL đang chạy có 2 reservation Released với Quantity = 0.
            entity.ToTable(t =>
                t.HasCheckConstraint("CK_StockReservations_Quantity_NonNegative", "\"Quantity\" >= 0"));
        });

        modelBuilder.Entity<Warehouse>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Address).HasMaxLength(300);
            entity.Property(e => e.City).HasMaxLength(100);
            entity.Property(e => e.District).HasMaxLength(100);
            entity.Property(e => e.Ward).HasMaxLength(100);
            entity.Property(e => e.Phone).HasMaxLength(20);
            entity.Property(e => e.ManagerName).HasMaxLength(100);
            entity.Property(e => e.ManagerEmail).HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.HasIndex(e => e.Code).IsUnique().HasDatabaseName("IX_Warehouse_Code");
            // D09: đúng MỘT kho mặc định. Partial unique index thay cho index thường cũ.
            entity.HasIndex(e => e.IsDefault)
                .IsUnique()
                .HasFilter("\"IsDefault\"")
                .HasDatabaseName("IX_Warehouse_Default");
            entity.ToTable(t =>
                t.HasCheckConstraint("CK_Warehouses_Capacity_NonNegative", "\"Capacity\" >= 0"));
        });

        modelBuilder.Entity<SerialNumber>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Serial).IsRequired().HasMaxLength(100);
            entity.Property(e => e.ProductName).HasMaxLength(300);
            entity.Property(e => e.ProductSku).HasMaxLength(50);
            entity.Property(e => e.CustomerId).HasMaxLength(50);
            entity.Property(e => e.Notes).HasMaxLength(2000);
            entity.HasIndex(e => e.Serial).IsUnique().HasDatabaseName("IX_Serial_Number");
            entity.HasIndex(e => new { e.ProductId, e.Status }).HasDatabaseName("IX_Serial_Product_Status");
            // W2-5 dựng sẵn cho W2-12: truy từ serial về đúng dòng GRN đã nhập nó (giá vốn, lô hàng).
            entity.HasIndex(e => e.GoodsReceivedNoteItemId).HasDatabaseName("IX_Serial_GRNItem");
            entity.HasIndex(e => e.WarehouseId).HasDatabaseName("IX_Serial_Warehouse");
            entity.HasIndex(e => e.OrderId).HasDatabaseName("IX_Serial_Order");
            entity.HasIndex(e => e.Status).HasDatabaseName("IX_Serial_Status");
        });

        modelBuilder.Entity<StockMovement>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Reason).HasMaxLength(500);
            entity.Property(e => e.ReferenceId).HasMaxLength(100);
            entity.Property(e => e.ReferenceType).HasMaxLength(50);
            entity.Property(e => e.PerformedBy).HasMaxLength(100);
            entity.Property(e => e.Notes).HasMaxLength(2000);
            entity.Property(e => e.DocumentReference).HasMaxLength(50);
            entity.HasIndex(e => new { e.ProductId, e.MovementDate }).HasDatabaseName("IX_StockMovement_Product_Date");
            entity.HasIndex(e => e.Type).HasDatabaseName("IX_StockMovement_Type");
            entity.HasIndex(e => e.ReferenceId).HasDatabaseName("IX_StockMovement_Reference");
            // W1-11: sổ cái tồn kho luôn được đọc theo InventoryItem (W2-5 dựng ledger trên đây).
            // KHÔNG đặt CHECK cho Quantity: phiếu xuất ghi số âm một cách hợp lệ.
            entity.HasIndex(e => e.InventoryItemId).HasDatabaseName("IX_StockMovement_InventoryItemId");

            // W2-5: bút toán mang theo kho, biến thể, mã lý do, giá vốn và tồn sau bút toán.
            entity.Property(e => e.ReasonCode).HasConversion<int>();
            entity.Property(e => e.UnitCost).HasPrecision(18, 2);
            entity.HasIndex(e => new { e.WarehouseId, e.MovementDate })
                .HasDatabaseName("IX_StockMovement_Warehouse_Date");
            entity.HasIndex(e => e.ReasonCode).HasDatabaseName("IX_StockMovement_ReasonCode");
            entity.ToTable(t => t.HasCheckConstraint(
                "CK_StockMovements_UnitCost_NonNegative", "\"UnitCost\" >= 0"));
        });

        modelBuilder.Entity<InventoryCountSession>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.DocumentNumber).IsRequired().HasMaxLength(30);
            entity.Property(e => e.ApprovedBy).HasMaxLength(100);
            entity.Property(e => e.Notes).HasMaxLength(2000);
            entity.HasIndex(e => e.DocumentNumber).IsUnique().HasDatabaseName("IX_CountSession_DocumentNumber");
            entity.HasIndex(e => e.Status).HasDatabaseName("IX_CountSession_Status");
            entity.HasMany(e => e.Items).WithOne().HasForeignKey(i => i.CountSessionId);
        });

        modelBuilder.Entity<InventoryCountItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ProductName).HasMaxLength(300);
            entity.Property(e => e.CountedBy).HasMaxLength(100);
            entity.Property(e => e.Notes).HasMaxLength(500);
            entity.Ignore(e => e.Variance); // Computed property
            // W2-5: dòng kiểm kê ghim đúng dòng tồn đã đếm (sản phẩm + biến thể + kho).
            entity.HasIndex(e => e.InventoryItemId).HasDatabaseName("IX_CountItem_InventoryItem");
        });

        // W1-11 / audit db-schema-migrations-07: module này chưa từng gọi
        // ConfigureCommonColumnProperties nên model của Npgsql 8 đòi timestamptz cho mọi cột
        // DateTime, trong khi CSDL thật là `timestamp without time zone`. Ghim lại đúng thực tế;
        // chuyển đổi hàng loạt sang timestamptz nằm trong backlog.
        PostgreSQLConfig.ConfigureCommonColumnProperties(modelBuilder);
    }
}
