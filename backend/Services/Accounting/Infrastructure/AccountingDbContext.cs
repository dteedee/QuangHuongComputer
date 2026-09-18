using Microsoft.EntityFrameworkCore;
using Accounting.Domain;
using BuildingBlocks.Database;

namespace Accounting.Infrastructure;

public class AccountingDbContext : DbContext
{
    public AccountingDbContext(DbContextOptions<AccountingDbContext> options) : base(options)
    {
    }

    public DbSet<OrganizationAccount> Accounts { get; set; }
    public DbSet<Invoice> Invoices { get; set; }
    public DbSet<ShiftSession> ShiftSessions { get; set; }
    public DbSet<PaymentApplication> PaymentApplications { get; set; }
    public DbSet<Expense> Expenses { get; set; }
    public DbSet<ExpenseCategory> ExpenseCategories { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<OrganizationAccount>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Balance).HasPrecision(18, 2);
            entity.Property(e => e.CreditLimit).HasPrecision(18, 2);
            
            entity.OwnsMany(e => e.Entries, entry =>
            {
                entry.WithOwner().HasForeignKey("OrganizationAccountId");
                entry.HasKey(en => en.Id);
                entry.Property(en => en.Amount).HasPrecision(18, 2);
                entry.Property(en => en.ExchangeRate).HasPrecision(18, 4);
            });
        });

        modelBuilder.Entity<Invoice>(entity =>
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

            entity.OwnsMany(e => e.Lines, line =>
            {
                line.WithOwner().HasForeignKey("InvoiceId");
                line.HasKey(l => l.Id);
                line.Property(l => l.Quantity).HasPrecision(18, 4);
                line.Property(l => l.UnitPrice).HasPrecision(18, 2);
                line.Property(l => l.VatRate).HasPrecision(18, 2);
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
        });

        modelBuilder.Entity<ShiftSession>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.OpeningBalance).HasPrecision(18, 2);
            entity.Property(e => e.ClosingBalance).HasPrecision(18, 2);

            entity.OwnsMany(e => e.Transactions, transaction =>
            {
                transaction.WithOwner().HasForeignKey("ShiftSessionId");
                transaction.HasKey(t => t.Id);
                transaction.Property(t => t.Amount).HasPrecision(18, 2);
            });

            entity.HasIndex(e => new { e.CashierId, e.WarehouseId, e.OpenedAt, e.Status })
                .HasDatabaseName("IX_ShiftSession_UniqueOpenShift");

            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_ShiftSessions_OpeningBalance_NonNegative", "\"OpeningBalance\" >= 0");
                t.HasCheckConstraint(
                    "CK_ShiftSessions_ClosingBalance_NonNegative",
                    "\"ClosingBalance\" IS NULL OR \"ClosingBalance\" >= 0");
            });
        });

        modelBuilder.Entity<PaymentApplication>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.HasIndex(e => e.PaymentIntentId);
            entity.HasIndex(e => e.InvoiceId);
            entity.ToTable(t =>
                t.HasCheckConstraint("CK_PaymentApplications_Amount_NonNegative", "\"Amount\" >= 0"));
        });

        modelBuilder.Entity<ExpenseCategory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Code).HasMaxLength(50).IsRequired();
            entity.HasIndex(e => e.Code).IsUnique();
        });

        modelBuilder.Entity<Expense>(entity =>
        {
            entity.HasKey(e => e.Id);
            // W1-11: xmin - duyệt/chi cùng lúc trên một khoản chi phải bị phát hiện.
            entity.UseXminAsConcurrencyToken();
            entity.Property(e => e.ExpenseNumber).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500).IsRequired();
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.VatAmount).HasPrecision(18, 2);
            entity.Property(e => e.TotalAmount).HasPrecision(18, 2);
            entity.HasIndex(e => e.ExpenseNumber).IsUnique();
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.ExpenseDate);

            entity.HasOne(e => e.Category)
                .WithMany()
                .HasForeignKey(e => e.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.SupplierId).HasDatabaseName("IX_Expenses_SupplierId");
            entity.HasIndex(e => e.EmployeeId).HasDatabaseName("IX_Expenses_EmployeeId");
            entity.HasIndex(e => e.CategoryId).HasDatabaseName("IX_Expenses_CategoryId");

            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Expenses_Amount_NonNegative", "\"Amount\" >= 0");
                t.HasCheckConstraint("CK_Expenses_VatAmount_NonNegative", "\"VatAmount\" >= 0");
                t.HasCheckConstraint("CK_Expenses_TotalAmount_NonNegative", "\"TotalAmount\" >= 0");
            });
        });

        // W1-11 / audit db-schema-migrations-07: module này chưa từng gọi
        // ConfigureCommonColumnProperties nên model mặc định của Npgsql 8 đòi timestamptz
        // cho mọi cột DateTime, trong khi CSDL thật là `timestamp without time zone`.
        // Ghim lại đúng thực tế; việc chuyển đổi hàng loạt sang timestamptz nằm trong backlog.
        PostgreSQLConfig.ConfigureCommonColumnProperties(modelBuilder);
    }
}
