using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure;

public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    
    // Phase 1: Enhanced fields
    public string? AvatarUrl { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public string? LastLoginIp { get; set; }
    public bool ForcePasswordChange { get; set; }
    public DateTime? PasswordChangedAt { get; set; }
    public bool TwoFactorEnabled { get; set; }
    public string? PreferredLanguage { get; set; } = "vi";
    public string? TimeZone { get; set; } = "Asia/Ho_Chi_Minh";
    public string? PhoneNumberVerified { get; set; }
    public DateTime? EmailVerifiedAt { get; set; }
    public DateTime? PhoneNumberVerifiedAt { get; set; }
}

public class PasswordResetToken
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser? User { get; set; }
}

public class UserProfile
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string? Gender { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? NationalId { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? District { get; set; }
    public string? Ward { get; set; }
    public string? PostalCode { get; set; }
    public string? CompanyName { get; set; }
    public string? TaxCode { get; set; }
    public string? BusinessType { get; set; }
    public CustomerType CustomerType { get; set; } = CustomerType.Retail;
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsActive { get; set; } = true;
    
    public ApplicationUser User { get; set; } = null!;
    public ICollection<CustomerAddress> Addresses { get; set; } = new List<CustomerAddress>();
}

public class CustomerAddress
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string RecipientName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string AddressLine { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string Ward { get; set; } = string.Empty;
    public string? PostalCode { get; set; }
    public bool IsDefault { get; set; }
    public string? AddressLabel { get; set; } // Nhà, Công ty
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public bool IsActive { get; set; } = true;
    
    public ApplicationUser User { get; set; } = null!;
}

public enum CustomerType
{
    Retail,
    Wholesale,
    Corporate
}

public class IdentityDbContext : IdentityDbContext<ApplicationUser>
{
    public IdentityDbContext(DbContextOptions<IdentityDbContext> options) : base(options)
    {
    }

    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<PasswordResetToken> PasswordResetTokens { get; set; }
    public DbSet<UserProfile> UserProfiles { get; set; }
    public DbSet<CustomerAddress> CustomerAddresses { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.Entity<ApplicationUser>().HasQueryFilter(u => u.IsActive);

        builder.Entity<PasswordResetToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Token).IsRequired().HasMaxLength(500);
            entity.Property(e => e.UserId).IsRequired();
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.Token);
        });

        builder.Entity<UserProfile>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).IsRequired().HasMaxLength(450);
            entity.Property(e => e.NationalId).HasMaxLength(50);
            entity.Property(e => e.TaxCode).HasMaxLength(50);
            
            entity.HasOne(e => e.User)
                .WithOne()
                .HasForeignKey<UserProfile>(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasIndex(e => e.UserId).IsUnique();
            entity.HasIndex(e => new { e.City, e.CustomerType });
        });

        builder.Entity<CustomerAddress>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).IsRequired().HasMaxLength(450);
            entity.Property(e => e.RecipientName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.PhoneNumber).IsRequired().HasMaxLength(20);
            entity.Property(e => e.AddressLine).IsRequired().HasMaxLength(500);
            entity.Property(e => e.City).IsRequired().HasMaxLength(100);
            entity.Property(e => e.District).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Ward).IsRequired().HasMaxLength(100);
            
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasIndex(e => new { e.UserId, e.IsDefault });
            entity.HasIndex(e => e.City);
        });
    }
}
