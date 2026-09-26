using Microsoft.EntityFrameworkCore;
using Repair.Domain;

namespace Repair.Infrastructure;

public class RepairDbContext : DbContext
{
    public RepairDbContext(DbContextOptions<RepairDbContext> options) : base(options)
    {
    }

    public DbSet<RepairRequest> RepairRequests { get; set; }
    public DbSet<WorkOrder> WorkOrders { get; set; }
    public DbSet<Technician> Technicians { get; set; }
    public DbSet<ServiceBooking> ServiceBookings { get; set; }
    public DbSet<WorkOrderPart> WorkOrderParts { get; set; }
    public DbSet<RepairQuote> RepairQuotes { get; set; }
    public DbSet<RepairQuoteLine> RepairQuoteLines { get; set; }
    public DbSet<WorkOrderActivityLog> WorkOrderActivityLogs { get; set; }
    public DbSet<RepairServiceType> RepairServiceTypes { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<RepairRequest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EstimatedCost).HasPrecision(18, 2);
            // W1-11 / audit db-schema-migrations-12: bảng chỉ có khoá chính; màn hình
            // "yêu cầu sửa chữa của tôi" và hàng đợi kỹ thuật đều quét toàn bảng.
            entity.HasIndex(e => e.CustomerId).HasDatabaseName("IX_RepairRequests_CustomerId");
            entity.HasIndex(e => new { e.Status, e.RequestDate })
                .HasDatabaseName("IX_RepairRequests_Status_RequestDate");
            entity.ToTable(t => t.HasCheckConstraint(
                "CK_RepairRequests_EstimatedCost_NonNegative", "\"EstimatedCost\" >= 0"));
        });

        modelBuilder.Entity<WorkOrder>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PartsCost).HasPrecision(18, 2);
            entity.Property(e => e.LaborCost).HasPrecision(18, 2);
            entity.Property(e => e.EstimatedCost).HasPrecision(18, 2);
            entity.Property(e => e.ActualCost).HasPrecision(18, 2);
            entity.Property(e => e.ServiceFee).HasPrecision(18, 2);

            // Navigation properties
            entity.HasMany(e => e.Parts)
                .WithOne(p => p.WorkOrder)
                .HasForeignKey(p => p.WorkOrderId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Quotes)
                .WithOne(q => q.WorkOrder)
                .HasForeignKey(q => q.WorkOrderId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.ActivityLogs)
                .WithOne(a => a.WorkOrder)
                .HasForeignKey(a => a.WorkOrderId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.TicketNumber).IsUnique();
            entity.HasIndex(e => e.CustomerId);
            entity.HasIndex(e => e.TechnicianId);
            entity.HasIndex(e => e.Status);

            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_WorkOrders_PartsCost_NonNegative", "\"PartsCost\" >= 0");
                t.HasCheckConstraint("CK_WorkOrders_LaborCost_NonNegative", "\"LaborCost\" >= 0");
                t.HasCheckConstraint("CK_WorkOrders_EstimatedCost_NonNegative", "\"EstimatedCost\" >= 0");
                t.HasCheckConstraint("CK_WorkOrders_ActualCost_NonNegative", "\"ActualCost\" >= 0");
                t.HasCheckConstraint("CK_WorkOrders_ServiceFee_NonNegative", "\"ServiceFee\" >= 0");
            });
        });

        modelBuilder.Entity<Technician>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.HourlyRate).HasPrecision(18, 2);

            // W0-11: one Identity user maps to at most one technician row; NULL
            // (not yet linked) is excluded so the filtered index never blocks it.
            entity.HasIndex(e => e.UserId)
                .IsUnique()
                .HasFilter("\"UserId\" IS NOT NULL");
        });

        modelBuilder.Entity<ServiceBooking>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EstimatedCost).HasPrecision(18, 2);
            entity.Property(e => e.OnSiteFee).HasPrecision(18, 2);

            // Store lists as JSON
            entity.Property(e => e.ImageUrls)
                .HasConversion(
                    v => string.Join(',', v),
                    v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList());

            entity.Property(e => e.VideoUrls)
                .HasConversion(
                    v => string.Join(',', v),
                    v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList());

            entity.HasIndex(e => e.CustomerId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.PreferredDate);

            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_ServiceBookings_EstimatedCost_NonNegative", "\"EstimatedCost\" >= 0");
                t.HasCheckConstraint("CK_ServiceBookings_OnSiteFee_NonNegative", "\"OnSiteFee\" >= 0");
            });
        });

        modelBuilder.Entity<WorkOrderPart>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UnitPrice).HasPrecision(18, 2);

            entity.HasIndex(e => e.WorkOrderId);
            entity.HasIndex(e => e.InventoryItemId);

            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_WorkOrderParts_UnitPrice_NonNegative", "\"UnitPrice\" >= 0");
                t.HasCheckConstraint("CK_WorkOrderParts_Quantity_Positive", "\"Quantity\" > 0");
            });
        });

        modelBuilder.Entity<RepairQuote>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PartsCost).HasPrecision(18, 2);
            entity.Property(e => e.LaborCost).HasPrecision(18, 2);
            entity.Property(e => e.ServiceFee).HasPrecision(18, 2);
            entity.Property(e => e.EstimatedHours).HasPrecision(18, 2);
            entity.Property(e => e.HourlyRate).HasPrecision(18, 2);

            entity.Property(e => e.SubtotalAmount).HasPrecision(18, 2);
            entity.Property(e => e.LineDiscountTotal).HasPrecision(18, 2);
            entity.Property(e => e.DiscountAmount).HasPrecision(18, 2);
            entity.Property(e => e.NetAmount).HasPrecision(18, 2);
            entity.Property(e => e.VatAmount).HasPrecision(18, 2);
            entity.Property(e => e.VatRate).HasPrecision(5, 4);

            entity.HasMany(e => e.Lines)
                .WithOne(l => l.Quote)
                .HasForeignKey(l => l.QuoteId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.QuoteNumber).IsUnique();
            entity.HasIndex(e => e.WorkOrderId);
            entity.HasIndex(e => e.Status);

            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_RepairQuotes_DiscountAmount_NonNegative", "\"DiscountAmount\" >= 0");
                t.HasCheckConstraint("CK_RepairQuotes_Totals_NonNegative",
                    "\"PartsCost\" >= 0 AND \"LaborCost\" >= 0 AND \"ServiceFee\" >= 0");
            });
        });

        RepairQuoteLineConfiguration.Configure(modelBuilder);
        RepairServiceTypeConfiguration.Configure(modelBuilder);

        modelBuilder.Entity<WorkOrderActivityLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.WorkOrderId);
            entity.HasIndex(e => e.CreatedAt);
        });
    }
}
