using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BuildingBlocks.Configuration;
using BuildingBlocks.Security;
using FluentAssertions;
using IntegrationTests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Repair.Application.Bookings;
using Repair.Domain;
using Xunit;

namespace IntegrationTests;

/// <summary>
/// Sức chứa khung giờ đặt lịch chạy thật trên Postgres: (sức chứa + 2) khách đặt CÙNG LÚC vào một
/// khung ⇒ đúng "sức chứa" lịch được nhận (khoá cố vấn theo ngày + khung), còn lại 409; lịch nhận
/// được có số LH-yyyyMM-#####; "Khách không đến" trước ngày hẹn bị chặn.
/// Sức chứa đọc qua IAppSettings như production (bảng cấu hình admin, rơi về mặc định nếu chưa
/// đặt) — test không phụ thuộc con số cụ thể.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public sealed class RepairBookingCapacityTests
{
    private readonly IntegrationTestFixture _fixture;

    public RepairBookingCapacityTests(IntegrationTestFixture fixture) => _fixture = fixture;

    [Fact(DisplayName = "Đặt lịch: đặt đồng thời không vượt sức chứa khung giờ, có số lịch hẹn")]
    public async Task DatDongThoi_KhongVuotSucChua()
    {
        int capacity;
        using (var scope = _fixture.CreateScope())
            capacity = BookingSlotCapacity.Resolve(scope.ServiceProvider.GetRequiredService<IAppSettings>(), TimeSlot.Evening);
        capacity.Should().BeInRange(1, 20, "test cần một sức chứa hữu hạn, nhỏ");

        // Ngày xa trong tương lai, ngẫu nhiên theo lần chạy ⇒ không đụng lịch của test khác.
        var date = DateTime.UtcNow.Date.AddDays(400 + Random.Shared.Next(0, 3000)).ToString("yyyy-MM-dd");

        var clients = new List<HttpClient>();
        for (var i = 0; i < capacity + 2; i++)
            clients.Add(TestAuthentication.ClientFor(_fixture, await TestAuthentication.CreateAccountAsync(_fixture, Roles.Customer)));

        var responses = await Task.WhenAll(clients.Select((c, i) => c.PostAsJsonAsync("/api/repair/book", new
        {
            deviceModel = $"Laptop {i}", issueDescription = "Không lên màn hình", preferredDate = date,
            timeSlot = "Evening", acceptedTerms = true, customerName = $"Khách {i}",
            customerPhone = $"09000000{i:D2}", customerEmail = $"k{i}@test.local",
        })));

        var ok = responses.Where(r => r.StatusCode == HttpStatusCode.OK).ToList();
        ok.Should().HaveCount(capacity, "khoá cố vấn xếp hàng các request cùng khung, request sau đếm thấy dòng của request trước");
        responses.Count(r => r.StatusCode == HttpStatusCode.Conflict).Should().Be(2);

        var first = await ok[0].Content.ReadFromJsonAsync<JsonElement>();
        first.GetProperty("bookingNumber").GetString().Should().MatchRegex(@"^LH-\d{6}-\d{5,}$");

        var slots = await clients[0].GetFromJsonAsync<JsonElement>($"/api/repair/booking-slots?date={date}");
        var evening = slots.GetProperty("slots").EnumerateArray().Single(s => s.GetProperty("slot").GetString() == "Evening");
        evening.GetProperty("isFull").GetBoolean().Should().BeTrue();
        evening.GetProperty("remaining").GetInt32().Should().Be(0);

        using var admin = TestAuthentication.ClientFor(_fixture, await TestAuthentication.SharedAccountAsync(_fixture, Roles.Admin));
        var noShow = await admin.PutAsync($"/api/repair/admin/bookings/{first.GetProperty("id").GetString()}/no-show", null);
        noShow.StatusCode.Should().Be(HttpStatusCode.Conflict, "chưa tới ngày hẹn thì không đánh khách không đến");

        clients.ForEach(c => c.Dispose());
    }
}
