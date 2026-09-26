using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BuildingBlocks.Security;
using FluentAssertions;
using IntegrationTests.Infrastructure;
using Xunit;

namespace IntegrationTests;

/// <summary>
/// Báo giá sửa chữa theo dòng chạy thật: khách tạo phiếu → quản lý phân công, chẩn đoán → xem trước
/// (server tính) → tạo báo giá có dòng dịch vụ điền giá từ danh mục + giảm giá → gửi khách → khách
/// xem đủ dòng/VAT rồi đồng ý. Người khác không duyệt được.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public sealed class RepairQuoteApprovalFlowTests
{
    private readonly IntegrationTestFixture _fixture;

    public RepairQuoteApprovalFlowTests(IntegrationTestFixture fixture) => _fixture = fixture;

    private static async Task<JsonElement> ReadOk(HttpResponseMessage response)
    {
        response.StatusCode.Should().BeOneOf(new[] { HttpStatusCode.OK, HttpStatusCode.Created }, await response.Content.ReadAsStringAsync());
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    [Fact(DisplayName = "Sửa chữa: báo giá có dòng → khách xem dòng + VAT → khách đồng ý")]
    public async Task BaoGiaTheoDong_KhachDongY()
    {
        var n = Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();
        using var admin = TestAuthentication.ClientFor(_fixture, await TestAuthentication.SharedAccountAsync(_fixture, Roles.Admin));
        var customerAccount = await TestAuthentication.CreateAccountAsync(_fixture, Roles.Customer);
        using var customer = TestAuthentication.ClientFor(_fixture, customerAccount);
        using var stranger = TestAuthentication.ClientFor(_fixture, await TestAuthentication.CreateAccountAsync(_fixture, Roles.Customer));

        var workOrder = await ReadOk(await customer.PostAsJsonAsync("/api/repair/work-orders",
            new { deviceModel = "Asus TUF F15", serialNumber = $"SN-{n}", description = "Bản lề gãy, máy nóng" }));
        var workOrderId = workOrder.GetProperty("id").GetString();

        var technician = await ReadOk(await admin.PostAsJsonAsync("/api/repair/admin/technicians", new { name = $"KTV {n}", specialty = "Laptop" }));
        await ReadOk(await admin.PutAsJsonAsync($"/api/repair/admin/work-orders/{workOrderId}/assign",
            new { technicianId = technician.GetProperty("technicianId").GetString() }));
        await ReadOk(await admin.PutAsJsonAsync($"/api/repair/tech/work-orders/{workOrderId}/status",
            new { status = "Diagnosed", notes = "Thay bản lề, vệ sinh quạt" }));

        var service = await ReadOk(await admin.PostAsJsonAsync("/api/repair/admin/service-types", new
        {
            code = $"VE_SINH_{n}", name = "Vệ sinh laptop", description = "Vệ sinh quạt, thay keo tản nhiệt",
            basePrice = 150_000, estimatedMinutes = 45, isOnSite = false, sortOrder = 30, isActive = true,
        }));

        var body = new
        {
            lines = new object[]
            {
                new { kind = "Part", description = "Bản lề Asus TUF (cặp)", quantity = 2, unitPrice = 350_000 },
                new { kind = "Labor", description = "Công thay bản lề", quantity = 1.5, unitPrice = 200_000 },
                new { kind = "Service", serviceTypeId = service.GetProperty("id").GetString(), quantity = 1, lineDiscount = 50_000 },
            },
            discountAmount = 100_000,
            estimatedHours = 1.5,
            hourlyRate = 200_000,
            description = "Thay bản lề + vệ sinh",
        };

        var preview = await ReadOk(await admin.PostAsJsonAsync($"/api/repair/work-orders/{workOrderId}/quote/preview", body));
        preview.GetProperty("subtotalAmount").GetDecimal().Should().Be(1_150_000);
        preview.GetProperty("totalCost").GetDecimal().Should().Be(1_000_000);

        var created = await ReadOk(await admin.PostAsJsonAsync($"/api/repair/work-orders/{workOrderId}/quote", body));
        var quoteId = created.GetProperty("quoteId").GetString();
        created.GetProperty("totalCost").GetDecimal().Should().Be(1_000_000, "tạo phải ra đúng số đã xem trước");
        await ReadOk(await admin.PutAsync($"/api/repair/quotes/{quoteId}/await-approval", null));

        var quote = await ReadOk(await customer.GetAsync($"/api/repair/quotes/{quoteId}"));
        var lines = quote.GetProperty("lines").EnumerateArray().ToList();
        lines.Should().HaveCount(3);
        lines[2].GetProperty("unitPrice").GetDecimal().Should().Be(150_000, "dòng dịch vụ lấy giá gốc trong danh mục");
        lines[2].GetProperty("description").GetString().Should().Be("Vệ sinh laptop");
        lines.Select(l => l.GetProperty("allocatedDiscount").GetDecimal()).Should().Equal(63_636, 27_273, 9_091);
        lines.Sum(l => l.GetProperty("lineTotal").GetDecimal()).Should().Be(1_000_000);
        (quote.GetProperty("netAmount").GetDecimal() + quote.GetProperty("vatAmount").GetDecimal()).Should().Be(1_000_000);

        (await stranger.PutAsync($"/api/repair/quotes/{quoteId}/approve", null)).StatusCode
            .Should().Be(HttpStatusCode.Forbidden, "chỉ chủ phiếu được duyệt báo giá");

        var approved = await ReadOk(await customer.PutAsync($"/api/repair/quotes/{quoteId}/approve", null));
        approved.GetProperty("quoteStatus").GetString().Should().Be("Approved");
        approved.GetProperty("workOrderStatus").GetString().Should().Be("Approved");

        var after = await ReadOk(await customer.GetAsync($"/api/repair/work-orders/{workOrderId}"));
        after.GetProperty("status").GetString().Should().Be("Approved");
        after.GetProperty("estimatedCost").GetDecimal().Should().Be(1_000_000);

        (await customer.PutAsync($"/api/repair/quotes/{quoteId}/approve", null)).StatusCode
            .Should().Be(HttpStatusCode.Conflict, "báo giá đã duyệt không duyệt lại được");
    }
}
