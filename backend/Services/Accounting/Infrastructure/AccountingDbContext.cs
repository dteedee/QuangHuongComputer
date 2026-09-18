using Accounting.Domain;
using BuildingBlocks.Database;
using Microsoft.EntityFrameworkCore;

namespace Accounting.Infrastructure;

/// <summary>
/// W2-14: cấu hình từng aggregate đã tách sang <c>Infrastructure/Configurations/*.cs</c>
/// (file này từng dài 276 dòng). Thêm entity mới = thêm một
/// <see cref="IEntityTypeConfiguration{TEntity}"/>, không sửa file này.
/// </summary>
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
    public DbSet<CreditNote> CreditNotes { get; set; }
    public DbSet<CashVoucher> CashVouchers { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AccountingDbContext).Assembly);

        // W1-11 / audit db-schema-migrations-07: module này chưa từng gọi
        // ConfigureCommonColumnProperties nên model mặc định của Npgsql 8 đòi timestamptz
        // cho mọi cột DateTime, trong khi CSDL thật là `timestamp without time zone`.
        // Ghim lại đúng thực tế; việc chuyển đổi hàng loạt sang timestamptz nằm trong backlog.
        PostgreSQLConfig.ConfigureCommonColumnProperties(modelBuilder);
    }
}
