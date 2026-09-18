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
/// W0-10 — số tiền cổng báo về PHẢI khớp số tiền intent trước khi `Succeed()`.
/// Lệch tiền ⇒ intent giữ nguyên Pending, ghi `ProcessedWebhook.Result = "AmountMismatch"`,
/// không publish `PaymentSucceededEvent`.
/// </summary>
public class PaymentWebhookAmountVerificationTests
{
    private static PaymentsDbContext NewDb()
        => new(new DbContextOptionsBuilder<PaymentsDbContext>()
            .UseInMemoryDatabase($"payments-amount-{Guid.NewGuid()}").Options);

    private sealed class CountingBus : IPublishEndpoint
    {
        public int PublishCount;
        private Task Bump() { Interlocked.Increment(ref PublishCount); return Task.CompletedTask; }
        public Task Publish<T>(T m, CancellationToken c = default) where T : class => Bump();
        public Task Publish<T>(T m, IPipe<PublishContext<T>> p, CancellationToken c = default) where T : class => Bump();
        public Task Publish<T>(T m, IPipe<PublishContext> p, CancellationToken c = default) where T : class => Bump();
        public Task Publish(object m, CancellationToken c = default) => Bump();
        public Task Publish(object m, IPipe<PublishContext> p, CancellationToken c = default) => Bump();
        public Task Publish(object m, Type t, CancellationToken c = default) => Bump();
        public Task Publish(object m, Type t, IPipe<PublishContext> p, CancellationToken c = default) => Bump();
        public Task Publish<T>(object v, CancellationToken c = default) where T : class => Bump();
        public Task Publish<T>(object v, IPipe<PublishContext<T>> p, CancellationToken c = default) where T : class => Bump();
        public Task Publish<T>(object v, IPipe<PublishContext> p, CancellationToken c = default) where T : class => Bump();
        public ConnectHandle ConnectPublishObserver(IPublishObserver o) => throw new NotSupportedException();
    }

    private static PaymentIntent Seed(PaymentsDbContext db, decimal amount = 290_000m)
    {
        var p = PaymentIntent.Create(Guid.NewGuid(), amount, "VND", PaymentProvider.VnPay, Guid.NewGuid().ToString());
        db.PaymentIntents.Add(p);
        db.SaveChanges();
        return p;
    }

    [Fact]
    public async Task LechSoTien_KhongSucceed_GhiAmountMismatch_KhongPublish()
    {
        using var db = NewDb();
        var payment = Seed(db, 290_000m);
        var bus = new CountingBus();
        var handler = new PaymentWebhookHandler(db, bus, NullLogger<PaymentWebhookHandler>.Instance);

        var result = await handler.ProcessAsync(
            "VNPay", "TXN-LECH", payment.Id, success: true, failureReason: null, gatewayAmount: 1_000m);

        result.AmountMismatch.Should().BeTrue();
        result.Processed.Should().BeFalse();
        (await db.PaymentIntents.FindAsync(payment.Id))!.Status.Should().Be(PaymentStatus.Pending);
        db.ProcessedWebhooks.Single().Result.Should().Be("AmountMismatch");
        bus.PublishCount.Should().Be(0);
    }

    [Fact]
    public async Task DungSoTien_Succeed_BinhThuong()
    {
        using var db = NewDb();
        var payment = Seed(db, 290_000m);
        var bus = new CountingBus();
        var handler = new PaymentWebhookHandler(db, bus, NullLogger<PaymentWebhookHandler>.Instance);

        var result = await handler.ProcessAsync(
            "VNPay", "TXN-DUNG", payment.Id, success: true, failureReason: null, gatewayAmount: 290_000m);

        result.AmountMismatch.Should().BeFalse();
        result.Processed.Should().BeTrue();
        (await db.PaymentIntents.FindAsync(payment.Id))!.Status.Should().Be(PaymentStatus.Succeeded);
        bus.PublishCount.Should().Be(1);
    }

    [Fact]
    public async Task KhongBietSoTien_VanXuLy_KhongChan()
    {
        using var db = NewDb();
        var payment = Seed(db);
        var bus = new CountingBus();
        var handler = new PaymentWebhookHandler(db, bus, NullLogger<PaymentWebhookHandler>.Instance);

        var result = await handler.ProcessAsync(
            "VNPay", "TXN-NOAMOUNT", payment.Id, success: true, failureReason: null, gatewayAmount: null);

        result.Processed.Should().BeTrue();
        (await db.PaymentIntents.FindAsync(payment.Id))!.Status.Should().Be(PaymentStatus.Succeeded);
    }

    [Fact]
    public async Task WebhookBaoThatBai_DenSauKhiDaSucceeded_KhongGoTrangThai()
    {
        using var db = NewDb();
        var payment = Seed(db);
        var bus = new CountingBus();
        var handler = new PaymentWebhookHandler(db, bus, NullLogger<PaymentWebhookHandler>.Instance);

        await handler.ProcessAsync("VNPay", "TXN-OK", payment.Id, true, null, 290_000m);
        await handler.ProcessAsync("VNPay", "TXN-LATE-FAIL", payment.Id, false, "timeout đến muộn");

        (await db.PaymentIntents.FindAsync(payment.Id))!.Status.Should().Be(PaymentStatus.Succeeded);
    }
}
