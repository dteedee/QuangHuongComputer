using FluentAssertions;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Payments.Application;
using Payments.Domain;
using Payments.Infrastructure;
using Xunit;

namespace UnitTests.Domain.Payments;

/// <summary>
/// Phase 04 — Webhook idempotent theo (Provider, TransactionId):
/// cùng transactionId gửi 2 lần chỉ ghi 1 lần, PaymentIntent không chuyển trạng thái lần 2.
/// </summary>
public class PaymentWebhookHandlerIdempotencyTests
{
    private static PaymentsDbContext NewDb()
    {
        // InMemory KHÔNG enforce unique index, nên test dựa vào logic sớm-return của handler.
        var options = new DbContextOptionsBuilder<PaymentsDbContext>()
            .UseInMemoryDatabase($"payments-{Guid.NewGuid()}")
            .Options;
        return new PaymentsDbContext(options);
    }

    /// <summary>Bus giả — chỉ đếm số lần publish.</summary>
    private class FakeBus : IPublishEndpoint
    {
        public int PublishCount;
        public Task Publish<T>(T message, CancellationToken cancellationToken = default) where T : class
        { Interlocked.Increment(ref PublishCount); return Task.CompletedTask; }
        public Task Publish<T>(T message, IPipe<PublishContext<T>> publishPipe, CancellationToken cancellationToken = default) where T : class
        { Interlocked.Increment(ref PublishCount); return Task.CompletedTask; }
        public Task Publish<T>(T message, IPipe<PublishContext> publishPipe, CancellationToken cancellationToken = default) where T : class
        { Interlocked.Increment(ref PublishCount); return Task.CompletedTask; }
        public Task Publish(object message, CancellationToken cancellationToken = default)
        { Interlocked.Increment(ref PublishCount); return Task.CompletedTask; }
        public Task Publish(object message, IPipe<PublishContext> publishPipe, CancellationToken cancellationToken = default)
        { Interlocked.Increment(ref PublishCount); return Task.CompletedTask; }
        public Task Publish(object message, Type messageType, CancellationToken cancellationToken = default)
        { Interlocked.Increment(ref PublishCount); return Task.CompletedTask; }
        public Task Publish(object message, Type messageType, IPipe<PublishContext> publishPipe, CancellationToken cancellationToken = default)
        { Interlocked.Increment(ref PublishCount); return Task.CompletedTask; }
        public Task Publish<T>(object values, CancellationToken cancellationToken = default) where T : class
        { Interlocked.Increment(ref PublishCount); return Task.CompletedTask; }
        public Task Publish<T>(object values, IPipe<PublishContext<T>> publishPipe, CancellationToken cancellationToken = default) where T : class
        { Interlocked.Increment(ref PublishCount); return Task.CompletedTask; }
        public Task Publish<T>(object values, IPipe<PublishContext> publishPipe, CancellationToken cancellationToken = default) where T : class
        { Interlocked.Increment(ref PublishCount); return Task.CompletedTask; }
        public ConnectHandle ConnectPublishObserver(IPublishObserver observer) => throw new NotSupportedException();
    }

    private static PaymentIntent SeedPaymentIntent(PaymentsDbContext db, PaymentProvider provider = PaymentProvider.VnPay)
    {
        var p = PaymentIntent.Create(
            orderId: Guid.NewGuid(), amount: 1_000_000m, currency: "VND",
            provider: provider, idempotencyKey: Guid.NewGuid().ToString());
        db.PaymentIntents.Add(p);
        db.SaveChanges();
        return p;
    }

    [Fact]
    public async Task ProcessAsync_LanDau_ThanhCong_GhiProcessedWebhook_VaPublishEvent()
    {
        using var db = NewDb();
        var payment = SeedPaymentIntent(db);
        var bus = new FakeBus();
        var handler = new PaymentWebhookHandler(db, bus, NullLogger<PaymentWebhookHandler>.Instance);

        var result = await handler.ProcessAsync(
            provider: "VNPay", transactionId: "TXN-001",
            paymentIntentId: payment.Id, success: true, failureReason: null);

        result.Processed.Should().BeTrue();
        result.WasIdempotent.Should().BeFalse();
        db.ProcessedWebhooks.Count().Should().Be(1);
        bus.PublishCount.Should().Be(1);

        var reloaded = await db.PaymentIntents.FindAsync(payment.Id);
        reloaded!.Status.Should().Be(PaymentStatus.Succeeded);
    }

    [Fact]
    public async Task ProcessAsync_GuiLai_CungTransactionId_ReturnIdempotent_KhongPublishLai()
    {
        using var db = NewDb();
        var payment = SeedPaymentIntent(db);
        var bus = new FakeBus();
        var handler = new PaymentWebhookHandler(db, bus, NullLogger<PaymentWebhookHandler>.Instance);

        // Lần 1
        await handler.ProcessAsync("VNPay", "TXN-DUP", payment.Id, true, null);
        // Lần 2 — trùng.
        var second = await handler.ProcessAsync("VNPay", "TXN-DUP", payment.Id, true, null);

        second.WasIdempotent.Should().BeTrue();
        second.Processed.Should().BeTrue();
        db.ProcessedWebhooks.Count().Should().Be(1);
        bus.PublishCount.Should().Be(1); // publish chỉ 1 lần.
    }

    [Fact]
    public async Task ProcessAsync_KhacProvider_CungTransactionId_KhongCoiLaTrung()
    {
        using var db = NewDb();
        var payment = SeedPaymentIntent(db);
        var bus = new FakeBus();
        var handler = new PaymentWebhookHandler(db, bus, NullLogger<PaymentWebhookHandler>.Instance);

        await handler.ProcessAsync("VNPay", "12345", payment.Id, true, null);
        var second = await handler.ProcessAsync("MoMo", "12345", payment.Id, true, null);

        // Cùng txn ID nhưng khác provider → xử lý độc lập.
        second.WasIdempotent.Should().BeFalse();
        db.ProcessedWebhooks.Count().Should().Be(2);
    }

    [Fact]
    public async Task ProcessAsync_Failed_MarkFailed_PublishFailedEvent()
    {
        using var db = NewDb();
        var payment = SeedPaymentIntent(db);
        var bus = new FakeBus();
        var handler = new PaymentWebhookHandler(db, bus, NullLogger<PaymentWebhookHandler>.Instance);

        await handler.ProcessAsync("VNPay", "TXN-FAIL", payment.Id, success: false, failureReason: "Insufficient funds");

        var reloaded = await db.PaymentIntents.FindAsync(payment.Id);
        reloaded!.Status.Should().Be(PaymentStatus.Failed);
        reloaded.FailureReason.Should().Contain("Insufficient");
        bus.PublishCount.Should().Be(1);
    }

    [Fact]
    public async Task ProcessAsync_PaymentIntentKhongTonTai_GhiLai_KhongPublish()
    {
        using var db = NewDb();
        var bus = new FakeBus();
        var handler = new PaymentWebhookHandler(db, bus, NullLogger<PaymentWebhookHandler>.Instance);

        var result = await handler.ProcessAsync("VNPay", "TXN-STRANGER",
            paymentIntentId: Guid.NewGuid(), success: true, failureReason: null);

        result.Processed.Should().BeFalse();
        // Vẫn ghi ProcessedWebhook để chặn retry hoài.
        db.ProcessedWebhooks.Count().Should().Be(1);
        db.ProcessedWebhooks.First().Result.Should().Be("Ignored");
        bus.PublishCount.Should().Be(0);
    }

    [Fact]
    public void ProcessedWebhook_Record_YeuCauProviderKhongRong()
    {
        var act = () => ProcessedWebhook.Record(provider: "", transactionId: "x", result: "Success");
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void ProcessedWebhook_Record_YeuCauTransactionIdKhongRong()
    {
        var act = () => ProcessedWebhook.Record(provider: "VNPay", transactionId: "", result: "Success");
        act.Should().Throw<ArgumentException>();
    }
}
