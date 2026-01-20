using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Repair.Infrastructure;

public class RepairDbContextFactory : IDesignTimeDbContextFactory<RepairDbContext>
{
    public RepairDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<RepairDbContext>();

        // Use a connection string for design-time (migrations)
        optionsBuilder.UseNpgsql("Host=localhost;Database=QuangHuongRepair;Username=postgres;Password=postgres");

        return new RepairDbContext(optionsBuilder.Options);
    }
}
