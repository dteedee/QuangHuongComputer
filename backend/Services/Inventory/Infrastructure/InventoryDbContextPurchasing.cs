using Microsoft.EntityFrameworkCore;
using InventoryModule.Domain;

namespace InventoryModule.Infrastructure;

/// <summary>
/// Nửa "mua hàng" của model Inventory: nhà cung cấp, đơn mua + duyệt, đề nghị mua, RFQ, báo giá,
/// trả hàng NCC, phiếu nhập/xuất và landed cost.
///
/// <para>
/// Tách khỏi <c>InventoryDbContext.cs</c> (W2-5) vì file gốc đã 535 dòng và vì các aggregate ở đây
/// thuộc quyền sở hữu của W2-12 — chia file theo đúng đường biên sở hữu thì hai track không giẫm
/// chân nhau. KHÔNG đổi một dòng cấu hình nào: model sinh ra phải y hệt (kiểm bằng
/// <c>dotnet ef migrations has-pending-model-changes</c>).
/// </para>
/// </summary>
public partial class InventoryDbContext
{
    private static void ConfigurePurchasing(ModelBuilder modelBuilder)
    {
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
                // W2-5 dựng sẵn cột cho W2-12: số đã nhận theo từng dòng PO, để GRN đặt được
                // PartialReceived/Received. Khai báo dạng shadow property vì Domain/PurchaseOrder.cs
                // thuộc quyền sở hữu của W2-12 — W2-12 nâng thành property thật khi dùng tới.
                item.Property<int>("ReceivedQuantity").HasDefaultValue(0);
                // Hai ràng buộc Quantity/UnitPrice được thêm dưới dạng NOT VALID trong migration:
                // CSDL đang chạy còn 1 dòng rác của agent kiểm toán (Id=1, Quantity=-10, UnitPrice=-5).
                // Dòng mới bị chặn ngay; VALIDATE chạy sau khi D03 dọn dữ liệu thử.
                item.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_PurchaseOrderItem_Quantity_Positive", "\"Quantity\" > 0");
                    t.HasCheckConstraint("CK_PurchaseOrderItem_UnitPrice_NonNegative", "\"UnitPrice\" >= 0");
                    t.HasCheckConstraint("CK_PurchaseOrderItem_ReceivedQuantity_NonNegative",
                        "\"ReceivedQuantity\" >= 0");
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
            // W2-5 dựng sẵn cho W2-12: khoá ngoại THẬT về đơn mua. Cột đã có từ trước nhưng không
            // có ràng buộc, nên một GRN có thể trỏ tới PO không tồn tại và "đã nhận bao nhiêu của
            // đơn này" sẽ đếm thiếu. Restrict: xoá PO đã có phiếu nhập là lỗi nghiệp vụ, không phải
            // dây chuyền xoá dữ liệu kho.
            entity.HasOne<PurchaseOrder>()
                .WithMany()
                .HasForeignKey(e => e.PurchaseOrderId)
                .OnDelete(DeleteBehavior.Restrict);
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
    }
}
