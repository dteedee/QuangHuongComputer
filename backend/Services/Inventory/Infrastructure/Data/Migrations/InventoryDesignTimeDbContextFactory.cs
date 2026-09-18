using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace InventoryModule.Infrastructure.Data.Migrations;

/// <summary>
/// Design-time factory cho <see cref="InventoryDbContext"/> - CHỈ phục vụ `dotnet ef migrations add`
/// và `dotnet ef migrations script`, hai lệnh không bao giờ mở kết nối CSDL.
///
/// D12: chuỗi kết nối ở đây cố tình KHÔNG thể kết nối được (cổng 1, database không tồn tại).
/// Nhờ vậy một lệnh `dotnet ef database update` chạy nhầm sẽ báo lỗi kết nối thay vì ghi DDL
/// vào CSDL đang phục vụ API :5000. Migration được áp bằng script SQL sinh ra từ
/// `dotnet ef migrations script`, rồi chạy qua psql vào đúng database đích.
/// </summary>
public sealed class InventoryDesignTimeDbContextFactory : IDesignTimeDbContextFactory<InventoryDbContext>
{
    internal const string UnreachableDesignTimeConnection =
        "Host=127.0.0.1;Port=1;Database=qh_design_time_only;Username=none;Password=none;Timeout=1";

    public InventoryDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<InventoryDbContext>()
            .UseNpgsql(UnreachableDesignTimeConnection)
            .Options;
        return new InventoryDbContext(options);
    }
}
