using HR.Domain;
using Microsoft.EntityFrameworkCore;

namespace HR.Infrastructure;

public static class HRDbSeeder
{
    public static async Task SeedAsync(HRDbContext context)
    {
        if (!await context.JobListings.AnyAsync())
        {
            var jobs = new List<JobListing>
            {
                new JobListing(
                    "Kỹ thuật viên máy tính (Lắp ráp & Cài đặt)",
                    "Chúng tôi đang tìm kiếm kỹ thuật viên có kinh nghiệm trong việc lắp ráp máy tính chơi game, máy bộ văn phòng và cài đặt phần mềm. Công việc bao gồm tư vấn cấu hình cho khách hàng, lắp ráp hoàn thiện máy tính và cài đặt hệ điều hành.",
                    "- Có kiến thức về phần cứng máy tính (CPU, GPU, Mainboard, RAM...).\n- Biết lắp ráp máy tính thẩm mỹ (đi dây gọn gàng).\n- Biết cài đặt Windows, Driver và các phần mềm cơ bản.\n- Cẩn thận, tỉ mỉ trong công việc.",
                    "- Lương cứng + phụ cấp tay nghề.\n- Được đào tạo chuyên sâu về phần cứng đời mới nhất.\n- Môi trường làm việc năng động, tiếp xúc với linh kiện cao cấp.",
                    "Kỹ thuật",
                    "Hồ Chí Minh",
                    "Full-time",
                    DateTime.UtcNow.AddMonths(2),
                    8000000m,
                    12000000m,
                    Guid.Parse("00000000-0000-0000-0000-000000000001")
                ),
                new JobListing(
                    "Nhân viên bán hàng (Showroom)",
                    "Tư vấn khách hàng về các sản phẩm laptop, linh kiện máy tính và thiết bị ngoại vi tại showroom của Quang Hưởng Computer.",
                    "- Giao tiếp tốt, ngoại hình ưa nhìn.\n- Am hiểu về các dòng laptop và linh kiện máy tính là một lợi thế lớn.\n- Có khả năng thuyết phục khách hàng và làm việc theo nhóm.",
                    "- Lương cứng + Hoa hồng doanh số cao.\n- Thưởng lễ, tết và tháng lương 13.\n- Chế độ bảo hiểm đầy đủ theo quy định của nhà nước.",
                    "Kinh doanh",
                    "Hồ Chí Minh",
                    "Full-time",
                    DateTime.UtcNow.AddMonths(1),
                    7000000m,
                    15000000m,
                    Guid.Parse("00000000-0000-0000-0000-000000000002")
                ),
                new JobListing(
                    "Kỹ thuật viên sửa chữa Laptop",
                    "Sửa chữa phần cứng laptop, thay thế linh kiện, xử lý các lỗi mainboard cho khách hàng.",
                    "- Có kinh nghiệm sửa chữa phần cứng laptop ít nhất 1 năm.\n- Biết sử dụng máy khò, máy hàn, đồng hồ đo và đọc sơ đồ mạch mainboard.\n- Trung thực, trách nhiệm với công việc.",
                    "- Lương cao theo tay nghề.\n- Phụ cấp ăn trưa tại công ty.\n- Nghỉ chủ nhật và các ngày lễ theo quy định.",
                    "Kỹ thuật",
                    "Hồ Chí Minh",
                    "Full-time",
                    DateTime.UtcNow.AddMonths(3),
                    10000000m,
                    18000000m,
                    Guid.Parse("00000000-0000-0000-0000-000000000003")
                ),
                new JobListing(
                    "Chuyên viên Marketing & Content",
                    "Lên kế hoạch nội dung cho Fanpage, Website và các kênh mạng xã hội. Viết bài review sản phẩm công nghệ.",
                    "- Sử dụng tốt các công cụ thiết kế cơ bản (Photoshop, Canva).\n- Có kỹ năng viết lách, sáng tạo nội dung thu hút.\n- Yêu thích và am hiểu về đồ công nghệ, gaming gear.",
                    "- Môi trường làm việc sáng tạo, không gò bó.\n- Được trải nghiệm sớm các sản phẩm công nghệ mới nhất.\n- Lương thưởng xứng đáng theo năng suất.",
                    "Marketing",
                    "Hồ Chí Minh",
                    "Full-time",
                    DateTime.UtcNow.AddMonths(1),
                    9000000m,
                    14000000m,
                    Guid.Parse("00000000-0000-0000-0000-000000000004")
                ),
                new JobListing(
                    "Nhân viên vận chuyển & Giao nhận",
                    "Giao hàng từ showroom đến địa chỉ khách hàng trong khu vực nội thành. Hỗ trợ khách hàng kiểm tra sản phẩm khi giao.",
                    "- Có xe máy riêng và thông thuộc đường phố Hồ Chí Minh.\n- Sức khỏe tốt, tính tình thật thà.\n- Có điện thoại smartphone để liên lạc và sử dụng app giao hàng.",
                    "- Phụ cấp xăng xe và điện thoại hàng tháng.\n- Thưởng theo sản lượng đơn hàng giao thành công.\n- Chế độ bảo hiểm tai nạn đầy đủ.",
                    "Logistics",
                    "Hồ Chí Minh",
                    "Full-time",
                    DateTime.UtcNow.AddMonths(2),
                    7000000m,
                    10000000m,
                    Guid.Parse("00000000-0000-0000-0000-000000000005")
                ),
                new JobListing(
                    "Kế toán bán hàng",
                    "Quản lý hóa đơn, chứng từ bán hàng. Theo dõi kho hàng và đối soát công nợ khách hàng, nhà cung cấp.",
                    "- Tốt nghiệp chuyên ngành Kế toán.\n- Thành thạo Excel và các phần mềm kế toán thông dụng.\n- Cẩn thận, trung thực, có trí nhớ tốt.",
                    "- Môi trường làm việc văn phòng máy lạnh mát mẻ.\n- Chế độ thâm niên, tăng lương hàng năm.\n- Được đào tạo về các nghiệp vụ kế toán chuyên sâu của ngành bán lẻ công nghệ.",
                    "Kế toán",
                    "Hồ Chí Minh",
                    "Full-time",
                    DateTime.UtcNow.AddMonths(1),
                    8000000m,
                    12000000m,
                    Guid.Parse("00000000-0000-0000-0000-000000000006")
                )
            };

            context.JobListings.AddRange(jobs);
            await context.SaveChangesAsync();
        }
    }
}
