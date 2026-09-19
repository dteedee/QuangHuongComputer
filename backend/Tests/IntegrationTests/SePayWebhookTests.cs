using System.Net;
using System.Security.Cryptography;
using System.Text;
using FluentAssertions;
using IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Payments.Domain;
using Payments.Infrastructure;
using Xunit;

namespace IntegrationTests;

/// <summary>
/// Webhook thanh toán SePay (D04): ký HMAC trên RAW BODY, cửa sổ thời gian ±300s,
/// từ chối chữ ký giả, và idempotent theo (Provider, TransactionId).
///
/// Vì sao phải có: webhook là đường DUY NHẤT biến "chưa trả tiền" thành "đã trả tiền".
/// Một verifier fail-open ở đây nghĩa là ai cũng tự xác nhận được đơn của mình đã thanh toán,
/// và một webhook lặp lại nghĩa là đơn được ghi nhận trả tiền hai lần.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public sealed class SePayWebhookTests
{
    private const string Url = "/api/payments/v2/sepay/webhook";

    private readonly IntegrationTestFixture _fixture;

    public SePayWebhookTests(IntegrationTestFixture fixture) => _fixture = fixture;

    [Fact(DisplayName = "Webhook SePay: chữ ký hợp lệ thì intent chuyển sang đã thanh toán")]
    public async Task ChuKyHopLe_IntentDuocXacNhan()
    {
        var intent = await CreatePendingIntentAsync(1_234_000m);
        var body = SePayWebhookRequests.BuildBody(transactionId: SePayWebhookRequests.RandomTransactionId(), intent);

        using var client = _fixture.CreateClient();
        var response = await client.SendAsync(SePayWebhookRequests.SignedRequest(body, DateTimeOffset.UtcNow));

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        (await ReloadAsync(intent.Id)).Status.Should().Be(PaymentStatus.Succeeded);
    }

    [Fact(DisplayName = "Webhook SePay: gửi lại đúng giao dịch đó chỉ ghi nhận MỘT lần (idempotent)")]
    public async Task GuiLaiHaiLan_ChiGhiNhanMotLan()
    {
        var intent = await CreatePendingIntentAsync(2_345_000m);
        var transactionId = SePayWebhookRequests.RandomTransactionId();
        var body = SePayWebhookRequests.BuildBody(transactionId, intent);

        using var client = _fixture.CreateClient();
        var first = await client.SendAsync(SePayWebhookRequests.SignedRequest(body, DateTimeOffset.UtcNow));
        var second = await client.SendAsync(SePayWebhookRequests.SignedRequest(body, DateTimeOffset.UtcNow));

        first.StatusCode.Should().Be(HttpStatusCode.OK);
        second.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = _fixture.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PaymentsDbContext>();
        (await db.ProcessedWebhooks.AsNoTracking()
            .CountAsync(w => w.Provider == "SePay" && w.TransactionId == transactionId))
            .Should().Be(1, "một giao dịch cổng chỉ được ghi nhận đúng một bản ghi đã xử lý");

        var reloaded = await ReloadAsync(intent.Id);
        reloaded.Status.Should().Be(PaymentStatus.Succeeded, "vẫn là đã thanh toán, không bị xử lý lại");
        reloaded.AmountRefunded.Should().Be(0m);
        reloaded.Amount.Should().Be(2_345_000m, "phát lại webhook không được cộng dồn số tiền");
    }

    // Bỏ Skip 2026-09-19: endpoint đã chặn trùng bằng ProcessedWebhooks (Provider + TransactionId)
    // TRƯỚC khi ghi dòng đối soát, nên lần gửi lại không còn tạo dòng trùng và không còn báo
    // "chưa gán được đơn" sai sự thật.
    [Fact(DisplayName = "Webhook SePay: phát lại giao dịch phải trả idempotent và không ghi thêm dòng đối soát")]
    public async Task PhatLai_PhaiBaoIdempotent()
    {
        var intent = await CreatePendingIntentAsync(7_654_000m);
        var transactionId = SePayWebhookRequests.RandomTransactionId();
        var body = SePayWebhookRequests.BuildBody(transactionId, intent);

        using var client = _fixture.CreateClient();
        await client.SendAsync(SePayWebhookRequests.SignedRequest(body, DateTimeOffset.UtcNow));
        var second = await client.SendAsync(SePayWebhookRequests.SignedRequest(body, DateTimeOffset.UtcNow));

        (await second.Content.ReadAsStringAsync()).Should().Contain("\"duplicate\":true");

        using var scope = _fixture.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PaymentsDbContext>();
        (await db.SePayTransactions.AsNoTracking().CountAsync(t => t.ReferenceCode == "REF" + transactionId))
            .Should().Be(1, "cùng một giao dịch ngân hàng không được tạo hai dòng đối soát");
    }

    [Fact(DisplayName = "Webhook SePay: chữ ký sai bị từ chối 401 và không đổi trạng thái intent")]
    public async Task ChuKySai_BiTuChoi()
    {
        var intent = await CreatePendingIntentAsync(3_456_000m);
        var body = SePayWebhookRequests.BuildBody(SePayWebhookRequests.RandomTransactionId(), intent);

        var request = new HttpRequestMessage(HttpMethod.Post, Url)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };
        request.Headers.Add("X-SePay-Timestamp", DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString());
        request.Headers.Add("X-SePay-Signature", "sha256=" + new string('a', 64));

        using var client = _fixture.CreateClient();
        var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await ReloadAsync(intent.Id)).Status.Should().Be(PaymentStatus.Pending,
            "chữ ký giả không bao giờ được biến đơn thành đã thanh toán");
    }

    [Fact(DisplayName = "Webhook SePay: body bị sửa sau khi ký (tăng số tiền) bị từ chối 401")]
    public async Task BodyBiSuaSauKhiKy_BiTuChoi()
    {
        var intent = await CreatePendingIntentAsync(4_567_000m);
        var signedBody = SePayWebhookRequests.BuildBody(SePayWebhookRequests.RandomTransactionId(), intent);
        var timestamp = DateTimeOffset.UtcNow;

        // Ký trên body gốc rồi gửi đi một body khác — đúng kịch bản kẻ tấn công chặn giữa đường.
        var tamperedBody = signedBody.Replace("\"transferAmount\":4567000", "\"transferAmount\":1");
        tamperedBody.Should().NotBe(signedBody, "phải thực sự sửa được body thì test mới có ý nghĩa");

        var request = SePayWebhookRequests.SignedRequest(signedBody, timestamp);
        request.Content = new StringContent(tamperedBody, Encoding.UTF8, "application/json");

        using var client = _fixture.CreateClient();
        var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await ReloadAsync(intent.Id)).Status.Should().Be(PaymentStatus.Pending);
    }

    [Fact(DisplayName = "Webhook SePay: dấu thời gian quá cũ (ngoài ±300s) bị từ chối 401 — chặn phát lại")]
    public async Task DauThoiGianQuaCu_BiTuChoi()
    {
        var intent = await CreatePendingIntentAsync(5_678_000m);
        var body = SePayWebhookRequests.BuildBody(SePayWebhookRequests.RandomTransactionId(), intent);

        using var client = _fixture.CreateClient();
        var response = await client.SendAsync(SePayWebhookRequests.SignedRequest(body, DateTimeOffset.UtcNow.AddHours(-2)));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await ReloadAsync(intent.Id)).Status.Should().Be(PaymentStatus.Pending);
    }

    [Fact(DisplayName = "Webhook SePay: không có chữ ký lẫn API key thì bị từ chối 401")]
    public async Task KhongCoChuKy_BiTuChoi()
    {
        var intent = await CreatePendingIntentAsync(6_789_000m);
        var body = SePayWebhookRequests.BuildBody(SePayWebhookRequests.RandomTransactionId(), intent);

        using var client = _fixture.CreateClient();
        var response = await client.PostAsync(Url, new StringContent(body, Encoding.UTF8, "application/json"));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await ReloadAsync(intent.Id)).Status.Should().Be(PaymentStatus.Pending);
    }

    // ------------------------------------------------------------------ helpers

    private async Task<PaymentIntent> CreatePendingIntentAsync(decimal amount)
    {
        using var scope = _fixture.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PaymentsDbContext>();
        var intent = PaymentIntent.Create(
            orderId: Guid.NewGuid(),
            amount: amount,
            currency: "VND",
            provider: PaymentProvider.SePay,
            idempotencyKey: Guid.NewGuid().ToString("N"));
        db.PaymentIntents.Add(intent);
        await db.SaveChangesAsync();
        return intent;
    }

    private async Task<PaymentIntent> ReloadAsync(Guid intentId)
    {
        using var scope = _fixture.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PaymentsDbContext>();
        return await db.PaymentIntents.AsNoTracking().FirstAsync(p => p.Id == intentId);
    }

}
