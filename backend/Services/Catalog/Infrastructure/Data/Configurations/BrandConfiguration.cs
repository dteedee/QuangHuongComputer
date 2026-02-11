using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Catalog.Domain;

namespace Catalog.Infrastructure.Data.Configurations;

public class BrandConfiguration : IEntityTypeConfiguration<Brand>
{
    public void Configure(EntityTypeBuilder<Brand> builder)
    {
        builder.ToTable("Brands");

        builder.HasKey(b => b.Id);

        builder.Property(b => b.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(b => b.Description)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(b => b.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(b => b.DeactivatedAt)
            .IsRequired(false);

        builder.Property(b => b.DeactivatedBy)
            .HasMaxLength(100)
            .IsRequired(false);

        // Index for active brands
        builder.HasIndex(b => new { b.Name, b.IsActive })
            .IsUnique()
            .HasFilter("[IsActive] = 1");

        // Index for deactivated brands
        builder.HasIndex(b => b.DeactivatedAt);
    }
}
