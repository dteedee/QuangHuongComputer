using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using BuildingBlocks.Endpoints;
using Payments.Application.Configuration;
using Payments.Application.Providers;
using Payments.Application.Refunds;
using Payments.Domain;
using Payments.Infrastructure;
using Xunit;

namespace UnitTests.Domain.Payments;

/// <summary>
/// W4-5 / H2 — phiếu hoàn tiền phải bị chặn theo TỔNG, kể cả phiếu chưa chi.
///
/// Hoàn tiền là chuyển khoản TAY: tiền rời ngân hàng ở bước kế toán chuyển, còn
/// <c>AmountRefunded</c> chỉ tăng lúc bấm "đã trả". Nếu chốt chỉ so <c>AmountRefunded</c> thì N phiếu
/// trọn giá trị đều lập + duyệt được, và mỗi phiếu được chi một lần.
/// </summary>
public class PaymentRefundOverdraftTests
{
    private sealed class FakeEnv : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Development";
        public string ApplicationName { get; set; } = "Tests";
        public string ContentRootPath { get; set; } = "/";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private static PaymentsDbContext NewDb() =>
        new(new DbContextOptionsBuilder<PaymentsDbContext>()
            .UseInMemoryDatabase($"payments-refund-{Guid.NewGuid()}")
            .Options);

    private static PaymentRefundService NewService(PaymentsDbContext db)
    {
        // Không cổng nào cấu hình ⇒ Resolve trả null ⇒ mọi phiếu rơi về đường thủ công (đúng D04 mục 4).
        var guard = new PaymentConfigGuard(
            new ConfigurationBuilder().Build(), new FakeEnv(), NullLogger<PaymentConfigGuard>.Instance);
        var registry = new PaymentProviderRegistry(
            Array.Empty<IPaymentProvider>(), guard, NullLogger<PaymentProviderRegistry>.Instance);
        return new PaymentRefundService(db, registry, NullLogger<PaymentRefundService>.Instance);
    }

    private static PaymentIntent SeedPaid(PaymentsDbContext db, decimal amount = 10_000_000m)
    {
        var intent = PaymentIntent.Create(
            Guid.NewGuid(), amount, "VND", PaymentProvider.SePay, Guid.NewGuid().ToString());
        intent.Succeed();
        db.PaymentIntents.Add(intent);
        db.SaveChanges();
        return intent;
    }

    /// <summary>Lỗ hổng H2: hai phiếu trọn giá trị cùng tồn tại ⇒ chi tiền hai lần.</summary>
    [Fact]
    public async Task TaoPhieuHoanThuHai_KhiPhieuDauChuaChi_ThiBiChan()
    {
        using var db = NewDb();
        var svc = NewService(db);
        var intent = SeedPaid(db);

        var first = await svc.RequestAsync(
            intent.Id, 10_000_000m, RefundChannel.ManualTransfer, "Khách trả hàng", null, "key-1");
        first.Status.Should().Be(RefundStatus.Requested);

        var act = async () => await svc.RequestAsync(
            intent.Id, 10_000_000m, RefundChannel.ManualTransfer, "Khách trả hàng (lần 2)", null, "key-2");

        (await act.Should().ThrowAsync<ConflictException>())
            .WithMessage("*vượt quá số tiền đã thu*");

        db.PaymentRefunds.Count(r => r.PaymentIntentId == intent.Id)
            .Should().Be(1, "chỉ được tồn tại đúng một phiếu trọn giá trị");
    }

    /// <summary>Duyệt cũng không mở được đường vòng: phiếu thứ hai chưa bao giờ ra đời.</summary>
    [Fact]
    public async Task DuyetNhieuPhieu_TongVuotSoDaThu_ThiBiChan()
    {
        using var db = NewDb();
        var svc = NewService(db);
        var intent = SeedPaid(db);

        var a = await svc.RequestAsync(
            intent.Id, 6_000_000m, RefundChannel.ManualTransfer, "Phần 1", null, "key-a");
        await svc.ApproveAsync(a.Id, Guid.NewGuid());

        var act = async () => await svc.RequestAsync(
            intent.Id, 5_000_000m, RefundChannel.ManualTransfer, "Phần 2", null, "key-b");
        await act.Should().ThrowAsync<ConflictException>();

        var ok = await svc.RequestAsync(
            intent.Id, 4_000_000m, RefundChannel.ManualTransfer, "Phần 2 vừa đủ", null, "key-c");
        ok.Amount.Should().Be(4_000_000m, "phần còn lại trong hạn mức vẫn phải lập được");

        var reloaded = await db.PaymentIntents.FirstAsync(p => p.Id == intent.Id);
        reloaded.AmountRefundPending.Should().Be(10_000_000m);
    }

    /// <summary>Từ chối phiếu phải nhả chỗ đã giữ — nếu không hạn mức hoàn bị khoá vĩnh viễn.</summary>
    [Fact]
    public async Task TuChoiPhieu_ThiNhaChoDaGiu()
    {
        using var db = NewDb();
        var svc = NewService(db);
        var intent = SeedPaid(db);

        var a = await svc.RequestAsync(
            intent.Id, 10_000_000m, RefundChannel.ManualTransfer, "Nhầm", null, "key-a");
        await svc.RejectAsync(a.Id, "Lập nhầm");

        var b = await svc.RequestAsync(
            intent.Id, 10_000_000m, RefundChannel.ManualTransfer, "Phiếu đúng", null, "key-b");
        b.Status.Should().Be(RefundStatus.Requested);

        var reloaded = await db.PaymentIntents.FirstAsync(p => p.Id == intent.Id);
        reloaded.AmountRefundPending.Should().Be(10_000_000m, "chỉ còn chỗ giữ của phiếu đúng");
    }

    /// <summary>Hoàn tất thì chỗ giữ chuyển thành tiền đã hoàn, không cộng hai lần.</summary>
    [Fact]
    public async Task HoanTatPhieu_ChoGiuChuyenThanhTienDaHoan()
    {
        using var db = NewDb();
        var svc = NewService(db);
        var intent = SeedPaid(db);

        var a = await svc.RequestAsync(
            intent.Id, 4_000_000m, RefundChannel.ManualTransfer, "Trả một phần", null, "key-a");
        await svc.ApproveAsync(a.Id, Guid.NewGuid());
        await svc.CompleteAsync(a.Id, "FT26091900001", RefundChannel.ManualTransfer);

        var reloaded = await db.PaymentIntents.FirstAsync(p => p.Id == intent.Id);
        reloaded.AmountRefunded.Should().Be(4_000_000m);
        reloaded.AmountRefundPending.Should().Be(0m);
        reloaded.Status.Should().Be(PaymentStatus.PartiallyRefunded);

        // Phần còn lại vẫn hoàn được, nhưng không quá phần còn lại.
        var act = async () => await svc.RequestAsync(
            intent.Id, 6_000_001m, RefundChannel.ManualTransfer, "Quá tay", null, "key-b");
        await act.Should().ThrowAsync<ConflictException>();

        var b = await svc.RequestAsync(
            intent.Id, 6_000_000m, RefundChannel.ManualTransfer, "Phần còn lại", null, "key-b2");
        b.Amount.Should().Be(6_000_000m);
    }
}
