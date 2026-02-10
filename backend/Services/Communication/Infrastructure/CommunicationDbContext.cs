using Communication.Domain;
using Microsoft.EntityFrameworkCore;

namespace Communication.Infrastructure;

public class CommunicationDbContext : DbContext
{
    public CommunicationDbContext(DbContextOptions<CommunicationDbContext> options) : base(options)
    {
    }

    public DbSet<Conversation> Conversations { get; set; }
    public DbSet<ChatMessage> ChatMessages { get; set; }
    public DbSet<NotificationTemplate> NotificationTemplates { get; set; }
    public DbSet<NotificationLog> NotificationLogs { get; set; }
    public DbSet<NewsletterSubscription> NewsletterSubscriptions { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema("communication");

        // Conversation configuration
        modelBuilder.Entity<Conversation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CustomerId).IsRequired().HasMaxLength(450);
            entity.Property(e => e.CustomerName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.AssignedToUserId).HasMaxLength(450);
            entity.Property(e => e.AssignedToUserName).HasMaxLength(255);
            entity.Property(e => e.Status).HasConversion<int>();

            entity.HasIndex(e => e.CustomerId);
            entity.HasIndex(e => e.AssignedToUserId);
            entity.HasIndex(e => new { e.Status, e.LastMessageAt });
            
            entity.HasIndex(e => e.CreatedAt)
                .HasDatabaseName("IX_Conversation_CreatedAt");

            // Configure Messages collection
            entity.HasMany(c => c.Messages)
                .WithOne()
                .HasForeignKey(m => m.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ChatMessage configuration
        modelBuilder.Entity<ChatMessage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.SenderId).IsRequired().HasMaxLength(450);
            entity.Property(e => e.SenderName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Text).IsRequired().HasMaxLength(4000);
            entity.Property(e => e.SenderType).HasConversion<int>();

            entity.HasIndex(e => e.ConversationId);
            entity.HasIndex(e => new { e.ConversationId, e.CreatedAt });
        });
        
        // NotificationTemplate configuration
        modelBuilder.Entity<NotificationTemplate>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.Code).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Subject).HasMaxLength(500);
            entity.Property(e => e.Body).HasColumnType("text");
            
            entity.HasIndex(e => new { e.Type, e.IsActive })
                .HasDatabaseName("IX_NotificationTemplate_Type_Active");
        });
        
        // NotificationLog configuration
        modelBuilder.Entity<NotificationLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).IsRequired();
            entity.Property(e => e.Content).HasColumnType("text");
            entity.Property(e => e.Subject).HasMaxLength(500);
            entity.Property(e => e.Error).HasColumnType("text");
            
            entity.HasIndex(e => new { e.UserId, e.IsSent, e.CreatedAt })
                .HasDatabaseName("IX_NotificationLog_User_Sent_Date");
                
            entity.HasIndex(e => new { e.Type, e.CreatedAt })
                .HasDatabaseName("IX_NotificationLog_Type_Date");
                
            entity.HasIndex(e => new { e.IsSent, e.RetryCount })
                .HasFilter("IsSent = false AND RetryCount < 5")
                .HasDatabaseName("IX_NotificationLog_Failed_Retries");
        });

        // NewsletterSubscription configuration
        modelBuilder.Entity<NewsletterSubscription>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Name).HasMaxLength(255);
            entity.Property(e => e.SubscriptionSource).HasMaxLength(50);
            entity.Property(e => e.IpAddress).HasMaxLength(50);
            entity.Property(e => e.UserAgent).HasMaxLength(500);
            entity.Property(e => e.UnsubscribeReason).HasMaxLength(1000);

            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => new { e.IsActive, e.SubscribedAt });
        });
    }
}
