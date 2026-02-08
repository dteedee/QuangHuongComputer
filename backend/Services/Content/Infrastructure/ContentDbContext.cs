using Microsoft.EntityFrameworkCore;
using Content.Domain;

namespace Content.Infrastructure;

public class ContentDbContext : DbContext
{
    public ContentDbContext(DbContextOptions<ContentDbContext> options) : base(options)
    {
    }

    public DbSet<Post> Posts { get; set; }
    public DbSet<Coupon> Coupons { get; set; }
    public DbSet<Banner> Banners { get; set; }
    public DbSet<CMSPage> Pages { get; set; }
    public DbSet<Menu> Menus { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema("content");

        modelBuilder.Entity<Post>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("posts"); // Use lowercase table name
            entity.HasIndex(e => e.Slug).IsUnique();

            // Computed property, do not map to a separate column
            entity.Ignore(p => p.IsPublished);
            
            entity.HasIndex(e => new { e.Status, e.PublishedAt })
                .HasDatabaseName("IX_Post_Status_PublishedAt");
        });

        modelBuilder.Entity<Coupon>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.DiscountValue).HasPrecision(18, 2);
            entity.Property(e => e.MinOrderAmount).HasPrecision(18, 2);
            entity.Property(e => e.MaxDiscount).HasPrecision(18, 2);
            
            entity.HasIndex(e => new { e.IsActive, e.ValidFrom, e.ValidTo })
                .HasDatabaseName("IX_Coupon_Active_DateRange");
        });
        
        modelBuilder.Entity<Banner>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.ImageUrl).IsRequired();
            entity.Property(e => e.Title).HasMaxLength(200);
            
            entity.HasIndex(e => new { e.Position, e.IsActive, e.DisplayOrder })
                .HasDatabaseName("IX_Banner_Position_Active_Order");
                
            entity.HasIndex(e => new { e.StartDate, e.EndDate })
                .HasDatabaseName("IX_Banner_DateRange");
        });
        
        modelBuilder.Entity<CMSPage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Content).HasColumnType("text");
            entity.Property(e => e.MetaTitle).HasMaxLength(200);
            entity.Property(e => e.MetaDescription).HasMaxLength(500);
            
            entity.HasIndex(e => new { e.IsPublished, e.Type })
                .HasDatabaseName("IX_Page_Published_Type");
                
            entity.HasIndex(e => new { e.ParentId, e.DisplayOrder })
                .HasDatabaseName("IX_Page_Parent_Order");
        });
        
        modelBuilder.Entity<Menu>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            
            entity.HasIndex(e => new { e.Location, e.IsActive, e.DisplayOrder })
                .HasDatabaseName("IX_Menu_Location_Active_Order");
        });
    }
}
