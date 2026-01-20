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
    public DbSet<WorkOrderActivityLog> WorkOrderActivityLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<RepairRequest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EstimatedCost).HasPrecision(18, 2);
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
        });

        modelBuilder.Entity<Technician>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.HourlyRate).HasPrecision(18, 2);
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
        });

        modelBuilder.Entity<WorkOrderPart>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UnitPrice).HasPrecision(18, 2);

            entity.HasIndex(e => e.WorkOrderId);
            entity.HasIndex(e => e.InventoryItemId);
        });

        modelBuilder.Entity<RepairQuote>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PartsCost).HasPrecision(18, 2);
            entity.Property(e => e.LaborCost).HasPrecision(18, 2);
            entity.Property(e => e.ServiceFee).HasPrecision(18, 2);
            entity.Property(e => e.EstimatedHours).HasPrecision(18, 2);
            entity.Property(e => e.HourlyRate).HasPrecision(18, 2);

            entity.HasIndex(e => e.QuoteNumber).IsUnique();
            entity.HasIndex(e => e.WorkOrderId);
            entity.HasIndex(e => e.Status);
        });

        modelBuilder.Entity<WorkOrderActivityLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.WorkOrderId);
            entity.HasIndex(e => e.CreatedAt);
        });
    }
}
