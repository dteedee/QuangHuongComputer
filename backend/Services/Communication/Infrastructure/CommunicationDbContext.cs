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
    }
}
