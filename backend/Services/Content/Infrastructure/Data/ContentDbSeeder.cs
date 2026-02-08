using Content.Domain;
using Microsoft.EntityFrameworkCore;

namespace Content.Infrastructure.Data;

public class ContentDbSeeder
{
    private readonly ContentDbContext _context;

    public ContentDbSeeder(ContentDbContext context)
    {
        _context = context;
    }

    public async Task SeedAsync()
    {
        try
        {
            // Skip seeding if table is empty or has errors
            if (!await _context.Posts.AnyAsync())
            {
                // Minimal seed data for testing
                var post = new Post("Chào mừng đến với Quang Hưởng Computer", "chao-mung", "Bài đăng test", PostType.News);
                post.Publish();
                
                _context.Posts.Add(post);
                await _context.SaveChangesAsync();
            }

            if (!await _context.Coupons.AnyAsync())
            {
                var coupons = new List<Coupon>
                {
                    new Coupon("QUANGHUONG20", "Ưu đãi chào mừng thành viên mới", DiscountType.Percentage, 20, 0, 500000, DateTime.UtcNow, DateTime.UtcNow.AddYears(1)),
                    new Coupon("LIXITET", "Lì xì Tết Nguyên Đán", DiscountType.FixedAmount, 200000, 2000000, null, DateTime.UtcNow, DateTime.UtcNow.AddMonths(3)),
                    new Coupon("PCMASTER", "Mã giảm giá cho khách Build PC", DiscountType.Percentage, 10, 0, 1000000, DateTime.UtcNow, DateTime.UtcNow.AddYears(1))
                };

                _context.Coupons.AddRange(coupons);
                await _context.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            // Log error but don't fail startup
            Console.WriteLine($"Error seeding Content database: {ex.Message}");
        }
    }
}
