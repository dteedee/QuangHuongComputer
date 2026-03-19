using Microsoft.EntityFrameworkCore;
using Accounting.Domain;

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
            });

            // Payment is an owned type (embedded in Invoice table)
            entity.OwnsMany(e => e.Payments, payment =>
            {
                payment.WithOwner().HasForeignKey("InvoiceId");
                payment.HasKey(p => p.Id);
                payment.Property(p => p.Amount).HasPrecision(18, 2);
            });

            // PaymentApplication is a standalone entity with relationship
            entity.HasMany(e => e.PaymentApplications)
                .WithOne()
                .HasForeignKey(e => e.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);
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
        });

        modelBuilder.Entity<PaymentApplication>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.HasIndex(e => e.PaymentIntentId);
            entity.HasIndex(e => e.InvoiceId);
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
        });
    }
}
