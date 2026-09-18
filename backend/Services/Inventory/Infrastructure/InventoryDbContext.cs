using Microsoft.EntityFrameworkCore;
using InventoryModule.Domain;
using BuildingBlocks.Database;

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
            entity.Property(e => e.RejectionReason).HasMaxLength(1000);

            entity.HasIndex(e => new { e.SupplierId, e.CreatedAt })
                .HasDatabaseName("IX_PurchaseOrder_Supplier_Date");

            entity.HasIndex(e => e.Status)
                .HasDatabaseName("IX_PurchaseOrder_Status");

            entity.HasIndex(e => new { e.Status, e.CreatedAt })
                .HasDatabaseName("IX_PurchaseOrder_Status_Created");

            entity.HasIndex(e => e.RequisitionId).HasDatabaseName("IX_PurchaseOrder_Requisition");

            entity.ToTable(t =>
                t.HasCheckConstraint("CK_PurchaseOrders_TotalAmount_NonNegative", "\"TotalAmount\" >= 0"));

            entity.OwnsMany(e => e.Items, item =>
            {
                item.Property(i => i.UnitPrice).HasPrecision(18, 2);
                item.Property(i => i.ProductName).HasMaxLength(300);
                // Hai ràng buộc này được thêm dưới dạng NOT VALID trong migration: CSDL đang
                // chạy còn 1 dòng rác của agent kiểm toán (Id=1, Quantity=-10, UnitPrice=-5).
                // Dòng mới bị chặn ngay; VALIDATE chạy sau khi D03 dọn dữ liệu thử.
                item.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_PurchaseOrderItem_Quantity_Positive", "\"Quantity\" > 0");
                    t.HasCheckConstraint("CK_PurchaseOrderItem_UnitPrice_NonNegative", "\"UnitPrice\" >= 0");
                });
            });
        });

        // === Phase 05 luồng A ===

        modelBuilder.Entity<POApprovalRule>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.RequiredRole).IsRequired().HasMaxLength(50);
            entity.Property(e => e.MinAmount).HasPrecision(18, 2);
            entity.Property(e => e.MaxAmount).HasPrecision(18, 2);
            entity.HasIndex(e => new { e.MinAmount, e.MaxAmount, e.IsActive })
                .HasDatabaseName("IX_POApprovalRule_Amount_Active");
            entity.HasIndex(e => e.SortOrder).HasDatabaseName("IX_POApprovalRule_SortOrder");
        });

        modelBuilder.Entity<POApprovalRequest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.RequiredRole).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Reason).HasMaxLength(1000);
            entity.HasIndex(e => e.PurchaseOrderId).HasDatabaseName("IX_POApprovalRequest_PO");
            entity.HasIndex(e => new { e.Decision, e.CreatedAt })
                .HasDatabaseName("IX_POApprovalRequest_Decision_Created");
        });

        modelBuilder.Entity<PurchaseRequisition>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Number).IsRequired().HasMaxLength(30);
            entity.Property(e => e.RequesterName).HasMaxLength(100);
            entity.Property(e => e.Reason).HasMaxLength(1000);
            entity.Property(e => e.RejectionReason).HasMaxLength(1000);
            entity.Property(e => e.Source).HasMaxLength(30);
            entity.HasIndex(e => e.Number).IsUnique().HasDatabaseName("IX_PR_Number");
            entity.HasIndex(e => new { e.Status, e.CreatedAt })
                .HasDatabaseName("IX_PR_Status_Created");
            entity.HasIndex(e => e.RequestedBy).HasDatabaseName("IX_PR_RequestedBy");
            entity.HasMany(e => e.Items).WithOne().HasForeignKey(i => i.PurchaseRequisitionId);
        });

        modelBuilder.Entity<PurchaseRequisitionItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ProductName).IsRequired().HasMaxLength(300);
            entity.Property(e => e.Notes).HasMaxLength(500);
        });

        modelBuilder.Entity<RequestForQuotation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Number).IsRequired().HasMaxLength(30);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.ItemsJson).HasColumnType("jsonb");
            entity.HasIndex(e => e.Number).IsUnique().HasDatabaseName("IX_RFQ_Number");
            entity.HasIndex(e => new { e.Status, e.CreatedAt })
                .HasDatabaseName("IX_RFQ_Status_Created");
            entity.HasIndex(e => e.RequisitionId).HasDatabaseName("IX_RFQ_Requisition");
        });

        modelBuilder.Entity<SupplierQuotation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.QuotationNumber).HasMaxLength(60);
            entity.Property(e => e.TotalAmount).HasPrecision(18, 2);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.HasIndex(e => new { e.RfqId, e.SupplierId })
                .HasDatabaseName("IX_SQ_Rfq_Supplier");
            entity.HasIndex(e => e.Status).HasDatabaseName("IX_SQ_Status");
            entity.HasMany(e => e.Items).WithOne().HasForeignKey(i => i.QuotationId);
        });

        modelBuilder.Entity<SupplierQuotationItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UnitPrice).HasPrecision(18, 2);
            entity.Property(e => e.Notes).HasMaxLength(500);
            entity.HasIndex(e => e.ProductId).HasDatabaseName("IX_SQI_Product");
        });

        modelBuilder.Entity<PurchaseReturn>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Number).IsRequired().HasMaxLength(30);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.TotalValue).HasPrecision(18, 2);
            entity.Property(e => e.RefundAmount).HasPrecision(18, 2);
            entity.HasIndex(e => e.Number).IsUnique().HasDatabaseName("IX_PurchaseReturn_Number");
            entity.HasIndex(e => new { e.Status, e.CreatedAt })
                .HasDatabaseName("IX_PurchaseReturn_Status_Created");
            entity.HasIndex(e => e.GRNId).HasDatabaseName("IX_PurchaseReturn_GRN");
            entity.HasIndex(e => e.SupplierId).HasDatabaseName("IX_PurchaseReturn_Supplier");
            entity.HasMany(e => e.Items).WithOne().HasForeignKey(i => i.PurchaseReturnId);
        });

        modelBuilder.Entity<PurchaseReturnItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ProductName).IsRequired().HasMaxLength(300);
            entity.Property(e => e.UnitCost).HasPrecision(18, 2);
            entity.Property(e => e.Reason).HasMaxLength(500);
            entity.Property(e => e.SerialNumbers).HasMaxLength(2000);
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
            // W1-11: sổ cái tồn kho luôn được đọc theo InventoryItem (W2-5 sẽ dựng ledger trên đây).
            // KHÔNG đặt CHECK cho Quantity: phiếu xuất ghi số âm một cách hợp lệ.
            entity.HasIndex(e => e.InventoryItemId).HasDatabaseName("IX_StockMovement_InventoryItemId");
        });

        modelBuilder.Entity<GoodsReceivedNote>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.DocumentNumber).IsRequired().HasMaxLength(30);
            entity.Property(e => e.ReceivedBy).HasMaxLength(100);
            entity.Property(e => e.Notes).HasMaxLength(2000);
            // Phase 07: nguồn phiếu nhập (Purchase mặc định, CustomerReturn từ Sales.ReturnRequest).
            entity.Property(e => e.Source).HasConversion<int>();
            entity.HasIndex(e => e.DocumentNumber).IsUnique().HasDatabaseName("IX_GRN_DocumentNumber");
            entity.HasIndex(e => e.Status).HasDatabaseName("IX_GRN_Status");
            entity.HasIndex(e => e.Source).HasDatabaseName("IX_GRN_Source");
            entity.HasMany(e => e.Items).WithOne().HasForeignKey(i => i.GoodsReceivedNoteId);
            // W1-11 / audit db-schema-migrations-12: 3 cột khoá ngoại nóng chưa có index.
            entity.HasIndex(e => e.SupplierId).HasDatabaseName("IX_GRN_SupplierId");
            entity.HasIndex(e => e.WarehouseId).HasDatabaseName("IX_GRN_WarehouseId");
            entity.HasIndex(e => e.PurchaseOrderId).HasDatabaseName("IX_GRN_PurchaseOrderId");
        });

        modelBuilder.Entity<GRNItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ProductName).HasMaxLength(300);
            entity.Property(e => e.UnitCost).HasPrecision(18, 2);
            entity.Property(e => e.SerialNumbers).HasMaxLength(2000);
            entity.Property(e => e.RejectReason).HasMaxLength(500);

            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_GRNItems_Quantity_Positive", "\"Quantity\" > 0");
                t.HasCheckConstraint("CK_GRNItems_AcceptedQty_NonNegative", "\"AcceptedQty\" >= 0");
                t.HasCheckConstraint("CK_GRNItems_RejectedQty_NonNegative", "\"RejectedQty\" >= 0");
                t.HasCheckConstraint("CK_GRNItems_UnitCost_NonNegative", "\"UnitCost\" >= 0");
                // Đạt + loại không bao giờ vượt quá số lượng nhận.
                t.HasCheckConstraint(
                    "CK_GRNItems_Inspected_LteQuantity",
                    "\"AcceptedQty\" + \"RejectedQty\" <= \"Quantity\"");
            });
        });

        modelBuilder.Entity<DeliveryNote>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.DocumentNumber).IsRequired().HasMaxLength(30);
            entity.Property(e => e.DeliveredBy).HasMaxLength(100);
            entity.Property(e => e.Notes).HasMaxLength(2000);
            entity.HasIndex(e => e.DocumentNumber).IsUnique().HasDatabaseName("IX_DN_DocumentNumber");
            entity.HasIndex(e => e.Status).HasDatabaseName("IX_DN_Status");
            entity.HasMany(e => e.Items).WithOne().HasForeignKey(i => i.DeliveryNoteId);
        });

        modelBuilder.Entity<DNItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ProductName).HasMaxLength(300);
            entity.Property(e => e.SerialNumbers).HasMaxLength(2000);
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
        });

        modelBuilder.Entity<LandedCost>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.HasIndex(e => e.GRNId).HasDatabaseName("IX_LandedCost_GRN");
            entity.HasIndex(e => new { e.GRNId, e.IsAllocated })
                .HasDatabaseName("IX_LandedCost_GRN_Allocated");
            entity.ToTable(t =>
                t.HasCheckConstraint("CK_LandedCosts_Amount_NonNegative", "\"Amount\" >= 0"));
        });

        // W1-11 / audit db-schema-migrations-07: module này chưa từng gọi
        // ConfigureCommonColumnProperties nên model của Npgsql 8 đòi timestamptz cho mọi cột
        // DateTime, trong khi CSDL thật là `timestamp without time zone`. Ghim lại đúng thực tế;
        // chuyển đổi hàng loạt sang timestamptz nằm trong backlog.
        PostgreSQLConfig.ConfigureCommonColumnProperties(modelBuilder);
    }
}
