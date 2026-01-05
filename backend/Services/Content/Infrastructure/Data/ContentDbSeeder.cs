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
        if (!await _context.Posts.AnyAsync())
        {
            var posts = new List<Post>
            {
                new Post("Welcome to Quang Huong Computer", "welcome", "We are excited to launch our new online store! Find the best deals on laptops, PCs, and accessories.", PostType.News),
                new Post("Grand Opening Sale", "grand-opening-sale", "Get up to 50% off on selected items until the end of the month.", PostType.Promotion),
                new Post("How to choose the right Laptop", "how-to-choose-laptop", "Comprehensive guide on selecting the perfect laptop for your needs (Gaming, Office, Student).", PostType.Article)
            };

            foreach (var post in posts)
            {
                post.Publish();
            }

            _context.Posts.AddRange(posts);
            await _context.SaveChangesAsync();
        }

        if (!await _context.Coupons.AnyAsync())
        {
            var coupons = new List<Coupon>
            {
                new Coupon("WELCOME10", DiscountType.Percentage, 10, DateTime.UtcNow, DateTime.UtcNow.AddYears(1)),
                new Coupon("SUMMER24", DiscountType.FixedAmount, 50, DateTime.UtcNow, DateTime.UtcNow.AddMonths(3)),
                new Coupon("VIPUSER", DiscountType.Percentage, 15, DateTime.UtcNow, DateTime.UtcNow.AddYears(10))
            };

            _context.Coupons.AddRange(coupons);
            await _context.SaveChangesAsync();
        }
    }
}
