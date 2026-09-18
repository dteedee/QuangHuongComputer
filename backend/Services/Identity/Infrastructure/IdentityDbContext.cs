using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Identity.Domain;

namespace Identity.Infrastructure;

public class IdentityDbContext : IdentityDbContext<ApplicationUser>
{
    public IdentityDbContext(DbContextOptions<IdentityDbContext> options) : base(options)
    {
    }

    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<PasswordResetToken> PasswordResetTokens { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }
    public DbSet<UserProfile> UserProfiles { get; set; }
    public DbSet<TwoFactorConfig> TwoFactorConfigs { get; set; }
    public DbSet<TwoFactorChallenge> TwoFactorChallenges { get; set; }
    public DbSet<UserSession> UserSessions { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Set schema cho Identity module
        // builder.HasDefaultSchema("identity");

        builder.Entity<ApplicationUser>().HasQueryFilter(u => u.IsActive);

        builder.Entity<PasswordResetToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CodeHash).IsRequired().HasMaxLength(128);
            entity.Property(e => e.Salt).IsRequired().HasMaxLength(64);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(256);
            entity.Property(e => e.UserId).IsRequired();
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            // Lookup is always by e-mail (never by code), so that is the index we need.
            entity.HasIndex(e => new { e.Email, e.IsUsed });
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

        builder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            // Token is nullable on purpose: only pre-W1-2 rows still carry the
            // clear-text secret. New rows write TokenHash only.
            entity.Property(e => e.Token).HasMaxLength(500);
            entity.Property(e => e.TokenHash).HasMaxLength(128);
            entity.Property(e => e.JwtId).IsRequired().HasMaxLength(500);
            entity.Property(e => e.UserId).IsRequired().HasMaxLength(450);
            entity.Property(e => e.CreatedByIp).IsRequired().HasMaxLength(50);
            entity.Property(e => e.RevokedByIp).HasMaxLength(50);
            entity.Property(e => e.ReplacedByToken).HasMaxLength(128);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.TokenHash).IsUnique();
            entity.HasIndex(e => e.Token);
            entity.HasIndex(e => e.JwtId);
            entity.HasIndex(e => e.SessionId);
            entity.HasIndex(e => new { e.UserId, e.IsRevoked, e.ExpiresAt });
        });

        builder.Entity<TwoFactorConfig>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).IsRequired().HasMaxLength(450);
            entity.Property(e => e.TotpSecret).HasMaxLength(500);
            entity.Property(e => e.BackupCodes).HasMaxLength(2000);
            entity.HasIndex(e => e.UserId).IsUnique();
        });

        builder.Entity<TwoFactorChallenge>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).IsRequired().HasMaxLength(450);
            entity.Property(e => e.TokenHash).IsRequired().HasMaxLength(128);
            entity.Property(e => e.IpAddress).HasMaxLength(50);
            entity.Property(e => e.UserAgent).HasMaxLength(1000);
            // Lookup is always by hash; the index is unique so a duplicate hash
            // can never resolve to two accounts.
            entity.HasIndex(e => e.TokenHash).IsUnique();
            entity.HasIndex(e => new { e.UserId, e.IsUsed });
        });

        builder.Entity<UserSession>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).IsRequired().HasMaxLength(450);
            entity.Property(e => e.IpAddress).HasMaxLength(50);
            entity.Property(e => e.DeviceInfo).HasMaxLength(500);
            entity.Property(e => e.UserAgent).HasMaxLength(1000);
            entity.Property(e => e.RefreshTokenId).HasMaxLength(500);
            entity.Property(e => e.RevokedByIp).HasMaxLength(50);
            entity.Property(e => e.RevokedReason).HasMaxLength(50);
            entity.HasIndex(e => new { e.UserId, e.IsRevoked });
        });

        // W1-11 owns every other module's DbContext, so the two AuditLogs indexes
        // the audit console needs have to be declared here. Without them
        // "history of this entity" and "what did this user do" are sequential
        // scans over a table that only ever grows.
        builder.Entity<AuditLog>(entity =>
        {
            entity.HasIndex(e => new { e.EntityName, e.EntityId, e.Timestamp });
            entity.HasIndex(e => new { e.UserId, e.Timestamp });
        });
    }
}
