using Accounting.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Accounting.Infrastructure.Configurations;

/// <summary>Tài khoản công nợ khách doanh nghiệp + sổ cái phát sinh.</summary>
public class OrganizationAccountConfiguration : IEntityTypeConfiguration<OrganizationAccount>
{
    public void Configure(EntityTypeBuilder<OrganizationAccount> entity)
    {
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Balance).HasPrecision(18, 2);
        entity.Property(e => e.CreditLimit).HasPrecision(18, 2);
        
        entity.OwnsMany(e => e.Entries, entry =>
        {
            entry.WithOwner().HasForeignKey("OrganizationAccountId");
            entry.HasKey(en => en.Id);
            entry.Property(en => en.Id).ValueGeneratedNever();
            entry.Property(en => en.Amount).HasPrecision(18, 2);
            entry.Property(en => en.ExchangeRate).HasPrecision(18, 4);
        });
    }
}
