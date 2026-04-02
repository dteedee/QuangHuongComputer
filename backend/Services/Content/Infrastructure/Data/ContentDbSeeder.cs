using Content.Domain;
using Content.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Content.Infrastructure.Data;

public static class ContentDbSeeder
{
    public static async Task SeedAsync(ContentDbContext context)
    {
        // 1. Pages Upsert
        var pages = new List<CMSPage>
        {
            new CMSPage("Chính sách bảo hành", "bao-hanh", DefaultWarrantyContent, PageType.Warranty),
            new CMSPage("Chính sách đổi trả", "doi-tra", DefaultReturnContent, PageType.Returns),
            new CMSPage("Chính sách vận chuyển", "van-chuyen", DefaultShippingContent, PageType.Shipping),
            new CMSPage("Hướng dẫn thanh toán", "huong-dan-thanh-toan", DefaultPaymentContent, PageType.Custom),
            new CMSPage("Giới thiệu", "gioi-thieu", DefaultAboutContent, PageType.About),
            new CMSPage("Liên hệ", "lien-he", DefaultContactContent, PageType.Contact)
        };

        foreach (var page in pages)
        {
            var existingPage = await context.Pages.FirstOrDefaultAsync(p => p.Slug == page.Slug);
            if (existingPage != null)
            {
                // Update content if it matches default system pages
                existingPage.Update(page.Title, page.Content);
                if (!existingPage.IsPublished) existingPage.Publish();
            }
            else
            {
                page.Publish();
                context.Pages.Add(page);
            }
        }
        await context.SaveChangesAsync();

        // 2. Posts Upsert
        var posts = new List<Post>
        {
            // ==================== PROMOTIONS (Khuyến mãi) ====================
            new Post(
                "Flash Sale Cuối Tuần - Giảm Đến 50% Toàn Bộ Linh Kiện",
                "flash-sale-cuoi-tuan-giam-50",
                PromotionFlashSale,
                PostType.Promotion,
                "Khuyến mãi hot",
                "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&q=80"
            ),
            new Post(
                "Mua Laptop Tặng Ngay Balo + Chuột Gaming Trị Giá 1.5 Triệu",
                "mua-laptop-tang-balo-chuot",
                PromotionLaptopGift,
                PostType.Promotion,
                "Khuyến mãi hot",
                "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80"
            ),
            new Post(
                "Trade-in VGA Cũ - Lên Đời RTX 50 Series Giảm Thêm 2 Triệu",
                "trade-in-vga-cu-len-doi-rtx50",
                PromotionTradeIn,
                PostType.Promotion,
                "Khuyến mãi hot",
                "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&q=80"
            ),
            new Post(
                "Back To School 2026 - Sinh Viên Giảm Ngay 10% Khi Mua PC/Laptop",
                "back-to-school-2026-sinh-vien",
                PromotionBackToSchool,
                PostType.Promotion,
                "Khuyến mãi",
                "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80"
            ),
            new Post(
                "Combo Build PC Gaming - Tiết Kiệm Đến 5 Triệu",
                "combo-build-pc-gaming-tiet-kiem",
                PromotionComboPC,
                PostType.Promotion,
                "Khuyến mãi",
                "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800&q=80"
            ),
            new Post(
                "Mở Thẻ Tín Dụng MB Bank - Giảm Thêm 500K Cho Đơn Từ 10 Triệu",
                "mo-the-mb-bank-giam-500k",
                PromotionMBBank,
                PostType.Promotion,
                "Khuyến mãi",
                "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80"
            ),

            // ==================== NEWS (Tin tức) ====================
            new Post(
                "Khai Trương Chi Nhánh Mới Tại Cầu Giấy - Ưu Đãi Khủng",
                "khai-truong-chi-nhanh-cau-giay",
                NewsKhaiTruong,
                PostType.News,
                "Tin tức",
                "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80"
            ),
            new Post(
                "NVIDIA Ra Mắt RTX 5090 - Hiệu Năng Gấp 2 Lần Thế Hệ Trước",
                "nvidia-ra-mat-rtx-5090",
                NewsRTX5090,
                PostType.News,
                "Tin công nghệ",
                "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&q=80"
            ),
            new Post(
                "AMD Zen 5 Chính Thức Lộ Diện - Đối Thủ Xứng Tầm Intel",
                "amd-zen5-chinh-thuc-lo-dien",
                NewsAMDZen5,
                PostType.News,
                "Tin công nghệ",
                "https://images.unsplash.com/photo-1555617981-dac3880eac6e?w=800&q=80"
            ),
            new Post(
                "Cảnh Báo: Xuất Hiện Trang Web Giả Mạo Quang Hưởng Computer",
                "canh-bao-mao-danh-lua-dao",
                NewsCanhBao,
                PostType.News,
                "Thông báo",
                "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80"
            ),

            // ==================== ARTICLES (Bài viết) ====================
            new Post(
                "Top 10 Laptop Gaming Đáng Mua Nhất 2026 - Từ 20 Đến 50 Triệu",
                "top-10-laptop-gaming-2026",
                ArticleTop10Laptop,
                PostType.Article,
                "Review",
                "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&q=80"
            ),
            new Post(
                "Hướng Dẫn Build PC Gaming 25 Triệu Chiến Mọi Game 2026",
                "build-pc-gaming-25-trieu-2026",
                ArticleBuildPC,
                PostType.Article,
                "Hướng dẫn",
                "https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=800&q=80"
            ),
            new Post(
                "So Sánh Intel Core Ultra vs AMD Ryzen 9000 - Ai Là Vua?",
                "so-sanh-intel-ultra-vs-amd-9000",
                ArticleCompare,
                PostType.Article,
                "So sánh",
                "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800&q=80"
            ),
            new Post(
                "5 Sai Lầm Phổ Biến Khi Build PC Và Cách Khắc Phục",
                "5-sai-lam-khi-build-pc",
                ArticleMistakes,
                PostType.Article,
                "Tips & Tricks",
                "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80"
            )
        };

        foreach (var post in posts)
        {
            var existingPost = await context.Posts.FirstOrDefaultAsync(p => p.Slug == post.Slug);
            if (existingPost == null)
            {
                post.Publish();
                context.Posts.Add(post);
            }
            else
            {
                existingPost.UpdateDetails(post.Title, post.Content, post.Category, post.ThumbnailUrl);
                existingPost.UpdateTags(post.Tags);
            }
        }
        
        await context.SaveChangesAsync();

        // 2.5 Fill Mock/Empty Posts with generic rich content template
        var emptyPosts = await context.Posts.Where(p => p.Content.Length < 100).ToListAsync();
        var promoImagesArray = new[] {
            "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80",  // original red bag
            "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=800&q=80",  // yellow sale
            "https://images.unsplash.com/photo-1481437156560-3205f6a55735?w=800&q=80",  // store
            "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=800&q=80",  // tags
            "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80",     // cart
            "https://images.unsplash.com/photo-1605901309584-818e25960b8f?w=800&q=80"   // bags
        };
        var articleImagesArray = new[] {
            "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80", // code
            "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80", // chip
            "https://images.unsplash.com/photo-1555617981-dac3880eac6e?w=800&q=80",    // cpu
            "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&q=80", // gpu
            "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&q=80"  // setup
        };

        foreach (var p in emptyPosts)
        {
            var hashValue = Math.Abs((p.Slug + p.Title).GetHashCode());
            if (p.Type == PostType.Promotion || p.Category == "Khuyến mãi")
            {
                var promoHtml = @"<div class='not-prose space-y-6'>
    <div style='background: linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%); color: white; padding: 2rem; border-radius: 1rem; text-align: center; box-shadow: 0 10px 25px -5px rgba(255, 65, 108, 0.4);'>
        <h2 style='font-size: 2.5rem; font-weight: 900; margin-bottom: 1rem; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);'>🚀 SIÊU ƯU ĐÃI ĐẶC BIỆT</h2>
        <p style='font-size: 1.25rem; opacity: 0.9; margin: 0;'>Chào đón chương trình khuyến mãi lớn nhất trong năm!</p>
    </div>
    
    <div style='background-color: white; border: 1px solid #fee2e2; border-radius: 1rem; padding: 2rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);'>
        <p style='font-size: 1.125rem; color: #4b5563; line-height: 1.7;'>Chương trình <strong>" + p.Title + @"</strong> chính thức khởi động với hàng ngàn ưu đãi cực khủng. Cơ hội sở hữu các sản phẩm công nghệ đỉnh cao với mức giá chưa từng có.</p>
        
        <h3 style='font-size: 1.5rem; font-weight: 800; color: #111827; margin-top: 2rem; margin-bottom: 1rem; border-bottom: 2px solid #fecaca; padding-bottom: 0.5rem;'>🎁 Thông tin chi tiết</h3>
        
        <div style='display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;'>
            <div style='background: #f8fafc; padding: 1.5rem; border-radius: 0.75rem; border-left: 4px solid #3b82f6;'>
                <h4 style='font-weight: 700; color: #1e3a8a; margin-bottom: 0.5rem;'>Thời gian áp dụng</h4>
                <p style='color: #475569; margin: 0;'>Từ ngày hôm nay cho đến khi có thông báo mới hoặc hết bộ quà tặng.</p>
            </div>
            <div style='background: #f8fafc; padding: 1.5rem; border-radius: 0.75rem; border-left: 4px solid #10b981;'>
                <h4 style='font-weight: 700; color: #064e3b; margin-bottom: 0.5rem;'>Đối tượng áp dụng</h4>
                <p style='color: #475569; margin: 0;'>Dành cho tất cả khách hàng mua sắm trực tiếp tại showroom và qua website trực tuyến.</p>
            </div>
        </div>
        
        <div style='margin-top: 2rem; background: #fffbeb; padding: 1.5rem; border-radius: 0.75rem; border: 1px dashed #f59e0b; text-align: center;'>
            <p style='font-weight: 700; color: #b45309; margin: 0; font-size: 1.125rem;'>⚡ Nhanh tay lên! Số lượng quà tặng có hạn!</p>
        </div>
    </div>
</div>";
                var chosenPromoImg = promoImagesArray[hashValue % promoImagesArray.Length];
                p.UpdateDetails(p.Title, promoHtml, p.Category, string.IsNullOrEmpty(p.ThumbnailUrl) ? chosenPromoImg : p.ThumbnailUrl);
            }
            else
            {
                var articleHtml = @"<div class='not-prose space-y-6'>
    <div style='background: #f0f9ff; padding: 2rem; border-radius: 1rem; border-bottom: 5px solid #0ea5e9;'>
        <h2 style='font-size: 2rem; font-weight: 800; color: #0369a1; margin-bottom: 1rem;'>" + p.Title + @"</h2>
        <p style='font-size: 1.125rem; color: #334155; margin: 0; font-style: italic;'>Cùng Quang Hưởng Computer tìm hiểu chi tiết về chủ đề này.</p>
    </div>
    
    <div style='color: #334155; line-height: 1.8; font-size: 1.125rem;'>
        <p style='margin-bottom: 1.5rem;'>Nội dung chi tiết cho bài viết <strong>" + p.Title + @"</strong> đang được chúng tôi cập nhật. Đây là những thông tin quan trọng nhất giúp bạn có cái nhìn tổng quan và sâu sắc hơn về thế giới công nghệ.</p>
        
        <h3 style='font-size: 1.5rem; font-weight: 700; color: #0f172a; margin-top: 2rem; margin-bottom: 1rem;'>📌 Điểm nổi bật</h3>
        <ul style='list-style-type: none; padding-left: 0; margin-bottom: 2rem; color: #475569;'>
            <li style='margin-bottom: 0.5rem;'>✓ Thông tin chuẩn xác và được cập nhật mới nhất.</li>
            <li style='margin-bottom: 0.5rem;'>✓ Đánh giá khách quan dựa trên trải nghiệm thực tế.</li>
            <li>✓ Tham khảo ý kiến từ các chuyên gia hàng đầu.</li>
        </ul>
        
        <div style='background: #f8fafc; padding: 1.5rem; border-radius: 0.5rem; border-left: 4px solid #cbd5e1;'>
            <p style='margin: 0; color: #64748b;'><em>Đội ngũ biên tập viên của chúng tôi đang hoàn thiện nội dung này để mang đến cho bạn trải nghiệm đọc tốt nhất. Vui lòng quay lại sau!</em></p>
        </div>
    </div>
</div>";
                var chosenArticleImg = articleImagesArray[hashValue % articleImagesArray.Length];
                p.UpdateDetails(p.Title, articleHtml, p.Category, string.IsNullOrEmpty(p.ThumbnailUrl) ? chosenArticleImg : p.ThumbnailUrl);
            }
        }
        await context.SaveChangesAsync();

        // 2.7 Fix identical generic contents
        var promoIntros = new[] {
            "🚀 SIÊU ƯU ĐÃI ĐẶC BIỆT",
            "🔥 SĂN SALE CỰC ĐỈNH",
            "🎁 QUÀ TẶNG BẤT TẬN",
            "⭐ DEAL HOT TRONG TUẦN",
            "🎉 BÙNG NỔ ƯU ĐÃI"
        };
        var promoSubtitles = new[] {
            "Chào đón chương trình khuyến mãi lớn nhất trong năm!",
            "Cơ hội sắm đồ công nghệ với mức giá hủy diệt.",
            "Tri ân đặc biệt với hàng ngàn phần quà giá trị.",
            "Tiết kiệm tối đa - Nâng cấp tối ưu.",
            "Thời điểm vàng để sở hữu sản phẩm bạn yêu thích."
        };
        var articleIntros = new[] {
            "Cùng Quang Hưởng Computer tìm hiểu chi tiết về chủ đề này.",
            "Khám phá ngay những thông tin chuẩn xác và hấp dẫn nhất.",
            "Góc nhìn chuyên sâu và khách quan nhất về vấn đề này.",
            "Tất tần tật những điều bạn cần biết sẽ được bật mí.",
            "Những phân tích đáng giá nhất dành riêng cho bạn."
        };

        var genericPromoPosts = await context.Posts.Where(p => p.Content.Contains("🚀 SIÊU ƯU ĐÃI ĐẶC BIỆT") || p.Content.Contains("🔥 SĂN SALE CỰC ĐỈNH")).ToListAsync();
        foreach (var p in genericPromoPosts)
        {
            var hashValue = Math.Abs((p.Slug + p.Title).GetHashCode());
            var intro = promoIntros[hashValue % promoIntros.Length];
            var sub = promoSubtitles[(hashValue + 1) % promoSubtitles.Length];
            
            var newPromoHtml = @"<div class='not-prose space-y-6'>
    <div style='background: linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%); color: white; padding: 2rem; border-radius: 1rem; text-align: center; box-shadow: 0 10px 25px -5px rgba(255, 65, 108, 0.4);'>
        <h2 style='font-size: 2.5rem; font-weight: 900; margin-bottom: 1rem; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);'>" + intro + @"</h2>
        <p style='font-size: 1.25rem; opacity: 0.9; margin: 0;'>" + sub + @"</p>
    </div>
    
    <div style='background-color: white; border: 1px solid #fee2e2; border-radius: 1rem; padding: 2rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);'>
        <p style='font-size: 1.125rem; color: #4b5563; line-height: 1.7;'>Chương trình <strong>" + p.Title + @"</strong> chính thức khởi động với hàng ngàn ưu đãi cực khủng. Cơ hội sở hữu các sản phẩm công nghệ đỉnh cao với mức giá chưa từng có.</p>
        
        <h3 style='font-size: 1.5rem; font-weight: 800; color: #111827; margin-top: 2rem; margin-bottom: 1rem; border-bottom: 2px solid #fecaca; padding-bottom: 0.5rem;'>🎁 Thông tin chi tiết</h3>
        
        <div style='display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;'>
            <div style='background: #f8fafc; padding: 1.5rem; border-radius: 0.75rem; border-left: 4px solid #3b82f6;'>
                <h4 style='font-weight: 700; color: #1e3a8a; margin-bottom: 0.5rem;'>Thời gian áp dụng</h4>
                <p style='color: #475569; margin: 0;'>Từ ngày hôm nay cho đến khi có thông báo mới hoặc hết bộ quà tặng.</p>
            </div>
            <div style='background: #f8fafc; padding: 1.5rem; border-radius: 0.75rem; border-left: 4px solid #10b981;'>
                <h4 style='font-weight: 700; color: #064e3b; margin-bottom: 0.5rem;'>Đối tượng áp dụng</h4>
                <p style='color: #475569; margin: 0;'>Dành cho tất cả khách hàng mua sắm trực tiếp tại showroom và qua website trực tuyến.</p>
            </div>
        </div>
        
        <div style='margin-top: 2rem; background: #fffbeb; padding: 1.5rem; border-radius: 0.75rem; border: 1px dashed #f59e0b; text-align: center;'>
            <p style='font-weight: 700; color: #b45309; margin: 0; font-size: 1.125rem;'>⚡ Nhanh tay lên! Số lượng quà tặng có hạn!</p>
        </div>
    </div>
</div>";
            p.UpdateDetails(p.Title, newPromoHtml, p.Category, p.ThumbnailUrl);
        }

        var genericArticlePosts = await context.Posts.Where(p => p.Content.Contains("📌 Điểm nổi bật")).ToListAsync();
        foreach (var p in genericArticlePosts)
        {
            var hashValue = Math.Abs((p.Slug + p.Title).GetHashCode());
            var intro = articleIntros[hashValue % articleIntros.Length];
            var newArticleHtml = @"<div class='not-prose space-y-6'>
    <div style='background: #f0f9ff; padding: 2rem; border-radius: 1rem; border-bottom: 5px solid #0ea5e9;'>
        <h2 style='font-size: 2rem; font-weight: 800; color: #0369a1; margin-bottom: 1rem;'>" + p.Title + @"</h2>
        <p style='font-size: 1.125rem; color: #334155; margin: 0; font-style: italic;'>" + intro + @"</p>
    </div>
    
    <div style='color: #334155; line-height: 1.8; font-size: 1.125rem;'>
        <p style='margin-bottom: 1.5rem;'>Nội dung chi tiết cho bài viết <strong>" + p.Title + @"</strong> đang được chúng tôi cập nhật. Đây là những thông tin quan trọng nhất giúp bạn có cái nhìn tổng quan và sâu sắc hơn về thế giới công nghệ.</p>
        
        <h3 style='font-size: 1.5rem; font-weight: 700; color: #0f172a; margin-top: 2rem; margin-bottom: 1rem;'>📌 Điểm nổi bật</h3>
        <ul style='list-style-type: none; padding-left: 0; margin-bottom: 2rem; color: #475569;'>
            <li style='margin-bottom: 0.5rem;'>✓ Thông tin chuẩn xác và được cập nhật mới nhất.</li>
            <li style='margin-bottom: 0.5rem;'>✓ Đánh giá khách quan dựa trên trải nghiệm thực tế.</li>
            <li>✓ Tham khảo ý kiến từ các chuyên gia hàng đầu.</li>
        </ul>
        
        <div style='background: #f8fafc; padding: 1.5rem; border-radius: 0.5rem; border-left: 4px solid #cbd5e1;'>
            <p style='margin: 0; color: #64748b;'><em>Đội ngũ biên tập viên của chúng tôi đang hoàn thiện nội dung này để mang đến cho bạn trải nghiệm đọc tốt nhất. Vui lòng quay lại sau!</em></p>
        </div>
    </div>
</div>";
            p.UpdateDetails(p.Title, newArticleHtml, p.Category, p.ThumbnailUrl);
        }
        await context.SaveChangesAsync();

        // 3. Menus Upsert
        if (!await context.Menus.AnyAsync())
        {
            var headerMenu = new Menu("Header Main Navigation", "HeaderMain", MenuLocation.HeaderMain);
            headerMenu.AddItem(new MenuItem(headerMenu.Id, "Trang chủ", url: "/", icon: "Home", displayOrder: 1));
            headerMenu.AddItem(new MenuItem(headerMenu.Id, "Sản phẩm", url: "/products", icon: "Laptop", displayOrder: 2));
            headerMenu.AddItem(new MenuItem(headerMenu.Id, "Tin tức", url: "/policy/news", icon: "FileText", displayOrder: 3));
            headerMenu.AddItem(new MenuItem(headerMenu.Id, "Khuyến mãi", url: "/policy/promotions", icon: "Tag", displayOrder: 4));
            headerMenu.AddItem(new MenuItem(headerMenu.Id, "Liên hệ", url: "/lien-he", icon: "Phone", displayOrder: 5));
            context.Menus.Add(headerMenu);

            var footerMain = new Menu("Product Categories", "FooterMain", MenuLocation.FooterMain);
            footerMain.AddItem(new MenuItem(footerMain.Id, "Laptop Gaming", url: "/products?category=gaming", displayOrder: 1));
            footerMain.AddItem(new MenuItem(footerMain.Id, "Laptop Văn Phòng", url: "/products?category=office", displayOrder: 2));
            footerMain.AddItem(new MenuItem(footerMain.Id, "Linh Kiện PC", url: "/products?category=components", displayOrder: 3));
            footerMain.AddItem(new MenuItem(footerMain.Id, "Màn Hình", url: "/products?category=monitor", displayOrder: 4));
            footerMain.AddItem(new MenuItem(footerMain.Id, "Bàn Phím & Chuột", url: "/products?category=gear", displayOrder: 5));
            context.Menus.Add(footerMain);

            var footerBottom = new Menu("Support & Policy", "FooterBottom", MenuLocation.FooterBottom);
            footerBottom.AddItem(new MenuItem(footerBottom.Id, "Chính sách bảo hành", url: "/policy/bao-hanh", displayOrder: 1));
            footerBottom.AddItem(new MenuItem(footerBottom.Id, "Chính sách đổi trả", url: "/policy/doi-tra", displayOrder: 2));
            footerBottom.AddItem(new MenuItem(footerBottom.Id, "Chính sách vận chuyển", url: "/policy/van-chuyen", displayOrder: 3));
            footerBottom.AddItem(new MenuItem(footerBottom.Id, "Hướng dẫn thanh toán", url: "/policy/huong-dan-thanh-toan", displayOrder: 4));
            footerBottom.AddItem(new MenuItem(footerBottom.Id, "Giới thiệu", url: "/policy/gioi-thieu", displayOrder: 5));
            context.Menus.Add(footerBottom);
        }

        // 4. Homepage Sections Upsert
        if (!await context.HomepageSections.AnyAsync())
        {
            // Hero Slider
            var heroSliderConfig = @"{
                ""slides"": [
                    {
                        ""title"": ""CHÀO XUÂN BÍNH NGỌ 2026"",
                        ""subtitle"": ""DEALS TẾT KHỦNG - QUÀ TẶNG HOT"",
                        ""description"": ""Giảm đến 50% + Tặng kèm quà tặng trị giá 5 triệu"",
                        ""image"": ""https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=1200&h=500&fit=crop"",
                        ""gradient"": ""from-red-600 via-red-700 to-amber-600"",
                        ""link"": ""/products"",
                        ""badge"": ""HOT TẾT""
                    },
                    {
                        ""title"": ""PC GAMING CHIẾN MỌI GAME"",
                        ""subtitle"": ""RTX 40 SERIES - SIÊU MẠNH"",
                        ""description"": ""Build PC Gaming từ 15 triệu - Trả góp 0%"",
                        ""image"": ""https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=1200&h=500&fit=crop"",
                        ""gradient"": ""from-blue-600 via-purple-600 to-pink-600"",
                        ""link"": ""/products?category=pc-gaming"",
                        ""badge"": ""GAMING""
                    }
                ],
                ""showSidebar"": true
            }";
            var heroSlider = new HomepageSection("hero_slider", "Hero Slider", 1, heroSliderConfig);
            context.HomepageSections.Add(heroSlider);

            // Banner Grid
            var bannerGridConfig = @"{
                ""banners"": [
                    { ""title"": ""Quà Tặng Tết"", ""subtitle"": ""Trị giá lên đến 5 triệu"", ""icon"": ""Gift"", ""gradient"": ""from-red-500 to-pink-600"", ""link"": ""/products"" },
                    { ""title"": ""Trả Góp 0%"", ""subtitle"": ""Duyệt nhanh 5 phút"", ""icon"": ""Award"", ""gradient"": ""from-blue-500 to-cyan-600"", ""link"": ""/products"" },
                    { ""title"": ""Freeship Toàn Quốc"", ""subtitle"": ""Đơn từ 500.000đ"", ""icon"": ""Truck"", ""gradient"": ""from-emerald-500 to-green-600"", ""link"": ""/products"" }
                ],
                ""columns"": 3
            }";
            var bannerGrid = new HomepageSection("banner_grid", "Promo Banners", 2, bannerGridConfig);
            context.HomepageSections.Add(bannerGrid);

            // Flash Deal
            var flashDealConfig = @"{
                ""tag"": ""sale"",
                ""limit"": 5,
                ""showViewAll"": true
            }";
            var flashDeal = new HomepageSection("flash_deal", "Flash Sale", 3, flashDealConfig);
            context.HomepageSections.Add(flashDeal);

            // Category Grid
            var catGridConfig = @"{
                ""limit"": 8,
                ""columns"": 4
            }";
            var catGrid = new HomepageSection("category_grid", "Shop by Category", 4, catGridConfig);
            context.HomepageSections.Add(catGrid);

            // Product Grid - Laptop
            var laptopGridConfig = @"{
                ""icon"": ""Laptop"",
                ""limit"": 5
            }";
            var laptopGrid = new HomepageSection("product_grid", "LAPTOP - MÁY TÍNH XÁCH TAY", 5, laptopGridConfig);
            context.HomepageSections.Add(laptopGrid);

            // Post Grid
            var newsGridConfig = @"{
                ""postType"": ""News"",
                ""limit"": 4,
                ""columns"": 4
            }";
            var newsGrid = new HomepageSection("post_grid", "Latest News", 6, newsGridConfig);
            context.HomepageSections.Add(newsGrid);

            // Service Grid
            var serviceGridConfig = @"{
                ""services"": [
                    { ""icon"": ""ShieldCheck"", ""title"": ""BẢO HÀNH 36 THÁNG"", ""desc"": ""Chính hãng toàn quốc"" },
                    { ""icon"": ""Award"", ""title"": ""GIÁ TỐT NHẤT"", ""desc"": ""Cam kết hoàn tiền 200%"" },
                    { ""icon"": ""Truck"", ""title"": ""GIAO HÀNG NHANH"", ""desc"": ""Freeship toàn quốc"" },
                    { ""icon"": ""Wrench"", ""title"": ""HỖ TRỢ 24/7"", ""desc"": ""Tư vấn miễn phí"" }
                ],
                ""columns"": 4
            }";
            var serviceGrid = new HomepageSection("service_grid", "Our Services", 7, serviceGridConfig);
            context.HomepageSections.Add(serviceGrid);
        }

        await context.SaveChangesAsync();
    }

    private const string DefaultWarrantyContent = @"
<div class='space-y-8 text-gray-700 font-sans'>
    <div class='p-6 bg-blue-50 border-l-4 border-blue-500 rounded-r-xl'>
        <p class='text-lg font-medium text-blue-900'>
            <strong>Quang Hưởng Computer</strong> cam kết bảo hành các sản phẩm theo đúng quy định của nhà sản xuất và tiêu chuẩn chất lượng cao nhất. 
            Mọi sự cố kỹ thuật sẽ được đội ngũ kỹ thuật viên giàu kinh nghiệm của chúng tôi xử lý nhanh chóng.
        </p>
    </div>

    <section>
        <h2 class='text-2xl font-black text-gray-900 mb-4 border-b border-gray-200 pb-2 uppercase'>1. Điều kiện bảo hành hợp lệ</h2>
        <ul class='list-none space-y-3 pl-2'>
            <li class='flex items-start gap-3'>
                <span class='text-green-500 font-bold text-xl'>✓</span>
                <span>Sản phẩm đang trong thời hạn bảo hành. Thời hạn bảo hành được tính từ ngày mua hàng in trên hóa đơn hoặc tem bảo hành.</span>
            </li>
            <li class='flex items-start gap-3'>
                <span class='text-green-500 font-bold text-xl'>✓</span>
                <span>Tem bảo hành của Quang Hưởng Computer và nhà phân phối phải còn nguyên vẹn, không rách, rời, chắp vá, tẩy xóa.</span>
            </li>
            <li class='flex items-start gap-3'>
                <span class='text-green-500 font-bold text-xl'>✓</span>
                <span>Sản phẩm phát sinh lỗi kỹ thuật do nhà sản xuất.</span>
            </li>
            <li class='flex items-start gap-3'>
                <span class='text-green-500 font-bold text-xl'>✓</span>
                <span>Mã vạch (Serial Number) trên sản phẩm phải trùng khớp với thông tin trên hệ thống bảo hành hoặc phiếu bảo hành.</span>
            </li>
        </ul>
    </section>

    <section>
        <h2 class='text-2xl font-black text-gray-900 mb-4 border-b border-gray-200 pb-2 uppercase'>2. Những trường hợp từ chối bảo hành</h2>
        <p class='mb-4 italic text-sm text-gray-500'>Lưu ý: Những trường hợp sau đây sẽ không được bảo hành nhưng có thể được hỗ trợ sửa chữa có tính phí.</p>
        <ul class='list-none space-y-3 pl-2'>
            <li class='flex items-start gap-3'>
                <span class='text-red-500 font-bold text-xl'>✗</span>
                <span>Sản phẩm hết thời hạn bảo hành.</span>
            </li>
            <li class='flex items-start gap-3'>
                <span class='text-red-500 font-bold text-xl'>✗</span>
                <span>Hư hỏng do tác động vật lý: Rơi vỡ, móp méo, trầy xước nặng, biến dạng khung vỏ.</span>
            </li>
            <li class='flex items-start gap-3'>
                <span class='text-red-500 font-bold text-xl'>✗</span>
                <span>Hư hỏng do thiên tai, hỏa hoạn, lũ lụt, sét đánh, côn trùng xâm nhập (chuột, gián...).</span>
            </li>
            <li class='flex items-start gap-3'>
                <span class='text-red-500 font-bold text-xl'>✗</span>
                <span>Sử dụng sai điện áp quy định, gây cháy nổ linh kiện, mạch điện.</span>
            </li>
            <li class='flex items-start gap-3'>
                <span class='text-red-500 font-bold text-xl'>✗</span>
                <span>Sản phẩm đã bị can thiệp, tháo lắp, sửa chữa bởi các đơn vị không được ủy quyền.</span>
            </li>
        </ul>
    </section>

    <section>
        <h2 class='text-2xl font-black text-gray-900 mb-4 border-b border-gray-200 pb-2 uppercase'>3. Chính sách đổi mới 1-1</h2>
        <div class='bg-yellow-50 p-6 rounded-xl border border-yellow-100'>
            <h3 class='font-bold text-yellow-800 mb-2 uppercase text-sm tracking-wider'>Áp dụng trong 15 ngày đầu</h3>
            <p>
                Đối với các sản phẩm mới mua trong vòng <strong>15 ngày</strong> đầu tiên, nếu phát sinh lỗi phần cứng do nhà sản xuất, 
                Quang Hưởng Computer cam kết <strong>đổi mới ngay lập tức</strong> (đổi sản phẩm cùng loại, mới 100%).
            </p>
            <p class='mt-2 text-sm italic'>* Yêu cầu: Sản phẩm phải còn đầy đủ hộp, phụ kiện, không trầy xước.</p>
        </div>
    </section>

    <section>
        <h2 class='text-2xl font-black text-gray-900 mb-4 border-b border-gray-200 pb-2 uppercase'>4. Địa điểm & Thời gian bảo hành</h2>
        <div class='grid md:grid-cols-2 gap-6'>
            <div class='bg-gray-50 p-5 rounded-xl'>
                <h3 class='font-bold text-gray-900 mb-2'>Trung tâm bảo hành Hà Nội</h3>
                <p>Địa chỉ: 91 Nguyễn Xiển, Thanh Xuân, Hà Nội</p>
                <p>Hotline: 1800.6321 (Nhánh 2)</p>
            </div>
            <div class='bg-gray-50 p-5 rounded-xl'>
                <h3 class='font-bold text-gray-900 mb-2'>Thời gian tiếp nhận</h3>
                <p>Sáng: 8h30 - 12h00</p>
                <p>Chiều: 13h30 - 17h30</p>
                <p class='text-sm text-gray-500'>(Từ thứ 2 đến thứ 7, nghỉ Chủ Nhật và Lễ Tết)</p>
            </div>
        </div>
    </section>
</div>";

    private const string DefaultReturnContent = @"
<div class='space-y-8 text-gray-700 font-sans'>
    <p class='text-lg'>
        Để đảm bảo quyền lợi của khách hàng và uy tín của doanh nghiệp, Quang Hưởng Computer ban hành chính sách đổi trả hàng hóa cụ thể như sau:
    </p>

    <section>
        <h2 class='text-2xl font-black text-gray-900 mb-4 uppercase'>1. Thời gian đổi trả</h2>
        <div class='overflow-x-auto'>
            <table class='w-full border-collapse border border-gray-200 rounded-lg overflow-hidden'>
                <thead class='bg-gray-100'>
                    <tr>
                        <th class='border border-gray-200 p-4 text-left font-bold text-gray-900'>Loại sản phẩm</th>
                        <th class='border border-gray-200 p-4 text-left font-bold text-gray-900'>Thời gian áp dụng</th>
                        <th class='border border-gray-200 p-4 text-left font-bold text-gray-900'>Phí đổi trả</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class='border border-gray-200 p-4'>Linh kiện máy tính (VGA, CPU, RAM...)</td>
                        <td class='border border-gray-200 p-4'>3 ngày đầu (Lỗi NSX)</td>
                        <td class='border border-gray-200 p-4 text-green-600 font-bold'>Miễn phí</td>
                    </tr>
                    <tr>
                        <td class='border border-gray-200 p-4'>Linh kiện máy tính</td>
                        <td class='border border-gray-200 p-4'>Sau 3 ngày - 15 ngày</td>
                        <td class='border border-gray-200 p-4'>Giảm 10-20% giá trị</td>
                    </tr>
                    <tr>
                        <td class='border border-gray-200 p-4'>Laptop, PC đồng bộ</td>
                        <td class='border border-gray-200 p-4'>7 ngày đầu (Lỗi NSX)</td>
                        <td class='border border-gray-200 p-4 text-green-600 font-bold'>Miễn phí</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </section>

    <section>
        <h2 class='text-2xl font-black text-gray-900 mb-4 uppercase'>2. Điều kiện chấp nhận đổi trả</h2>
        <ul class='list-disc pl-5 space-y-2'>
            <li>Sản phẩm còn nguyên tem niêm phong của Quang Hưởng Computer và nhà sản xuất.</li>
            <li>Sản phẩm còn đầy đủ hộp (box), xốp đệm, sách hướng dẫn, đĩa driver và các phụ kiện đi kèm.</li>
            <li>Sản phẩm không bị trầy xước, móp méo, nứt vỡ, ẩm ướt, dính hóa chất.</li>
            <li>Hóa đơn mua hàng (VAT) và phiếu xuất kho còn nguyên vẹn.</li>
            <li><strong>Quà tặng khuyến mãi (nếu có)</strong> phải được hoàn trả đầy đủ. Nếu mất hoặc đã sử dụng, sẽ trừ phí theo giá trị quà tặng.</li>
        </ul>
    </section>

     <section>
        <h2 class='text-2xl font-black text-gray-900 mb-4 uppercase'>3. Quy trình thực hiện</h2>
        <ol class='list-decimal pl-5 space-y-3'>
            <li>Khách hàng liên hệ Hotline <strong>1800.6321</strong> hoặc mang sản phẩm trực tiếp đến cửa hàng để kiểm tra.</li>
            <li>Kỹ thuật viên sẽ thẩm định tình trạng sản phẩm (trong vòng 30 phút - 1 tiếng).</li>
            <li>Nếu đủ điều kiện đổi trả, nhân viên sẽ lập phiếu đổi trả và hoàn tiền hoặc đổi sản phẩm khác theo yêu cầu.</li>
        </ol>
    </section>
</div>";

    private const string DefaultShippingContent = @"
<div class='space-y-8 text-gray-700 font-sans'>
    <p class='text-lg'>
        Quang Hưởng Computer hợp tác với các đơn vị vận chuyển uy tín (Viettel Post, GHN, GHTK) để đảm bảo hàng hóa đến tay quý khách nhanh chóng và an toàn nhất.
    </p>

    <section>
        <h2 class='text-2xl font-black text-gray-900 mb-4 uppercase'>1. Phạm vi & Phí giao hàng</h2>
        <div class='grid md:grid-cols-2 gap-6'>
            <div class='border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow'>
                <h3 class='text-xl font-bold text-[#D70018] mb-2'>Nội thành Hà Nội</h3>
                <ul class='list-disc pl-5 space-y-2 text-sm'>
                    <li><strong>Miễn phí</strong> cho đơn hàng > 2.000.000 VND.</li>
                    <li>Phí ship 30.000 VND cho đơn hàng < 2.000.000 VND.</li>
                    <li>Giao hàng siêu tốc trong 2h (Ahamove/Grab): Tính theo cước thực tế.</li>
                </ul>
            </div>
            <div class='border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow'>
                <h3 class='text-xl font-bold text-[#D70018] mb-2'>Ngoại thành & Tỉnh khác</h3>
                <ul class='list-disc pl-5 space-y-2 text-sm'>
                    <li><strong>Miễn phí</strong> cho đơn hàng trọn bộ PC > 15.000.000 VND.</li>
                    <li>Phí ship tính theo bảng giá của đơn vị vận chuyển (Viettel Post/GHTK).</li>
                    <li>Thời gian nhận hàng: 2-5 ngày làm việc.</li>
                </ul>
            </div>
        </div>
    </section>

    <section>
        <h2 class='text-2xl font-black text-gray-900 mb-4 uppercase'>2. Chính sách kiểm hàng (Đồng kiểm)</h2>
        <p class='mb-4'>
            Chúng tôi KHUYẾN KHÍCH khách hàng kiểm tra hàng hóa ngay khi nhận từ nhân viên giao hàng.
        </p>
        <div class='bg-gray-100 p-5 rounded-lg text-sm'>
            <ul class='list-disc pl-5 space-y-2'>
                <li>Quý khách được phép mở hộp kiểm tra ngoại quan (không trầy xước, bể vỡ) và số lượng sản phẩm.</li>
                <li>Không hỗ trợ cắm điện, dùng thử sản phẩm khi nhận hàng (do quy định của đơn vị vận chuyển).</li>
                <li>Nếu phát hiện hàng hóa hư hỏng hoặc sai thiếu, vui lòng <strong>TỪ CHỐI NHẬN HÀNG</strong> và gọi ngay Hotline 1800.6321.</li>
            </ul>
        </div>
    </section>

    <section>
        <h2 class='text-2xl font-black text-gray-900 mb-4 uppercase'>3. Đóng gói bảo đảm</h2>
        <p>100% hàng hóa gửi đi đều được đóng gói theo quy chuẩn:</p>
        <ul class='list-disc pl-5 space-y-1 mt-2'>
            <li>Chèn xốp, mút nổ chống sốc dày.</li>
            <li>Dán tem niêm phong, băng keo cảnh báo ""Hàng dễ vỡ"".</li>
            <li>Chụp ảnh tình trạng hàng hóa trước khi gửi cho khách hàng.</li>
        </ul>
    </section>
</div>";

    private const string DefaultPaymentContent = @"
<div class='space-y-8 text-gray-700 font-sans'>
    <section>
         <h2 class='text-2xl font-black text-gray-900 mb-4 uppercase'>1. Thanh toán tiền mặt (COD)</h2>
         <p>Áp dụng cho đơn hàng giao tận nơi hoặc mua trực tiếp tại Showroom.</p>
         <ul class='list-disc pl-5 mt-2 space-y-1'>
            <li>Khách hàng kiểm tra hàng hóa và thanh toán trực tiếp cho nhân viên giao hàng.</li>
            <li>Với đơn hàng giá trị cao (> 50 triệu), vui lòng chuyển khoản cọc trước 1 phần.</li>
         </ul>
    </section>

    <section>
         <h2 class='text-2xl font-black text-gray-900 mb-4 uppercase'>2. Chuyển khoản ngân hàng</h2>
         <div class='bg-blue-50 border border-blue-200 rounded-xl p-6'>
            <p class='font-bold text-gray-900 mb-3'>Thông tin tài khoản công ty (Lấy hóa đơn VAT)</p>
            <div class='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                    <span class='block text-xs uppercase text-gray-500'>Ngân hàng</span>
                    <strong class='text-lg'>MB Bank (Quân Đội)</strong>
                </div>
                <div>
                     <span class='block text-xs uppercase text-gray-500'>Chủ tài khoản</span>
                    <strong class='text-lg uppercase'>CTCP MÁY TÍNH QUANG HƯỞNG</strong>
                </div>
                 <div class='col-span-2'>
                     <span class='block text-xs uppercase text-gray-500'>Số tài khoản</span>
                    <strong class='text-3xl text-[#D70018] tracking-widest'>8888.6666.9999</strong>
                </div>
            </div>
            <p class='mt-4 text-sm text-gray-600 italic'>* Nội dung chuyển khoản: Tên khách hàng + SĐT + Mã đơn hàng</p>
         </div>
    </section>

    <section>
         <h2 class='text-2xl font-black text-gray-900 mb-4 uppercase'>3. Trả góp 0%</h2>
         <p class='mb-2'>Hỗ trợ trả góp qua thẻ tín dụng (Visa, Master, JCB) của 28 ngân hàng liên kết.</p>
         <ul class='list-disc pl-5 space-y-1'>
            <li>Kỳ hạn linh hoạt: 3, 6, 9, 12 tháng.</li>
            <li>Phí chuyển đổi thấp.</li>
            <li>Thủ tục online đơn giản, không cần giấy tờ.</li>
         </ul>
    </section>
</div>";

    private const string DefaultAboutContent = "<p>Chào mừng đến với Quang Hưởng Computer! Thế giới công nghệ hàng đầu...</p>";
    private const string DefaultContactContent = "<p>Địa chỉ: 91 Nguyễn Xiển, Thanh Xuân, Hà Nội.</p>";

    // ==================== PROMOTION CONTENTS ====================
    private const string PromotionFlashSale = @"
<div class='space-y-6 not-prose'>
    <div style='background: linear-gradient(to right, #dc2626, #f97316); color: white; padding: 1.5rem; border-radius: 1rem;'>
        <h2 style='font-size: 1.875rem; font-weight: 900; margin-bottom: 0.5rem;'>🔥 FLASH SALE CUỐI TUẦN</h2>
        <p style='font-size: 1.25rem;'>Chỉ còn 48 giờ! Giảm đến 50% toàn bộ linh kiện PC</p>
        <p style='font-size: 0.875rem; margin-top: 0.5rem; opacity: 0.9;'>Áp dụng: Thứ 7 - Chủ Nhật hàng tuần | Số lượng có hạn</p>
    </div>

    <div class='grid md:grid-cols-2 gap-4'>
        <div style='background-color: #f9fafb; padding: 1.25rem; border-radius: 0.75rem; border-left: 4px solid #ef4444;'>
            <h3 style='font-weight: 700; font-size: 1.125rem; color: #111827; margin-bottom: 0.75rem;'>🎮 VGA Gaming</h3>
            <ul style='list-style: none; padding: 0; margin: 0; font-size: 0.875rem;'>
                <li style='margin-bottom: 0.5rem; color: #374151;'>✓ RTX 4070 Super - Giảm <strong style='color: #dc2626;'>3.000.000đ</strong></li>
                <li style='margin-bottom: 0.5rem; color: #374151;'>✓ RTX 4080 Super - Giảm <strong style='color: #dc2626;'>4.500.000đ</strong></li>
                <li style='color: #374151;'>✓ RX 7900 XTX - Giảm <strong style='color: #dc2626;'>5.000.000đ</strong></li>
            </ul>
        </div>
        <div style='background-color: #f9fafb; padding: 1.25rem; border-radius: 0.75rem; border-left: 4px solid #3b82f6;'>
            <h3 style='font-weight: 700; font-size: 1.125rem; color: #111827; margin-bottom: 0.75rem;'>💻 CPU & Mainboard</h3>
            <ul style='list-style: none; padding: 0; margin: 0; font-size: 0.875rem;'>
                <li style='margin-bottom: 0.5rem; color: #374151;'>✓ Intel Core i7-14700K - Giảm <strong style='color: #dc2626;'>1.500.000đ</strong></li>
                <li style='margin-bottom: 0.5rem; color: #374151;'>✓ AMD Ryzen 7 7800X3D - Giảm <strong style='color: #dc2626;'>2.000.000đ</strong></li>
                <li style='color: #374151;'>✓ Combo Main + CPU - Giảm thêm <strong style='color: #dc2626;'>500.000đ</strong></li>
            </ul>
        </div>
    </div>

    <div style='background-color: #fefce8; border: 1px solid #fef08a; padding: 1rem; border-radius: 0.75rem;'>
        <p style='font-weight: 700; color: #854d0e; margin: 0;'>⚡ LƯU Ý: Ưu đãi không áp dụng cùng các chương trình khuyến mãi khác. Số lượng có hạn, áp dụng theo thứ tự đặt hàng.</p>
    </div>
</div>";

    private const string PromotionLaptopGift = @"
<div class='space-y-6 not-prose'>
    <div style='background: linear-gradient(to right, #2563eb, #9333ea); color: white; padding: 1.5rem; border-radius: 1rem;'>
        <h2 style='font-size: 1.875rem; font-weight: 900; margin-bottom: 0.5rem; color: white;'>🎁 MUA LAPTOP - NHẬN QUÀ KHỦNG</h2>
        <p style='font-size: 1.25rem; margin: 0; color: white;'>Tặng ngay combo Balo + Chuột Gaming trị giá 1.500.000đ</p>
    </div>

    <div class='space-y-4'>
        <h3 style='font-size: 1.25rem; font-weight: 700; color: #111827;'>📦 Quà tặng bao gồm:</h3>
        <div style='display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;'>
            <div style='background-color: white; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border-radius: 0.75rem; padding: 1rem; text-align: center; border: 1px solid #f3f4f6;'>
                <div style='font-size: 2.25rem; margin-bottom: 0.5rem;'>🎒</div>
                <p style='font-weight: 700; margin: 0; color: #111827;'>Balo Laptop Gaming</p>
                <p style='font-size: 0.875rem; color: #6b7280; margin: 0;'>Trị giá 800.000đ</p>
            </div>
            <div style='background-color: white; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border-radius: 0.75rem; padding: 1rem; text-align: center; border: 1px solid #f3f4f6;'>
                <div style='font-size: 2.25rem; margin-bottom: 0.5rem;'>🖱️</div>
                <p style='font-weight: 700; margin: 0; color: #111827;'>Chuột Gaming RGB</p>
                <p style='font-size: 0.875rem; color: #6b7280; margin: 0;'>Trị giá 500.000đ</p>
            </div>
            <div style='background-color: white; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border-radius: 0.75rem; padding: 1rem; text-align: center; border: 1px solid #f3f4f6;'>
                <div style='font-size: 2.25rem; margin-bottom: 0.5rem;'>🎧</div>
                <p style='font-weight: 700; margin: 0;'>Tai nghe Gaming</p>
                <p style='font-size: 0.875rem; color: #6b7280; margin: 0;'>Trị giá 200.000đ</p>
            </div>
        </div>
    </div>

    <div style='background-color: #f0fdf4; padding: 1.25rem; border-radius: 0.75rem; border: 1px solid #dcfce7;'>
        <h3 style='font-weight: 700; color: #166534; margin-bottom: 0.75rem;'>✅ Điều kiện áp dụng:</h3>
        <ul style='list-style: none; padding: 0; margin: 0; font-size: 0.875rem;'>
            <li style='margin-bottom: 0.5rem;'>• Áp dụng cho đơn hàng Laptop từ <strong style='font-weight: 700;'>15.000.000đ</strong> trở lên</li>
            <li style='margin-bottom: 0.5rem;'>• Khách hàng mới được tặng thêm voucher <strong style='font-weight: 700;'>200.000đ</strong> cho lần mua tiếp theo</li>
            <li>• Miễn phí vận chuyển toàn quốc</li>
        </ul>
    </div>
</div>";

    private const string PromotionTradeIn = @"
<div class='space-y-6 not-prose'>
    <div style='background: linear-gradient(to right, #16a34a, #14b8a6); color: white; padding: 1.5rem; border-radius: 1rem;'>
        <h2 style='font-size: 1.875rem; font-weight: 900; margin-bottom: 0.5rem; color: white;'>♻️ TRADE-IN VGA CŨ</h2>
        <p style='font-size: 1.25rem; margin: 0; color: white;'>Thu cũ giá cao - Lên đời RTX 50 Series giảm thêm 2.000.000đ</p>
    </div>

    <div style='overflow-x: auto;'>
        <table style='width: 100%; border-collapse: collapse;'>
            <thead style='background-color: #f3f4f6;'>
                <tr>
                    <th style='padding: 1rem; text-align: left; font-weight: 700; color: #111827;'>VGA Cũ</th>
                    <th style='padding: 1rem; text-align: left; font-weight: 700; color: #111827;'>Giá Thu</th>
                    <th style='padding: 1rem; text-align: left; font-weight: 700; color: #111827;'>Đổi Lên</th>
                    <th style='padding: 1rem; text-align: left; font-weight: 700; color: #111827;'>Bù Thêm</th>
                </tr>
            </thead>
            <tbody>
                <tr style='border-bottom: 1px solid #e5e7eb;'>
                    <td style='padding: 1rem; color: #374151;'>RTX 3070/3070 Ti</td>
                    <td style='padding: 1rem; color: #16a34a; font-weight: 700;'>5.000.000đ</td>
                    <td style='padding: 1rem; color: #374151;'>RTX 5070</td>
                    <td style='padding: 1rem; color: #dc2626; font-weight: 700;'>Từ 10.990.000đ</td>
                </tr>
                <tr style='border-bottom: 1px solid #e5e7eb;'>
                    <td style='padding: 1rem; color: #374151;'>RTX 3080/3080 Ti</td>
                    <td style='padding: 1rem; color: #16a34a; font-weight: 700;'>7.000.000đ</td>
                    <td style='padding: 1rem; color: #374151;'>RTX 5080</td>
                    <td style='padding: 1rem; color: #dc2626; font-weight: 700;'>Từ 18.990.000đ</td>
                </tr>
                <tr style='border-bottom: 1px solid #e5e7eb;'>
                    <td style='padding: 1rem; color: #374151;'>RTX 4070 Super</td>
                    <td style='padding: 1rem; color: #16a34a; font-weight: 700;'>10.000.000đ</td>
                    <td style='padding: 1rem; color: #374151;'>RTX 5080</td>
                    <td style='padding: 1rem; color: #dc2626; font-weight: 700;'>Từ 15.990.000đ</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div style='background-color: #eff6ff; padding: 1.25rem; border-radius: 0.75rem;'>
        <p style='font-weight: 700; color: #1e40af; margin: 0;'>💡 Lưu ý: VGA cần còn hoạt động tốt, không lỗi phần cứng. Giá thu có thể thay đổi tùy tình trạng sản phẩm.</p>
    </div>
</div>";

    private const string PromotionBackToSchool = @"
<div class='space-y-6 not-prose'>
    <div style='background: linear-gradient(to right, #4f46e5, #ec4899); color: white; padding: 1.5rem; border-radius: 1rem;'>
        <h2 style='font-size: 1.875rem; font-weight: 900; margin-bottom: 0.5rem; color: white;'>📚 BACK TO SCHOOL 2026</h2>
        <p style='font-size: 1.25rem; margin: 0; color: white;'>Sinh viên giảm ngay 10% - Tối đa 3.000.000đ khi mua PC/Laptop</p>
    </div>

    <div style='display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;'>
        <div style='background-color: white; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border-radius: 0.75rem; padding: 1.25rem;'>
            <h3 style='font-weight: 700; font-size: 1.125rem; margin-bottom: 0.75rem; color: #111827;'>🎓 Đối tượng áp dụng</h3>
            <ul style='list-style: none; padding: 0; margin: 0; font-size: 0.875rem; color: #374151;'>
                <li style='margin-bottom: 0.5rem;'>✓ Học sinh THPT (có thẻ học sinh)</li>
                <li style='margin-bottom: 0.5rem;'>✓ Sinh viên Đại học/Cao đẳng (có thẻ SV)</li>
                <li>✓ Học viên các trung tâm đào tạo IT</li>
            </ul>
        </div>
        <div style='background-color: white; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border-radius: 0.75rem; padding: 1.25rem;'>
            <h3 style='font-weight: 700; font-size: 1.125rem; margin-bottom: 0.75rem; color: #111827;'>🎁 Ưu đãi thêm</h3>
            <ul style='list-style: none; padding: 0; margin: 0; font-size: 0.875rem; color: #374151;'>
                <li style='margin-bottom: 0.5rem;'>✓ Trả góp 0% lãi suất 12 tháng</li>
                <li style='margin-bottom: 0.5rem;'>✓ Tặng phần mềm Office 365 bản quyền</li>
                <li>✓ Miễn phí cài đặt phần mềm học tập</li>
            </ul>
        </div>
    </div>

    <div style='background: linear-gradient(to right, #fefce8, #ffedd5); padding: 1.25rem; border-radius: 0.75rem;'>
        <p style='font-weight: 700; color: #c2410c; margin: 0;'>📅 Thời gian: 15/08 - 30/09/2026 | Chỉ cần xuất trình thẻ HSSV khi mua hàng</p>
    </div>
</div>";

    private const string PromotionComboPC = @"
<div class='space-y-6 not-prose'>
    <div style='background: linear-gradient(to right, #111827, #374151); color: white; padding: 1.5rem; border-radius: 1rem;'>
        <h2 style='font-size: 1.875rem; font-weight: 900; margin-bottom: 0.5rem; color: white;'>🖥️ COMBO BUILD PC GAMING</h2>
        <p style='font-size: 1.25rem; margin: 0; color: white;'>Mua theo combo - Tiết kiệm đến 5.000.000đ so với mua lẻ</p>
    </div>

    <div style='display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;'>
        <div style='background-color: white; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border-radius: 0.75rem; overflow: hidden;'>
            <div style='background-color: #3b82f6; color: white; padding: 0.75rem; text-align: center; font-weight: 700;'>COMBO ENTRY</div>
            <div style='padding: 1.25rem;'>
                <p style='font-size: 1.5rem; font-weight: 900; text-align: center; margin-bottom: 1rem; color: #111827;'>15.990.000đ</p>
                <ul style='list-style: none; padding: 0; margin: 0; font-size: 0.875rem; color: #374151;'>
                    <li style='margin-bottom: 0.5rem;'>• CPU: Intel i5-14400F</li>
                    <li style='margin-bottom: 0.5rem;'>• VGA: RTX 4060</li>
                    <li style='margin-bottom: 0.5rem;'>• RAM: 16GB DDR5</li>
                    <li>• SSD: 512GB NVMe</li>
                </ul>
                <p style='color: #16a34a; font-weight: 700; text-align: center; margin-top: 1rem;'>Tiết kiệm 2.000.000đ</p>
            </div>
        </div>
        <div style='background-color: white; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border-radius: 0.75rem; overflow: hidden; border: 2px solid #ef4444;'>
            <div style='background-color: #ef4444; color: white; padding: 0.75rem; text-align: center; font-weight: 700;'>COMBO HOT 🔥</div>
            <div style='padding: 1.25rem;'>
                <p style='font-size: 1.5rem; font-weight: 900; text-align: center; margin-bottom: 1rem; color: #111827;'>25.990.000đ</p>
                <ul style='list-style: none; padding: 0; margin: 0; font-size: 0.875rem; color: #374151;'>
                    <li style='margin-bottom: 0.5rem;'>• CPU: Intel i7-14700KF</li>
                    <li style='margin-bottom: 0.5rem;'>• VGA: RTX 4070 Super</li>
                    <li style='margin-bottom: 0.5rem;'>• RAM: 32GB DDR5</li>
                    <li>• SSD: 1TB NVMe</li>
                </ul>
                <p style='color: #16a34a; font-weight: 700; text-align: center; margin-top: 1rem;'>Tiết kiệm 3.500.000đ</p>
            </div>
        </div>
        <div style='background-color: white; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border-radius: 0.75rem; overflow: hidden;'>
            <div style='background-color: #a855f7; color: white; padding: 0.75rem; text-align: center; font-weight: 700;'>COMBO ULTRA</div>
            <div style='padding: 1.25rem;'>
                <p style='font-size: 1.5rem; font-weight: 900; text-align: center; margin-bottom: 1rem; color: #111827;'>45.990.000đ</p>
                <ul style='list-style: none; padding: 0; margin: 0; font-size: 0.875rem; color: #374151;'>
                    <li style='margin-bottom: 0.5rem;'>• CPU: Intel i9-14900K</li>
                    <li style='margin-bottom: 0.5rem;'>• VGA: RTX 4080 Super</li>
                    <li style='margin-bottom: 0.5rem;'>• RAM: 64GB DDR5</li>
                    <li>• SSD: 2TB NVMe</li>
                </ul>
                <p style='color: #16a34a; font-weight: 700; text-align: center; margin-top: 1rem;'>Tiết kiệm 5.000.000đ</p>
            </div>
        </div>
    </div>
</div>";

    private const string PromotionMBBank = @"
<div class='space-y-6 not-prose'>
    <div style='background: linear-gradient(to right, #7e22ce, #2563eb); color: white; padding: 1.5rem; border-radius: 1rem;'>
        <h2 style='font-size: 1.875rem; font-weight: 900; margin-bottom: 0.5rem; color: white;'>💳 MỞ THẺ MB BANK</h2>
        <p style='font-size: 1.25rem; margin: 0; color: white;'>Giảm thêm 500.000đ cho đơn hàng từ 10.000.000đ</p>
    </div>

    <div style='display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;'>
        <div style='background-color: white; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border-radius: 0.75rem; padding: 1.25rem;'>
            <h3 style='font-weight: 700; font-size: 1.125rem; margin-bottom: 0.75rem; color: #111827;'>🎯 Ưu đãi khi mở thẻ</h3>
            <ul style='list-style: none; padding: 0; margin: 0; color: #374151;'>
                <li style='margin-bottom: 0.5rem;'><span style='color: #22c55e;'>✓</span> Giảm ngay 500.000đ</li>
                <li style='margin-bottom: 0.5rem;'><span style='color: #22c55e;'>✓</span> Hoàn tiền 1% mọi giao dịch</li>
                <li style='margin-bottom: 0.5rem;'><span style='color: #22c55e;'>✓</span> Trả góp 0% lãi suất 6 tháng</li>
                <li><span style='color: #22c55e;'>✓</span> Miễn phí thường niên năm đầu</li>
            </ul>
        </div>
        <div style='background-color: white; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border-radius: 0.75rem; padding: 1.25rem;'>
            <h3 style='font-weight: 700; font-size: 1.125rem; margin-bottom: 0.75rem; color: #111827;'>📝 Điều kiện</h3>
            <ul style='list-style: none; padding: 0; margin: 0; font-size: 0.875rem; color: #374151;'>
                <li style='margin-bottom: 0.5rem;'>• Công dân Việt Nam từ 18 tuổi</li>
                <li style='margin-bottom: 0.5rem;'>• Có thu nhập ổn định từ 5 triệu/tháng</li>
                <li style='margin-bottom: 0.5rem;'>• Chỉ cần CCCD gắn chip</li>
                <li>• Duyệt nhanh trong 15 phút</li>
            </ul>
        </div>
    </div>
</div>";

    // ==================== NEWS CONTENTS ====================
    private const string NewsKhaiTruong = @"
<div class='space-y-6'>
    <p style='font-size: 1.125rem;'>Quang Hưởng Computer chính thức khai trương chi nhánh thứ 3 tại số 123 Cầu Giấy, Hà Nội. Đây là showroom lớn nhất của chúng tôi với diện tích hơn 500m², trưng bày đầy đủ các sản phẩm từ PC Gaming, Laptop, đến linh kiện cao cấp.</p>

    <div style='background-color: #fef2f2; padding: 1.25rem; border-radius: 0.75rem;'>
        <h3 style='font-weight: 700; color: #991b1b; font-size: 1.125rem; margin-bottom: 0.75rem;'>🎉 Ưu đãi khai trương (Chỉ trong 7 ngày đầu)</h3>
        <ul style='list-style: none; padding: 0; margin: 0; color: #111827;'>
            <li style='margin-bottom: 0.5rem;'>✓ Giảm ngay 10% tất cả sản phẩm</li>
            <li style='margin-bottom: 0.5rem;'>✓ Tặng voucher 500.000đ cho 100 khách đầu tiên mỗi ngày</li>
            <li style='margin-bottom: 0.5rem;'>✓ Quay số trúng thưởng VGA RTX 4070 mỗi ngày</li>
            <li>✓ Miễn phí lắp ráp và cài đặt tại chỗ</li>
        </ul>
    </div>

    <div style='display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;'>
        <div style='background-color: #f9fafb; padding: 1rem; border-radius: 0.75rem;'>
            <h4 style='font-weight: 700; margin-bottom: 0.5rem; color: #111827;'>📍 Địa chỉ mới</h4>
            <p style='margin: 0; color: #374151;'>123 Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội</p>
        </div>
        <div style='background-color: #f9fafb; padding: 1rem; border-radius: 0.75rem;'>
            <h4 style='font-weight: 700; margin-bottom: 0.5rem; color: #111827;'>🕐 Giờ mở cửa</h4>
            <p style='margin: 0; color: #374151;'>8:30 - 21:30 (Tất cả các ngày trong tuần)</p>
        </div>
    </div>
</div>";

    private const string NewsRTX5090 = @"
<div class='space-y-6'>
    <p style='font-size: 1.125rem;'>NVIDIA vừa chính thức công bố dòng card đồ họa GeForce RTX 5090 với hiệu năng được cho là gấp đôi thế hệ RTX 4090 trước đó, mở ra kỷ nguyên mới cho gaming và AI.</p>

    <div style='background-color: #f0fdf4; padding: 1.25rem; border-radius: 0.75rem;'>
        <h3 style='font-weight: 700; color: #166534; font-size: 1.125rem; margin-bottom: 0.75rem;'>📊 Thông số kỹ thuật RTX 5090</h3>
        <div style='display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; font-size: 0.875rem;'>
            <div style='color: #111827;'>
                <p style='margin-bottom: 0.25rem;'><strong style='font-weight: 700;'>GPU:</strong> Blackwell GB202</p>
                <p style='margin-bottom: 0.25rem;'><strong style='font-weight: 700;'>CUDA Cores:</strong> 21,760 cores</p>
                <p style='margin: 0;'><strong style='font-weight: 700;'>Boost Clock:</strong> 2.9 GHz</p>
            </div>
            <div style='color: #111827;'>
                <p style='margin-bottom: 0.25rem;'><strong style='font-weight: 700;'>VRAM:</strong> 32GB GDDR7</p>
                <p style='margin-bottom: 0.25rem;'><strong style='font-weight: 700;'>TDP:</strong> 575W</p>
                <p style='margin: 0;'><strong style='font-weight: 700;'>Giá dự kiến:</strong> Từ 49.990.000đ</p>
            </div>
        </div>
    </div>

    <p style='color: #374151;'>RTX 5090 hứa hẹn sẽ là lựa chọn hàng đầu cho các game thủ và nhà sáng tạo nội dung yêu cầu hiệu năng cực cao. Quang Hưởng Computer hiện đang nhận đặt trước với ưu đãi giảm 2 triệu cho 50 khách hàng đầu tiên.</p>
</div>";

    private const string NewsAMDZen5 = @"
<div class='space-y-6'>
    <p style='font-size: 1.125rem;'>AMD chính thức giới thiệu kiến trúc Zen 5 với dòng CPU Ryzen 9000 Series, hứa hẹn hiệu năng IPC tăng 15-20% so với Zen 4, cạnh tranh trực tiếp với Intel Core Ultra.</p>

    <div style='display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;'>
        <div style='background-color: #fff7ed; padding: 1.25rem; border-radius: 0.75rem;'>
            <h3 style='font-weight: 700; color: #9a3412; margin-bottom: 0.75rem;'>🔥 Điểm nổi bật Zen 5</h3>
            <ul style='list-style: none; padding: 0; margin: 0; font-size: 0.875rem; color: #111827;'>
                <li style='margin-bottom: 0.5rem;'>✓ Tiến trình 4nm TSMC</li>
                <li style='margin-bottom: 0.5rem;'>✓ IPC tăng 15-20%</li>
                <li style='margin-bottom: 0.5rem;'>✓ Hỗ trợ DDR5-6400</li>
                <li>✓ PCIe 5.0 x24 lanes</li>
            </ul>
        </div>
        <div style='background-color: #eff6ff; padding: 1.25rem; border-radius: 0.75rem;'>
            <h3 style='font-weight: 700; color: #1e40af; margin-bottom: 0.75rem;'>💰 Giá dự kiến tại VN</h3>
            <ul style='list-style: none; padding: 0; margin: 0; font-size: 0.875rem; color: #111827;'>
                <li style='margin-bottom: 0.5rem;'>Ryzen 5 9600X: ~6.500.000đ</li>
                <li style='margin-bottom: 0.5rem;'>Ryzen 7 9700X: ~9.500.000đ</li>
                <li style='margin-bottom: 0.5rem;'>Ryzen 9 9900X: ~13.500.000đ</li>
                <li>Ryzen 9 9950X: ~18.500.000đ</li>
            </ul>
        </div>
    </div>
</div>";

    private const string NewsCanhBao = @"
<div class='space-y-6'>
    <div style='background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 1.25rem;'>
        <h2 class='text-xl font-bold text-red-800 mb-2'>⚠️ CẢNH BÁO KHẨN CẤP</h2>
        <p>Gần đây xuất hiện nhiều trang web và fanpage giả mạo Quang Hưởng Computer để lừa đảo khách hàng.</p>
    </div>

    <div class='space-y-4'>
        <h3 class='font-bold text-lg'>🔍 Cách nhận biết trang giả mạo:</h3>
        <ul class='space-y-2'>
            <li class='flex items-start gap-2'><span class='text-red-500'>✗</span> Giá bán thấp hơn 30-50% so với thị trường</li>
            <li class='flex items-start gap-2'><span class='text-red-500'>✗</span> Yêu cầu chuyển khoản trước 100%</li>
            <li class='flex items-start gap-2'><span class='text-red-500'>✗</span> Không có địa chỉ showroom rõ ràng</li>
            <li class='flex items-start gap-2'><span class='text-red-500'>✗</span> Fanpage mới lập, ít tương tác</li>
        </ul>
    </div>

    <div class='bg-green-50 p-5 rounded-xl'>
        <h3 class='font-bold text-green-800 mb-3'>✅ Kênh chính thức của Quang Hưởng Computer:</h3>
        <ul class='space-y-2'>
            <li>Website: <strong>quanghuong.vn</strong></li>
            <li>Facebook: <strong>fb.com/QuangHuongComputer</strong> (Tick xanh)</li>
            <li>Hotline: <strong>1800.6321</strong> (Miễn phí)</li>
        </ul>
    </div>
</div>";

    // ==================== ARTICLE CONTENTS ====================
    private const string ArticleTop10Laptop = @"
<div class='space-y-6'>
    <p class='text-lg'>Năm 2026 chứng kiến sự bùng nổ của các mẫu laptop gaming với chip Intel Core Ultra và AMD Ryzen 9000 Series. Dưới đây là 10 mẫu laptop gaming đáng mua nhất được đội ngũ Quang Hưởng Computer tuyển chọn.</p>

    <div class='space-y-4'>
        <div class='bg-white shadow-lg rounded-xl p-5 border-l-4 border-yellow-500'>
            <div class='flex justify-between items-start'>
                <div>
                    <span class='bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded'>TOP 1</span>
                    <h3 class='font-bold text-xl mt-2'>ASUS ROG Strix G16 2026</h3>
                    <p class='text-gray-600'>Intel Core Ultra 9 | RTX 5070 | 32GB RAM</p>
                </div>
                <p class='text-2xl font-black text-red-600'>42.990.000đ</p>
            </div>
        </div>

        <div class='bg-white shadow-lg rounded-xl p-5 border-l-4 border-gray-400'>
            <div class='flex justify-between items-start'>
                <div>
                    <span class='bg-gray-400 text-white text-xs font-bold px-2 py-1 rounded'>TOP 2</span>
                    <h3 class='font-bold text-xl mt-2'>Lenovo Legion Pro 7i</h3>
                    <p class='text-gray-600'>Intel Core Ultra 7 | RTX 4080 | 32GB RAM</p>
                </div>
                <p class='text-2xl font-black text-red-600'>38.990.000đ</p>
            </div>
        </div>

        <div class='bg-white shadow-lg rounded-xl p-5 border-l-4 border-orange-400'>
            <div class='flex justify-between items-start'>
                <div>
                    <span class='bg-orange-400 text-white text-xs font-bold px-2 py-1 rounded'>TOP 3</span>
                    <h3 class='font-bold text-xl mt-2'>MSI Raider GE78 HX</h3>
                    <p class='text-gray-600'>Intel Core i9-14900HX | RTX 4090 | 64GB RAM</p>
                </div>
                <p class='text-2xl font-black text-red-600'>75.990.000đ</p>
            </div>
        </div>
    </div>

    <p class='italic text-gray-500'>Xem đầy đủ danh sách và đánh giá chi tiết tại showroom Quang Hưởng Computer.</p>
</div>";

    private const string ArticleBuildPC = @"
<div class='space-y-6'>
    <p class='text-lg'>Với ngân sách 25 triệu đồng năm 2026, bạn hoàn toàn có thể sở hữu một bộ PC Gaming chiến mượt mọi tựa game ở độ phân giải 1080p Ultra và 1440p High.</p>

    <div class='bg-gray-900 text-white p-6 rounded-xl'>
        <h3 class='text-xl font-bold mb-4 text-center'>💻 CẤU HÌNH ĐỀ XUẤT - 25 TRIỆU</h3>
        <div class='space-y-3'>
            <div class='flex justify-between border-b border-gray-700 pb-2'>
                <span>CPU</span>
                <span class='font-bold'>Intel Core i5-14400F</span>
            </div>
            <div class='flex justify-between border-b border-gray-700 pb-2'>
                <span>Mainboard</span>
                <span class='font-bold'>MSI B760M Mortar WiFi</span>
            </div>
            <div class='flex justify-between border-b border-gray-700 pb-2'>
                <span>VGA</span>
                <span class='font-bold'>RTX 4060 Ti 8GB</span>
            </div>
            <div class='flex justify-between border-b border-gray-700 pb-2'>
                <span>RAM</span>
                <span class='font-bold'>32GB DDR5 5600MHz</span>
            </div>
            <div class='flex justify-between border-b border-gray-700 pb-2'>
                <span>SSD</span>
                <span class='font-bold'>1TB NVMe Gen4</span>
            </div>
            <div class='flex justify-between border-b border-gray-700 pb-2'>
                <span>PSU</span>
                <span class='font-bold'>650W 80+ Bronze</span>
            </div>
            <div class='flex justify-between border-b border-gray-700 pb-2'>
                <span>Case</span>
                <span class='font-bold'>NZXT H5 Flow</span>
            </div>
            <div class='flex justify-between pt-2 text-xl'>
                <span class='text-green-400 font-bold'>TỔNG</span>
                <span class='text-green-400 font-bold'>24.990.000đ</span>
            </div>
        </div>
    </div>

    <p>Liên hệ Quang Hưởng Computer để được tư vấn và build PC miễn phí!</p>
</div>";

    private const string ArticleCompare = @"
<div class='space-y-6'>
    <p class='text-lg'>Cuộc chiến giữa Intel và AMD năm 2026 càng trở nên gay cấn với sự ra mắt của Intel Core Ultra và AMD Ryzen 9000 Series. Cùng so sánh chi tiết để chọn CPU phù hợp nhất!</p>

    <div class='overflow-x-auto'>
        <table class='w-full border-collapse bg-white shadow-lg rounded-xl overflow-hidden'>
            <thead class='bg-gray-900 text-white'>
                <tr>
                    <th class='p-4 text-left'>Thông số</th>
                    <th class='p-4 text-center text-blue-400'>Intel Core Ultra 9</th>
                    <th class='p-4 text-center text-red-400'>AMD Ryzen 9 9950X</th>
                </tr>
            </thead>
            <tbody>
                <tr class='border-b'>
                    <td class='p-4 font-bold'>Số nhân/luồng</td>
                    <td class='p-4 text-center'>24C/32T</td>
                    <td class='p-4 text-center'>16C/32T</td>
                </tr>
                <tr class='border-b bg-gray-50'>
                    <td class='p-4 font-bold'>Base/Boost Clock</td>
                    <td class='p-4 text-center'>2.5/5.8 GHz</td>
                    <td class='p-4 text-center'>4.3/5.7 GHz</td>
                </tr>
                <tr class='border-b'>
                    <td class='p-4 font-bold'>TDP</td>
                    <td class='p-4 text-center'>125W</td>
                    <td class='p-4 text-center'>170W</td>
                </tr>
                <tr class='border-b bg-gray-50'>
                    <td class='p-4 font-bold'>Giá</td>
                    <td class='p-4 text-center font-bold text-blue-600'>~16.000.000đ</td>
                    <td class='p-4 text-center font-bold text-red-600'>~18.500.000đ</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class='grid md:grid-cols-2 gap-4'>
        <div class='bg-blue-50 p-4 rounded-xl'>
            <h4 class='font-bold text-blue-800 mb-2'>Chọn Intel Core Ultra nếu:</h4>
            <ul class='text-sm space-y-1'>
                <li>✓ Ưu tiên hiệu năng đơn nhân</li>
                <li>✓ Cần tính năng AI on-chip</li>
                <li>✓ Ngân sách hạn chế hơn</li>
            </ul>
        </div>
        <div class='bg-red-50 p-4 rounded-xl'>
            <h4 class='font-bold text-red-800 mb-2'>Chọn AMD Ryzen 9000 nếu:</h4>
            <ul class='text-sm space-y-1'>
                <li>✓ Cần hiệu năng đa nhân cao</li>
                <li>✓ Làm việc render, encode video</li>
                <li>✓ Muốn nền tảng AM5 lâu dài</li>
            </ul>
        </div>
    </div>
</div>";

    private const string ArticleMistakes = @"
<div class='space-y-6'>
    <p class='text-lg'>Build PC lần đầu có thể khiến bạn mắc phải những sai lầm đáng tiếc. Dưới đây là 5 lỗi phổ biến nhất và cách khắc phục.</p>

    <div class='space-y-4'>
        <div class='bg-red-50 border-l-4 border-red-500 p-5 rounded-r-xl'>
            <h3 class='font-bold text-red-800 text-lg'>❌ Sai lầm #1: Đầu tư quá nhiều vào CPU, bỏ quên VGA</h3>
            <p class='mt-2 text-sm'>Nhiều người mua CPU i9 nhưng chỉ dùng VGA GTX 1650. Điều này gây bottleneck nghiêm trọng.</p>
            <p class='mt-2 text-sm text-green-700'><strong>✅ Cách khắc phục:</strong> Cân bằng ngân sách CPU:VGA theo tỷ lệ 1:2 hoặc 1:1.5 cho PC Gaming.</p>
        </div>

        <div class='bg-red-50 border-l-4 border-red-500 p-5 rounded-r-xl'>
            <h3 class='font-bold text-red-800 text-lg'>❌ Sai lầm #2: Mua PSU no-name giá rẻ</h3>
            <p class='mt-2 text-sm'>PSU kém chất lượng có thể cháy nổ, hỏng các linh kiện khác.</p>
            <p class='mt-2 text-sm text-green-700'><strong>✅ Cách khắc phục:</strong> Chọn PSU từ các hãng uy tín: Corsair, Seasonic, EVGA, MSI. Tối thiểu 80+ Bronze.</p>
        </div>

        <div class='bg-red-50 border-l-4 border-red-500 p-5 rounded-r-xl'>
            <h3 class='font-bold text-red-800 text-lg'>❌ Sai lầm #3: Quên tản nhiệt CPU</h3>
            <p class='mt-2 text-sm'>Dùng tản stock cho CPU cao cấp khiến máy nóng, giảm hiệu năng.</p>
            <p class='mt-2 text-sm text-green-700'><strong>✅ Cách khắc phục:</strong> Đầu tư tản nhiệt tower hoặc AIO cho CPU từ i5/Ryzen 5 trở lên.</p>
        </div>

        <div class='bg-red-50 border-l-4 border-red-500 p-5 rounded-r-xl'>
            <h3 class='font-bold text-red-800 text-lg'>❌ Sai lầm #4: RAM không đúng tốc độ</h3>
            <p class='mt-2 text-sm'>Mua RAM 3200MHz nhưng main chỉ hỗ trợ 2666MHz.</p>
            <p class='mt-2 text-sm text-green-700'><strong>✅ Cách khắc phục:</strong> Kiểm tra QVL (danh sách RAM tương thích) của mainboard trước khi mua.</p>
        </div>

        <div class='bg-red-50 border-l-4 border-red-500 p-5 rounded-r-xl'>
            <h3 class='font-bold text-red-800 text-lg'>❌ Sai lầm #5: Case không đủ airflow</h3>
            <p class='mt-2 text-sm'>Chọn case kín, ít fan khiến linh kiện nóng ran.</p>
            <p class='mt-2 text-sm text-green-700'><strong>✅ Cách khắc phục:</strong> Chọn case có mặt lưới (mesh front panel), tối thiểu 3 fan.</p>
        </div>
    </div>

    <p class='italic'>Cần tư vấn thêm? Đội ngũ Quang Hưởng Computer sẵn sàng hỗ trợ bạn 24/7!</p>
</div>";

}
