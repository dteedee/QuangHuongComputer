using Microsoft.EntityFrameworkCore;
using CRM.Domain;
using BuildingBlocks.Database;

namespace CRM.Infrastructure;

public class CrmDbContext : DbContext
{
    public CrmDbContext(DbContextOptions<CrmDbContext> options) : base(options)
    {
    }

    public DbSet<CustomerAnalytics> CustomerAnalytics { get; set; }
    public DbSet<CustomerSegment> CustomerSegments { get; set; }
    public DbSet<CustomerSegmentAssignment> CustomerSegmentAssignments { get; set; }
    public DbSet<Lead> Leads { get; set; }
    public DbSet<LeadPipelineStage> LeadPipelineStages { get; set; }
    public DbSet<CustomerInteraction> CustomerInteractions { get; set; }
    public DbSet<CustomerTask> CustomerTasks { get; set; }
    public DbSet<EmailCampaign> EmailCampaigns { get; set; }
    public DbSet<EmailCampaignRecipient> EmailCampaignRecipients { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure PostgreSQL settings with 'crm' schema
        PostgreSQLConfig.ConfigurePostgreSQL(modelBuilder, "crm");
        PostgreSQLConfig.ConfigureCommonColumnProperties(modelBuilder);

        // Soft delete filters
        modelBuilder.Entity<CustomerAnalytics>().HasQueryFilter(c => c.IsActive);
        modelBuilder.Entity<CustomerSegment>().HasQueryFilter(s => s.IsActive);
        modelBuilder.Entity<CustomerSegmentAssignment>().HasQueryFilter(a => a.IsActive);
        modelBuilder.Entity<Lead>().HasQueryFilter(l => l.IsActive);
        modelBuilder.Entity<LeadPipelineStage>().HasQueryFilter(p => p.IsActive);
        modelBuilder.Entity<CustomerInteraction>().HasQueryFilter(i => i.IsActive);
        modelBuilder.Entity<CustomerTask>().HasQueryFilter(t => t.IsActive);
        modelBuilder.Entity<EmailCampaign>().HasQueryFilter(c => c.IsActive);
        modelBuilder.Entity<EmailCampaignRecipient>().HasQueryFilter(r => r.IsActive);

        // CustomerAnalytics configuration
        modelBuilder.Entity<CustomerAnalytics>(entity =>
        {
            entity.ToTable("CustomerAnalytics");
            entity.HasKey(c => c.Id);

            entity.Property(c => c.TotalSpent).HasPrecision(18, 2);
            entity.Property(c => c.AverageOrderValue).HasPrecision(18, 2);

            // Unique constraint on UserId
            entity.HasIndex(c => c.UserId)
                .IsUnique()
                .HasDatabaseName("uq_customer_analytics_user_id");

            // Indexes for querying
            entity.HasIndex(c => c.LifecycleStage)
                .HasDatabaseName("ix_customer_analytics_lifecycle_stage");

            entity.HasIndex(c => new { c.RecencyScore, c.FrequencyScore, c.MonetaryScore })
                .HasDatabaseName("ix_customer_analytics_rfm_scores");

            entity.HasIndex(c => c.LastPurchaseDate)
                .HasDatabaseName("ix_customer_analytics_last_purchase");

            entity.HasIndex(c => c.TotalSpent)
                .HasDatabaseName("ix_customer_analytics_total_spent");
        });

        // CustomerSegment configuration
        modelBuilder.Entity<CustomerSegment>(entity =>
        {
            entity.ToTable("CustomerSegments");
            entity.HasKey(s => s.Id);

            entity.Property(s => s.Name).IsRequired().HasMaxLength(100);
            entity.Property(s => s.Code).IsRequired().HasMaxLength(50);
            entity.Property(s => s.Description).HasMaxLength(500);
            entity.Property(s => s.Color).HasMaxLength(20);
            entity.Property(s => s.RuleDefinition).HasColumnType("jsonb");

            entity.HasIndex(s => s.Code)
                .IsUnique()
                .HasDatabaseName("uq_customer_segments_code");

            entity.HasIndex(s => s.SortOrder)
                .HasDatabaseName("ix_customer_segments_sort_order");
        });

        // CustomerSegmentAssignment configuration
        modelBuilder.Entity<CustomerSegmentAssignment>(entity =>
        {
            entity.ToTable("CustomerSegmentAssignments");
            entity.HasKey(a => a.Id);

            entity.HasOne(a => a.CustomerAnalytics)
                .WithMany()
                .HasForeignKey(a => a.CustomerAnalyticsId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_segment_assignments_customer");

            entity.HasOne(a => a.Segment)
                .WithMany(s => s.Assignments)
                .HasForeignKey(a => a.SegmentId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_segment_assignments_segment");

            // Prevent duplicate assignments
            entity.HasIndex(a => new { a.CustomerAnalyticsId, a.SegmentId })
                .IsUnique()
                .HasDatabaseName("uq_segment_assignments_customer_segment");
        });

        // Lead configuration
        modelBuilder.Entity<Lead>(entity =>
        {
            entity.ToTable("Leads");
            entity.HasKey(l => l.Id);

            entity.Property(l => l.FullName).IsRequired().HasMaxLength(200);
            entity.Property(l => l.Email).IsRequired().HasMaxLength(200);
            entity.Property(l => l.Phone).HasMaxLength(20);
            entity.Property(l => l.Company).HasMaxLength(200);
            entity.Property(l => l.JobTitle).HasMaxLength(100);
            entity.Property(l => l.SourceDetail).HasMaxLength(200);
            entity.Property(l => l.EstimatedValue).HasPrecision(18, 2);
            entity.Property(l => l.Currency).HasMaxLength(10);
            entity.Property(l => l.Notes).HasColumnType("text");
            entity.Property(l => l.Address).HasMaxLength(500);
            entity.Property(l => l.City).HasMaxLength(100);
            entity.Property(l => l.District).HasMaxLength(100);
            entity.Property(l => l.InterestedProducts).HasColumnType("jsonb");
            entity.Property(l => l.LossReason).HasMaxLength(500);
            entity.Property(l => l.NextFollowUpNote).HasMaxLength(500);
            entity.Property(l => l.AssignedToUserName).HasMaxLength(200);

            entity.HasOne(l => l.PipelineStage)
                .WithMany(p => p.Leads)
                .HasForeignKey(l => l.PipelineStageId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_leads_pipeline_stage");

            entity.HasIndex(l => l.Email)
                .HasDatabaseName("ix_leads_email");

            entity.HasIndex(l => l.Status)
                .HasDatabaseName("ix_leads_status");

            entity.HasIndex(l => l.Source)
                .HasDatabaseName("ix_leads_source");

            entity.HasIndex(l => l.AssignedToUserId)
                .HasDatabaseName("ix_leads_assigned_to");

            entity.HasIndex(l => l.NextFollowUpAt)
                .HasDatabaseName("ix_leads_next_follow_up");

            entity.HasIndex(l => l.CreatedAt)
                .HasDatabaseName("ix_leads_created_at");
        });

        // LeadPipelineStage configuration
        modelBuilder.Entity<LeadPipelineStage>(entity =>
        {
            entity.ToTable("LeadPipelineStages");
            entity.HasKey(p => p.Id);

            entity.Property(p => p.Name).IsRequired().HasMaxLength(100);
            entity.Property(p => p.Description).HasMaxLength(500);
            entity.Property(p => p.Color).HasMaxLength(20);
            entity.Property(p => p.TotalEstimatedValue).HasPrecision(18, 2);

            entity.HasIndex(p => p.SortOrder)
                .HasDatabaseName("ix_pipeline_stages_sort_order");
        });

        // CustomerInteraction configuration
        modelBuilder.Entity<CustomerInteraction>(entity =>
        {
            entity.ToTable("CustomerInteractions");
            entity.HasKey(i => i.Id);

            entity.Property(i => i.Subject).IsRequired().HasMaxLength(200);
            entity.Property(i => i.Content).HasColumnType("text");
            entity.Property(i => i.PerformedByUserName).HasMaxLength(200);
            entity.Property(i => i.CallOutcome).HasMaxLength(200);
            entity.Property(i => i.MeetingLocation).HasMaxLength(200);
            entity.Property(i => i.FollowUpNote).HasMaxLength(500);
            entity.Property(i => i.Sentiment).HasMaxLength(50);
            entity.Property(i => i.Attachments).HasColumnType("jsonb");

            entity.HasOne(i => i.CustomerAnalytics)
                .WithMany()
                .HasForeignKey(i => i.CustomerAnalyticsId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_interactions_customer");

            entity.HasOne(i => i.Lead)
                .WithMany(l => l.Interactions)
                .HasForeignKey(i => i.LeadId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_interactions_lead");

            entity.HasIndex(i => i.CustomerAnalyticsId)
                .HasDatabaseName("ix_interactions_customer");

            entity.HasIndex(i => i.LeadId)
                .HasDatabaseName("ix_interactions_lead");

            entity.HasIndex(i => i.Type)
                .HasDatabaseName("ix_interactions_type");

            entity.HasIndex(i => i.PerformedAt)
                .HasDatabaseName("ix_interactions_performed_at");

            entity.HasIndex(i => i.FollowUpDate)
                .HasDatabaseName("ix_interactions_follow_up");
        });

        // CustomerTask configuration
        modelBuilder.Entity<CustomerTask>(entity =>
        {
            entity.ToTable("CustomerTasks");
            entity.HasKey(t => t.Id);

            entity.Property(t => t.Title).IsRequired().HasMaxLength(200);
            entity.Property(t => t.Description).HasColumnType("text");
            entity.Property(t => t.AssignedToUserName).HasMaxLength(200);

            entity.HasOne(t => t.CustomerAnalytics)
                .WithMany()
                .HasForeignKey(t => t.CustomerAnalyticsId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_tasks_customer");

            entity.HasOne(t => t.Lead)
                .WithMany()
                .HasForeignKey(t => t.LeadId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_tasks_lead");

            entity.HasIndex(t => t.AssignedToUserId)
                .HasDatabaseName("ix_tasks_assigned_to");

            entity.HasIndex(t => t.Status)
                .HasDatabaseName("ix_tasks_status");

            entity.HasIndex(t => t.DueDate)
                .HasDatabaseName("ix_tasks_due_date");

            entity.HasIndex(t => t.ReminderAt)
                .HasFilter("\"ReminderSent\" = false")
                .HasDatabaseName("ix_tasks_pending_reminders");
        });

        // EmailCampaign configuration
        modelBuilder.Entity<EmailCampaign>(entity =>
        {
            entity.ToTable("EmailCampaigns");
            entity.HasKey(c => c.Id);

            entity.Property(c => c.Name).IsRequired().HasMaxLength(200);
            entity.Property(c => c.Subject).IsRequired().HasMaxLength(500);
            entity.Property(c => c.PreviewText).HasMaxLength(200);
            entity.Property(c => c.HtmlContent).IsRequired().HasColumnType("text");
            entity.Property(c => c.PlainTextContent).HasColumnType("text");
            entity.Property(c => c.TargetLifecycleStages).HasColumnType("jsonb");
            entity.Property(c => c.FromEmail).HasMaxLength(200);
            entity.Property(c => c.FromName).HasMaxLength(200);
            entity.Property(c => c.ReplyToEmail).HasMaxLength(200);

            entity.HasOne(c => c.TargetSegment)
                .WithMany()
                .HasForeignKey(c => c.TargetSegmentId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_campaigns_target_segment");

            entity.HasIndex(c => c.Status)
                .HasDatabaseName("ix_campaigns_status");

            entity.HasIndex(c => c.ScheduledAt)
                .HasDatabaseName("ix_campaigns_scheduled_at");

            entity.HasIndex(c => c.SentAt)
                .HasDatabaseName("ix_campaigns_sent_at");
        });

        // EmailCampaignRecipient configuration
        modelBuilder.Entity<EmailCampaignRecipient>(entity =>
        {
            entity.ToTable("EmailCampaignRecipients");
            entity.HasKey(r => r.Id);

            entity.Property(r => r.Email).IsRequired().HasMaxLength(200);
            entity.Property(r => r.FullName).HasMaxLength(200);
            entity.Property(r => r.TrackingId).IsRequired().HasMaxLength(50);
            entity.Property(r => r.ClickedLinks).HasColumnType("jsonb");
            entity.Property(r => r.BounceReason).HasMaxLength(500);
            entity.Property(r => r.UserAgent).HasMaxLength(500);
            entity.Property(r => r.IpAddress).HasMaxLength(50);

            entity.HasOne(r => r.Campaign)
                .WithMany(c => c.Recipients)
                .HasForeignKey(r => r.CampaignId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_recipients_campaign");

            entity.HasOne(r => r.CustomerAnalytics)
                .WithMany()
                .HasForeignKey(r => r.CustomerAnalyticsId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_recipients_customer");

            entity.HasIndex(r => r.TrackingId)
                .IsUnique()
                .HasDatabaseName("uq_recipients_tracking_id");

            entity.HasIndex(r => new { r.CampaignId, r.Email })
                .IsUnique()
                .HasDatabaseName("uq_recipients_campaign_email");

            entity.HasIndex(r => r.Status)
                .HasDatabaseName("ix_recipients_status");
        });
    }
}
