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
        if (!await _context.Posts.AnyAsync(p => p.Title.Contains("Quang Hưởng")))
        {
            var oldPosts = await _context.Posts.ToListAsync();
            _context.Posts.RemoveRange(oldPosts);
            await _context.SaveChangesAsync();

            var posts = new List<Post>
            {
                // News/Technology
                new Post("Đánh giá chi tiết NVIDIA RTX 5090: Bước ngoặt công nghệ đồ họa", "rtx-5090-review", "Siêu phẩm card đồ họa thế hệ mới từ NVIDIA hứa hẹn mang lại hiệu năng gấp đôi so với người tiền nhiệm. Cùng Quang Hưởng Computer phân tích sức mạnh thực tế của nó.", PostType.News),
                new Post("Top 5 Laptop Gaming đáng mua nhất dịp Tết 2026", "top-gaming-laptops-2026", "Tổng hợp những mẫu Laptop Gaming có hiệu năng trên giá thành tốt nhất hiện nay, từ Asus TUF đến MSI Katana.", PostType.Article),
                new Post("Hướng dẫn tự Build PC Gaming tại nhà từ A-Z", "build-pc-guide", "Bạn muốn tự tay lắp ráp cỗ máy chiến game của mình? Bài viết này sẽ hướng dẫn chi tiết từng bước cho bạn chuyên nghiệp nhất.", PostType.Article),
                
                // Promotions
                new Post("SIÊU SELL TỔNG KẾT NĂM: Giảm giá đến 50% toàn bộ linh kiện", "yearend-sale-2025", "Cơ hội cuối cùng trong năm để sở hữu những món đồ công nghệ hằng mơ ước với mức giá không tưởng. Chỉ có tại Quang Hưởng Computer.", PostType.Promotion),
                new Post("Lì xì đầu năm - Nhận voucher 500k khi mua Laptop", "tết-promotion", "Chương trình ưu đãi đặc biệt dành cho khách hàng mua Laptop chính hãng tại hệ thống cửa hàng. Nhận ngay lì xì may mắn.", PostType.Promotion),
                new Post("Build PC Gaming tặng kèm gói vệ sinh máy trọn đời", "pc-bundle-promo", "Khi mua bộ PC Gaming bất kỳ tại Quang Hưởng, quý khách sẽ được tặng kèm dịch vụ bảo dưỡng, vệ sinh máy miễn phí vĩnh viễn.", PostType.Promotion)
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
                new Coupon("QUANGHUONG20", "Ưu đãi chào mừng thành viên mới", DiscountType.Percentage, 20, 0, 500000, DateTime.UtcNow, DateTime.UtcNow.AddYears(1)),
                new Coupon("LIXITET", "Lì xì Tết Nguyên Đán", DiscountType.FixedAmount, 200000, 2000000, null, DateTime.UtcNow, DateTime.UtcNow.AddMonths(3)),
                new Coupon("PCMASTER", "Mã giảm giá cho khách Build PC", DiscountType.Percentage, 10, 0, 1000000, DateTime.UtcNow, DateTime.UtcNow.AddYears(1))
            };

            _context.Coupons.AddRange(coupons);
            await _context.SaveChangesAsync();
        }
    }
}
