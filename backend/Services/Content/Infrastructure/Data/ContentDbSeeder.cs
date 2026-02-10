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
             // News (Tin tức)
            new Post("Khai trương chi nhánh mới tại Cầu Giấy", "khai-truong-chi-nhanh-cau-giay", 
                "<p>Quang Hưởng Computer tưng bừng khai trương chi nhánh mới tại số 123 đường Cầu Giấy...</p><p>Nhân dịp này, chúng tôi mang đến hàng ngàn phần quà hấp dẫn...</p>", 
                PostType.News, "Tin tức"),
            new Post("Thông báo lịch nghỉ Tết Nguyên Đán 2026", "lich-nghi-tet-2026", 
                "<p>Kính gửi Quý khách hàng, Quang Hưởng Computer xin thông báo lịch nghỉ Tết...</p>", 
                PostType.News, "Tin tức"),
            new Post("Cảnh báo mạo danh Quang Hưởng Computer lừa đảo", "canh-bao-mao-danh", 
                "<p>Gần đây xuất hiện các fanpage giả mạo...</p>", 
                PostType.News, "Tin tức"),
            new Post("Vinh danh: Top 10 Thương hiệu Công nghệ Uy tín", "top-10-thuong-hieu", 
                "<p>Chúng tôi tự hào được vinh danh...</p>", 
                PostType.News, "Tin tức"),

            // Promotions (Khuyến mãi)
            new Post("Siêu Sale 11/11 - Săn Deal Cực Khủng", "sieu-sale-11-11", 
                "<p>Giảm giá cực sốc lên tới 50% cho toàn bộ linh kiện PC...</p><ul><li>VGA giảm 10%</li><li>CPU giảm 5%</li></ul>", 
                PostType.Promotion, "Khuyến mãi"),
            new Post("Back to School - Ưu đãi cho Học sinh Sinh viên", "back-to-school", 
                "<p>Giảm ngay 500k cho khách hàng có thẻ học sinh sinh viên khi mua Laptop...</p>", 
                PostType.Promotion, "Khuyến mãi"),
            new Post("Thu cũ đổi mới - Lên đời VGA", "thu-cu-doi-moi-vga", 
                "<p>Chương trình hỗ trợ thu lại VGA cũ giá cao...</p>", 
                PostType.Promotion, "Khuyến mãi"),
            new Post("Mua Gear Gaming - Tặng Pad chuột cao cấp", "mua-gear-tang-pad", 
                "<p>Khi mua chuột hoặc bàn phím cơ trên 1 triệu đồng...</p>", 
                PostType.Promotion, "Khuyến mãi"),

            // Articles/Blogs
            new Post("Review VGA RTX 5090 - Quái vật hiệu năng", "review-vga-rtx-5090", 
                "<p>Đánh giá chi tiết hiệu năng khủng long bạo chúa mới nhất từ NVIDIA...</p>", 
                PostType.Article, "Review"),
            new Post("Hướng dẫn build PC Gaming 20 triệu ngon nhất 2026", "build-pc-gaming-20-trieu", 
                "<p>Với ngân sách 20 triệu, bạn có thể build được cấu hình chiến mọi game...</p>", 
                PostType.Article, "Hướng dẫn"),
             new Post("Top 5 màn hình đồ họa tốt nhất cho Designer", "top-5-man-hinh-do-hoa", 
                "<p>Danh sách những chiếc màn hình chuẩn màu...</p>", 
                PostType.Article, "Top list"),
             new Post("Cách vệ sinh PC tại nhà đúng cách", "cach-ve-sinh-pc", 
                "<p>Hướng dẫn chi tiết từng bước...</p>", 
                PostType.Article, "Tips Trick")
        };

        foreach (var post in posts)
        {
            if (!await context.Posts.AnyAsync(p => p.Slug == post.Slug))
            {
                post.Publish();
                context.Posts.Add(post);
            }
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

}
