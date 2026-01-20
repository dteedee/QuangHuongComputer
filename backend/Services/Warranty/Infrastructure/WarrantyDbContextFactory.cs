using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Warranty.Infrastructure;

public class WarrantyDbContextFactory : IDesignTimeDbContextFactory<WarrantyDbContext>
{
    public WarrantyDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<WarrantyDbContext>();
        optionsBuilder.UseNpgsql("Host=localhost;Database=quanghuong_warranty;Username=postgres;Password=postgres");

        return new WarrantyDbContext(optionsBuilder.Options);
    }
}
