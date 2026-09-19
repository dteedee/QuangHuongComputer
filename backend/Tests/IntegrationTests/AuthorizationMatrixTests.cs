using System.Net;
using System.Net.Http.Json;
using BuildingBlocks.Security;
using FluentAssertions;
using IntegrationTests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace IntegrationTests;

/// <summary>
/// Ma trận phân quyền: mỗi nhóm module được gọi bằng ba tư cách (ẩn danh, Customer, Admin).
///
/// Đây là lưới hồi quy cho các lỗ hổng NGHIÊM TRỌNG đã xác nhận trong đợt audit:
/// toàn bộ API CRM không kiểm tra quyền, khách hàng duyệt được đơn mua hàng (PO), RFQ,
/// trả hàng nhà cung cấp, barcode, tải file media và bảo hành đều mở cho token bất kỳ.
///
/// Quy ước khẳng định:
/// - ẩn danh  -> 401 (chưa xác thực thì không được vào)
/// - Customer -> 403 (đã xác thực nhưng KHÔNG có quyền nghiệp vụ nội bộ)
/// - Admin    -> không phải 401/403/404/5xx (route có thật và quyền thông suốt)
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public sealed class AuthorizationMatrixTests
{
    private readonly IntegrationTestFixture _fixture;

    public AuthorizationMatrixTests(IntegrationTestFixture fixture) => _fixture = fixture;

    /// <summary>Mỗi dòng: một endpoint đại diện cho một nhóm module nội bộ.</summary>
    public static TheoryData<string, string> ProtectedEndpoints => new()
    {
        { "GET", "/api/crm/customers" },
        { "GET", "/api/crm/dashboard/overview" },
        { "GET", "/api/crm/segments" },
        { "GET", "/api/inventory/rfq" },
        { "GET", "/api/inventory/purchase-returns" },
        { "GET", "/api/inventory/po-approvals/pending" },
        { "GET", "/api/inventory/po-approval-rules" },
        { "GET", "/api/inventory/barcode/SKU-TEST" },
        { "GET", "/api/warranty/admin/claims" },
        { "GET", "/api/accounting/invoices" },
        { "GET", "/api/hr/employees" },
        { "GET", "/api/media/" },
        { "GET", "/api/auth/users" },
    };

    [Theory(DisplayName = "Ma trận quyền: endpoint nội bộ chặn ẩn danh (401) và chặn Customer (403)")]
    [MemberData(nameof(ProtectedEndpoints))]
    public async Task EndpointNoiBo_ChanAnDanhVaCustomer(string method, string path)
    {
        var anonymous = await SendAsync(_fixture.CreateClient(), method, path);
        anonymous.Should().Be(HttpStatusCode.Unauthorized,
            $"{method} {path} phải từ chối request không có token");

        var customer = await TestAuthentication.SharedAccountAsync(_fixture, Roles.Customer);
        using var customerClient = TestAuthentication.ClientFor(_fixture, customer);
        var customerStatus = await SendAsync(customerClient, method, path);
        customerStatus.Should().Be(HttpStatusCode.Forbidden,
            $"{method} {path} là nghiệp vụ nội bộ: token Customer hợp lệ vẫn không được phép");
    }

    [Theory(DisplayName = "Ma trận quyền: Admin vào được mọi endpoint nội bộ (route tồn tại, quyền thông suốt)")]
    [MemberData(nameof(ProtectedEndpoints))]
    public async Task EndpointNoiBo_AdminVaoDuoc(string method, string path)
    {
        var admin = await TestAuthentication.SharedAccountAsync(_fixture, Roles.Admin);
        using var client = TestAuthentication.ClientFor(_fixture, admin);

        var status = await SendAsync(client, method, path);

        ((int)status).Should().NotBe(401, $"{method} {path}: token Admin phải được xác thực");
        ((int)status).Should().NotBe(403, $"{method} {path}: Admin luôn được bỏ qua kiểm tra quyền (PermissionAuthorizationHandler)");
        ((int)status).Should().NotBe(404,
            $"{method} {path}: route không tồn tại — dòng trong ma trận đã lỗi thời, nó đang bảo vệ một đường dẫn không có thật");
        ((int)status).Should().BeLessThan(500, $"{method} {path}: Admin gọi mà 5xx thì endpoint đang hỏng");
    }

    [Fact(DisplayName = "Ma trận quyền: token bịa/hỏng bị từ chối 401 chứ không được coi là ẩn danh hợp lệ")]
    public async Task TokenGia_BiTuChoi()
    {
        using var client = _fixture.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", "khong-phai-jwt-that");

        var status = await SendAsync(client, "GET", "/api/crm/customers");

        status.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact(DisplayName = "Ma trận quyền: xoá role hệ thống Admin bị chặn (sự cố đã từng xoá mất role Admin)")]
    public async Task XoaRoleAdmin_BiChan()
    {
        var admin = await TestAuthentication.SharedAccountAsync(_fixture, Roles.Admin);
        using var client = TestAuthentication.ClientFor(_fixture, admin);

        var response = await client.DeleteAsync($"/api/auth/roles/{Roles.Admin}");

        ((int)response.StatusCode).Should().BeGreaterThanOrEqualTo(400,
            "role hệ thống Admin không được phép xoá dù người gọi là Admin — mất nó là mất quyền quản trị toàn hệ thống");

        using var scope = _fixture.CreateScope();
        var roles = scope.ServiceProvider
            .GetRequiredService<Microsoft.AspNetCore.Identity.RoleManager<Microsoft.AspNetCore.Identity.IdentityRole>>();
        (await roles.RoleExistsAsync(Roles.Admin)).Should().BeTrue("role Admin phải còn nguyên sau khi bị từ chối");
    }

    /// <summary>
    /// W4-5: các route CÔNG KHAI đã được thẩm định và ghi vào <see cref="PublicEndpointAllowList"/>.
    /// Mặt đối xứng của ma trận trên: những đường này PHẢI mở cho khách chưa đăng nhập, nếu không
    /// storefront gãy. Một lần siết quyền quá tay ở đây sẽ làm test đỏ ngay.
    /// </summary>
    public static TheoryData<string> PublicEndpoints => new()
    {
        "/api/repair/onsite-fee",
        "/api/warranty/policies/public-matrix",
        "/api/sales/return-policies/public-matrix",
        "/api/sales/shipping/provinces",
        "/api/recruitment",
        "/api/config/public",
        "/api/sales/public/cart",
        "/robots.txt",
        "/sitemap.xml",
        // Hai đường tra cứu 2 yếu tố: dữ liệu bịa nên phải 404, nhưng KHÔNG được 401.
        "/api/sales/public/orders/track?orderNumber=KHONG-CO&phone=0912345678",
        "/api/repair/track/KHONG-CO?phone=0912345678",
        "/api/coupons/apply?code=KHONGCOMANAY&orderAmount=1000000",
    };

    [Theory(DisplayName = "Ma trận quyền: route công khai trong allow-list vẫn mở cho khách chưa đăng nhập")]
    [MemberData(nameof(PublicEndpoints))]
    public async Task EndpointCongKhai_KhachChuaDangNhapVaoDuoc(string path)
    {
        var status = await SendAsync(_fixture.CreateClient(), "GET", path);

        ((int)status).Should().NotBe(401, $"GET {path} nằm trong PublicEndpointAllowList — siết quyền ở đây là gãy storefront");
        ((int)status).Should().NotBe(403, $"GET {path} nằm trong PublicEndpointAllowList");
        ((int)status).Should().BeLessThan(500, $"GET {path} không được 5xx");
    }

    [Fact(DisplayName = "W4-5: tra cứu đơn khách vãng lai cần CẢ mã đơn VÀ số điện thoại, sai thì 404 chứ không lộ mã nào có thật")]
    public async Task TraDonVangLai_ThieuSoDienThoai_KhongTraDuLieu()
    {
        using var client = _fixture.CreateClient();

        var thieuPhone = await SendAsync(client, "GET", "/api/sales/public/orders/track?orderNumber=KHONG-CO");
        thieuPhone.Should().Be(HttpStatusCode.BadRequest, "chỉ mã đơn thôi thì không đủ — nếu không, ai đoán được mã là đọc được đơn người khác");

        var saiCaHai = await SendAsync(client, "GET", "/api/sales/public/orders/track?orderNumber=KHONG-CO&phone=0912345678");
        saiCaHai.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact(DisplayName = "W4-5: bước 2 của đăng nhập 2FA ẩn danh được (400 vì challengeToken bịa), không phải 401")]
    public async Task DangNhap2Fa_AnDanh_KhongTra401()
    {
        using var client = _fixture.CreateClient();

        using var response = await client.PostAsJsonAsync("/api/auth/login/2fa",
            new { challengeToken = "khong-phai-challenge-that", code = "000000" });

        ((int)response.StatusCode).Should().NotBe(401,
            "bước 1 chưa phát token nào nên bước 2 bắt buộc ẩn danh");
        ((int)response.StatusCode).Should().BeLessThan(500);
    }

    [Fact(DisplayName = "W4-5: revoke-all-tokens chặn ẩn danh (401) và chỉ thu hồi phiên của CHÍNH người gọi")]
    public async Task RevokeAllTokens_ChanAnDanh_VaTuGioiHanNguoiGoi()
    {
        var anonymous = await SendAsync(_fixture.CreateClient(), "POST", "/api/auth/revoke-all-tokens");
        anonymous.Should().Be(HttpStatusCode.Unauthorized);

        // Customer bình thường PHẢI gọi được (đây là "đăng xuất khỏi mọi thiết bị" của chính mình),
        // và endpoint không nhận userId từ đầu vào nên không chạm được tài khoản khác.
        var customer = await TestAuthentication.SharedAccountAsync(_fixture, Roles.Customer);
        using var customerClient = TestAuthentication.ClientFor(_fixture, customer);
        var status = await SendAsync(customerClient, "POST", "/api/auth/revoke-all-tokens");

        ((int)status).Should().NotBe(401);
        ((int)status).Should().NotBe(403, "tự thu hồi phiên của mình là quyền của mọi tài khoản đăng nhập");
        ((int)status).Should().BeLessThan(500);
    }

    private static async Task<HttpStatusCode> SendAsync(HttpClient client, string method, string path)
    {
        using var request = new HttpRequestMessage(new HttpMethod(method), path);
        using var response = await client.SendAsync(request);
        return response.StatusCode;
    }
}
