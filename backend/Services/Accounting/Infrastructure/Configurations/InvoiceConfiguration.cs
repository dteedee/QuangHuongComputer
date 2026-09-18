using Accounting.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Accounting.Infrastructure.Configurations;

/// <summary>Hoá đơn, dòng hoá đơn, phiếu thu/chi gắn hoá đơn và các index tra cứu nóng.</summary>
public class InvoiceConfiguration : IEntityTypeConfiguration<Invoice>
{
    public void Configure(EntityTypeBuilder<Invoice> entity)
    {
        entity.HasKey(e => e.Id);
        // W1-11: xmin làm concurrency token - hai lần ghi đồng thời lên cùng hoá đơn
        // (ví dụ ghi nhận thanh toán) sẽ bị EF phát hiện thay vì ghi đè lặng lẽ.
        entity.UseXminAsConcurrencyToken();
        entity.Property(e => e.SubTotal).HasPrecision(18, 2);
        entity.Property(e => e.VatRate).HasPrecision(18, 2);
        entity.Property(e => e.VatAmount).HasPrecision(18, 2);
        entity.Property(e => e.TotalAmount).HasPrecision(18, 2);
        entity.Property(e => e.PaidAmount).HasPrecision(18, 2);

        // W2-14 verify: khoá Guid do domain tự sinh. Không có ValueGeneratedNever, EF coi dòng con mới
        // thêm vào một gốc ĐÃ lưu là "Modified" → UPDATE 0 dòng → DbUpdateConcurrencyException
        // (đã tái hiện trên Postgres: ghi nhận thanh toán cho hoá đơn đã tồn tại luôn hỏng).
        entity.OwnsMany(e => e.Lines, line =>
        {
            line.WithOwner().HasForeignKey("InvoiceId");
            line.HasKey(l => l.Id);
            line.Property(l => l.Id).ValueGeneratedNever();
            line.Property(l => l.Quantity).HasPrecision(18, 4);
            line.Property(l => l.UnitPrice).HasPrecision(18, 2);
            line.Property(l => l.VatRate).HasPrecision(18, 2);
            // W2-14/D01: các con số này được LƯU, không tính lại khi đọc — chỉ có lưu
            // mới đảm bảo Σ(net + vat) khớp tuyệt đối tổng đơn hàng.
            line.Property(l => l.GrossBeforeDiscount).HasPrecision(18, 2);
            line.Property(l => l.LineDiscount).HasPrecision(18, 2);
            line.Property(l => l.GrossAmount).HasPrecision(18, 2);
            line.Property(l => l.NetAmount).HasPrecision(18, 2);
            line.Property(l => l.VatAmount).HasPrecision(18, 2);
            line.Property(l => l.Sku).HasMaxLength(100);
            line.Property(l => l.UnitName).HasMaxLength(50);
            line.Property(l => l.Note).HasMaxLength(500);
            line.ToTable(t =>
            {
                t.HasCheckConstraint("CK_InvoiceLine_Quantity_Positive", "\"Quantity\" > 0");
                t.HasCheckConstraint("CK_InvoiceLine_UnitPrice_NonNegative", "\"UnitPrice\" >= 0");
                t.HasCheckConstraint("CK_InvoiceLine_VatRate_Percent", "\"VatRate\" >= 0 AND \"VatRate\" <= 100");
            });
        });

        // Payment is an owned type (embedded in Invoice table)
        entity.OwnsMany(e => e.Payments, payment =>
        {
            payment.WithOwner().HasForeignKey("InvoiceId");
            payment.HasKey(p => p.Id);
            payment.Property(p => p.Id).ValueGeneratedNever();
            payment.Property(p => p.Amount).HasPrecision(18, 2);
            payment.ToTable(t =>
                t.HasCheckConstraint("CK_Payment_Amount_NonNegative", "\"Amount\" >= 0"));
        });

        // PaymentApplication is a standalone entity with relationship
        entity.HasMany(e => e.PaymentApplications)
            .WithOne()
            .HasForeignKey(e => e.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        // W1-11: số hoá đơn phải là duy nhất (audit db-schema-migrations-11).
        entity.HasIndex(e => e.InvoiceNumber)
            .IsUnique()
            .HasDatabaseName("IX_Invoices_InvoiceNumber_Unique");

        // W1-11: các cột lọc/nối nóng chưa có index (audit db-schema-migrations-12).
        // W2-14: một đơn hàng chỉ được có ĐÚNG MỘT hoá đơn. Unique index là lớp chống trùng
        // thứ hai: hai consumer chạy song song đều qua được bước kiểm tra ở tầng ứng dụng.
        entity.HasIndex(e => e.OrderId)
            .IsUnique()
            .HasFilter("\"OrderId\" IS NOT NULL")
            .HasDatabaseName("IX_Invoices_OrderId_Unique");
        // W2-14 verify (lần 3): đường AP còn hở đúng cái lỗ mà đường bán hàng đã bịt.
        // POReceivedConsumer chỉ kiểm tra ở TẦNG ỨNG DỤNG (PurchaseOrderId, GoodsReceiptId);
        // hai lần giao cùng một POReceivedEvent (MassTransit retry / GRN xác nhận hai lần) đều
        // qua được bước đó và tạo HAI hoá đơn mua vào → nợ nhà cung cấp bị nhân đôi.
        // Lọc theo NOT NULL để mọi hoá đơn bán ra / lập tay (hai cột NULL) không đụng nhau.
        entity.HasIndex(e => new { e.PurchaseOrderId, e.GoodsReceiptId })
            .IsUnique()
            .HasFilter("\"PurchaseOrderId\" IS NOT NULL AND \"GoodsReceiptId\" IS NOT NULL")
            .HasDatabaseName("IX_Invoices_PO_GRN_Unique");

        entity.Property(e => e.OrderNumber).HasMaxLength(50);
        entity.Property(e => e.BuyerType).HasMaxLength(20);
        entity.Property(e => e.BuyerLegalName).HasMaxLength(255);
        entity.Property(e => e.BuyerFullName).HasMaxLength(255);
        entity.Property(e => e.BuyerTaxCode).HasMaxLength(20);
        entity.Property(e => e.BuyerBudgetUnitCode).HasMaxLength(20);
        entity.Property(e => e.BuyerAddress).HasMaxLength(500);
        entity.Property(e => e.BuyerEmail).HasMaxLength(255);
        entity.Property(e => e.BuyerPhone).HasMaxLength(20);

        entity.HasIndex(e => e.CustomerId).HasDatabaseName("IX_Invoices_CustomerId");
        entity.HasIndex(e => e.SupplierId).HasDatabaseName("IX_Invoices_SupplierId");
        entity.HasIndex(e => e.PurchaseOrderId).HasDatabaseName("IX_Invoices_PurchaseOrderId");
        entity.HasIndex(e => e.OrganizationAccountId).HasDatabaseName("IX_Invoices_OrganizationAccountId");
        entity.HasIndex(e => new { e.Status, e.DueDate }).HasDatabaseName("IX_Invoices_Status_DueDate");

        entity.ToTable(t =>
        {
            t.HasCheckConstraint("CK_Invoices_SubTotal_NonNegative", "\"SubTotal\" >= 0");
            t.HasCheckConstraint("CK_Invoices_VatAmount_NonNegative", "\"VatAmount\" >= 0");
            t.HasCheckConstraint("CK_Invoices_TotalAmount_NonNegative", "\"TotalAmount\" >= 0");
            t.HasCheckConstraint("CK_Invoices_PaidAmount_NonNegative", "\"PaidAmount\" >= 0");
            // VatRate ở đây là PHẦN TRĂM (VatAmount = LineTotal * VatRate / 100, Invoice.cs:315)
            t.HasCheckConstraint("CK_Invoices_VatRate_Percent", "\"VatRate\" >= 0 AND \"VatRate\" <= 100");
            t.HasCheckConstraint("CK_Invoices_PaidAmount_LteTotal", "\"PaidAmount\" <= \"TotalAmount\"");
        });
    }
}
