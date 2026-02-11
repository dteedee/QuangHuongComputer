using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Catalog.Domain;

namespace Catalog.Infrastructure.Data.Configurations;

public class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.ToTable("Categories");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(c => c.Description)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(c => c.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(c => c.DeactivatedAt)
            .IsRequired(false);

        builder.Property(c => c.DeactivatedBy)
            .HasMaxLength(100)
            .IsRequired(false);

        // Index for active categories
        builder.HasIndex(c => new { c.Name, c.IsActive })
            .IsUnique()
            .HasFilter("[IsActive] = 1");

        // Index for deactivated categories
        builder.HasIndex(c => c.DeactivatedAt);
    }
}
