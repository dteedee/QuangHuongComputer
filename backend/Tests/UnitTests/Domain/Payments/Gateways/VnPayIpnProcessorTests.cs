using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Payments.Application;
using Payments.Application.Providers.VnPay;
using Payments.Domain;
using Payments.Infrastructure;
using Xunit;

namespace UnitTests.Domain.Payments.Gateways;

/// <summary>
/// W2-21 bước 4 — IPN là **đường ghi duy nhất** và mã `RspCode` quyết định VNPay có thử lại không.
/// Mỗi nhánh một test: trả nhầm mã nghĩa là hoặc mất hẳn một khoản tiền đã thu (kết thúc luồng quá
/// sớm), hoặc VNPay đập 10 lần trong 50 phút.
/// </summary>
public class VnPayIpnProcessorTests
{
    private static (VnPayIpnProcessor Processor, PaymentsDbContext Db, VnPayFixtures.CountingBus Bus) NewProcessor()
    {
        var db = VnPayFixtures.NewDb();
        var bus = new VnPayFixtures.CountingBus();
        var handler = new PaymentWebhookHandler(db, bus, NullLogger<PaymentWebhookHandler>.Instance);
        return (new VnPayIpnProcessor(handler, NullLogger<VnPayIpnProcessor>.Instance), db, bus);
    }

    private static Dictionary<string, string?> IpnFor(
        PaymentIntent intent, decimal amount, string responseCode = "00",
        string transactionStatus = "00", string transactionNo = "14523698")
        => VnPayFixtures.Ipn(
            txnRef: intent.ExternalId!,
            amountUnits: ((long)(amount * 100m)).ToString(),
            responseCode: responseCode,
            transactionStatus: transactionStatus,
            transactionNo: transactionNo);

    // ------------------------------------------------------------------ 00

    [Fact]
    public async Task ThanhCong_Tra00_VaIntentSucceeded()
    {
        var (processor, db, bus) = NewProcessor();
        var intent = VnPayFixtures.SeedIntent(db);

        var ack = await processor.ProcessAsync(IpnFor(intent, VnPayFixtures.Amount), VnPayFixtures.HashSecret);

        ack.RspCode.Should().Be("00");
        ack.Message.Should().Be("Confirm Success");
        db.PaymentIntents.Single().Status.Should().Be(PaymentStatus.Succeeded);
        bus.PublishCount.Should().Be(1);
    }

    // ------------------------------------------------------------------ 02 (phát lại)

    [Fact]
    public async Task PhatLaiCungIPN_Tra02_VaKhongDoiGi()
    {
        var (processor, db, bus) = NewProcessor();
        var intent = VnPayFixtures.SeedIntent(db);
        var ipn = IpnFor(intent, VnPayFixtures.Amount);

        (await processor.ProcessAsync(ipn, VnPayFixtures.HashSecret)).RspCode.Should().Be("00");
        var confirmedAt = db.PaymentIntents.Single().ConfirmedAt;

        var replay = await processor.ProcessAsync(ipn, VnPayFixtures.HashSecret);

        replay.RspCode.Should().Be("02");
        VnPayResponseCodes.IsTerminal(replay.RspCode).Should().BeTrue("02 làm VNPay dừng retry");
        db.PaymentIntents.Single().ConfirmedAt.Should().Be(confirmedAt);
        db.PaymentIntents.Single().AmountRefunded.Should().Be(0m);
        db.ProcessedWebhooks.Count().Should().Be(1, "chỉ được ghi MỘT bản ghi cho một giao dịch");
        bus.PublishCount.Should().Be(1, "không phát sự kiện thu tiền lần hai");
    }

    // ------------------------------------------------------------------ 04 (lệch tiền)

    [Fact]
    public async Task LechSoTien_Tra04_VaKhongXacNhan()
    {
        var (processor, db, bus) = NewProcessor();
        var intent = VnPayFixtures.SeedIntent(db, amount: 29_000_000m);

        // Kẻ tấn công (hoặc lỗi cấu hình) trả về 1.000đ và KÝ ĐÚNG bằng secret thật.
        var ack = await processor.ProcessAsync(IpnFor(intent, 1_000m), VnPayFixtures.HashSecret);

        ack.RspCode.Should().Be("04");
        VnPayResponseCodes.CausesRetry(ack.RspCode).Should().BeTrue();
        db.PaymentIntents.Single().Status.Should().Be(PaymentStatus.Pending, "không bao giờ thu theo số tiền cổng gửi");
        bus.PublishCount.Should().Be(0);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("khong-phai-so")]
    [InlineData("0")]
    [InlineData("-100")]
    public async Task VnpAmountHong_Tra04(string? amountUnits)
    {
        var (processor, db, _) = NewProcessor();
        var intent = VnPayFixtures.SeedIntent(db);
        var ipn = VnPayFixtures.Ipn(txnRef: intent.ExternalId!);
        if (amountUnits is null) ipn.Remove("vnp_Amount"); else ipn["vnp_Amount"] = amountUnits;
        VnPayFixtures.Sign(ipn);

        (await processor.ProcessAsync(ipn, VnPayFixtures.HashSecret)).RspCode.Should().Be("04");
    }

    // ------------------------------------------------------------------ 97 (chữ ký)

    [Fact]
    public async Task ChuKySai_Tra97_VaKhongDoiTrangThai()
    {
        var (processor, db, _) = NewProcessor();
        var intent = VnPayFixtures.SeedIntent(db);
        var ipn = IpnFor(intent, VnPayFixtures.Amount);
        ipn[VnPaySignature.HashField] = new string('a', 128);

        (await processor.ProcessAsync(ipn, VnPayFixtures.HashSecret)).RspCode.Should().Be("97");
        db.PaymentIntents.Single().Status.Should().Be(PaymentStatus.Pending);
    }

    [Fact]
    public async Task ThieuChuKy_Tra97()
    {
        var (processor, db, _) = NewProcessor();
        var intent = VnPayFixtures.SeedIntent(db);
        var ipn = IpnFor(intent, VnPayFixtures.Amount);
        ipn.Remove(VnPaySignature.HashField);

        (await processor.ProcessAsync(ipn, VnPayFixtures.HashSecret)).RspCode.Should().Be("97");
    }

    [Theory]
    [InlineData("")]
    [InlineData("${VNPAY_HASH_SECRET}")]
    [InlineData("DEMOSECRET")]
    public async Task SecretChuaCauHinh_Tra97_KeCaKhiIPNTuKyBangNo(string secret)
    {
        var (processor, db, _) = NewProcessor();
        var intent = VnPayFixtures.SeedIntent(db);
        var ipn = IpnFor(intent, VnPayFixtures.Amount);
        ipn[VnPaySignature.HashField] = VnPaySignature.Sign(secret, ipn);

        (await processor.ProcessAsync(ipn, secret)).RspCode.Should().Be("97");
        db.PaymentIntents.Single().Status.Should().Be(PaymentStatus.Pending);
    }

    // ------------------------------------------------------------------ 01 (không tìm ra đơn)

    [Fact]
    public async Task KhongCoIntent_Tra01_DeVNPayThuLai()
    {
        var (processor, db, _) = NewProcessor();
        var ipn = VnPayFixtures.Ipn(txnRef: VnPayFixtures.TxnRef);   // intent này không tồn tại

        var ack = await processor.ProcessAsync(ipn, VnPayFixtures.HashSecret);

        ack.RspCode.Should().Be("01");
        VnPayResponseCodes.CausesRetry(ack.RspCode).Should().BeTrue();
        db.PaymentIntents.Should().BeEmpty();
    }

    [Fact]
    public async Task PhatLaiSauKhiKhongTimRaIntent_VanTra01_KhongPhai02()
    {
        // Ca thật: IPN đến trước khi intent commit. `PaymentWebhookHandler` ghi một bản "Ignored"
        // (PaymentIntentId = null). Trả 02 ở lần hai sẽ làm VNPay dừng và mất hẳn khoản tiền này.
        var (processor, _, _) = NewProcessor();
        var ipn = VnPayFixtures.Ipn(txnRef: VnPayFixtures.TxnRef);

        (await processor.ProcessAsync(ipn, VnPayFixtures.HashSecret)).RspCode.Should().Be("01");
        (await processor.ProcessAsync(ipn, VnPayFixtures.HashSecret)).RspCode.Should().Be("01");
    }

    [Theory]
    [InlineData("qua-ngan")]
    [InlineData("khongphailaguid_khongphailaguid_260918203000")]
    public async Task TxnRefHong_Tra01(string txnRef)
    {
        var (processor, _, _) = NewProcessor();
        var ipn = VnPayFixtures.Ipn(txnRef: txnRef);
        (await processor.ProcessAsync(ipn, VnPayFixtures.HashSecret)).RspCode.Should().Be("01");
    }

    // ------------------------------------------------------------------ giao dịch thất bại

    [Fact]
    public async Task KhachHuyGiaoDich_Tra00_NhungIntentFailed()
    {
        var (processor, db, _) = NewProcessor();
        var intent = VnPayFixtures.SeedIntent(db);

        var ack = await processor.ProcessAsync(
            IpnFor(intent, VnPayFixtures.Amount, responseCode: "24", transactionStatus: "02", transactionNo: "0"),
            VnPayFixtures.HashSecret);

        ack.RspCode.Should().Be("00", "đã ghi nhận xong kết quả — VNPay không cần thử lại");
        var saved = db.PaymentIntents.Single();
        saved.Status.Should().Be(PaymentStatus.Failed);
        saved.FailureReason.Should().Contain("hủy giao dịch");
    }

    [Fact]
    public async Task ResponseCode00NhungTransactionStatusKhac00_KhongCoiLaDaThu()
    {
        var (processor, db, _) = NewProcessor();
        var intent = VnPayFixtures.SeedIntent(db);

        await processor.ProcessAsync(
            IpnFor(intent, VnPayFixtures.Amount, responseCode: "00", transactionStatus: "02"),
            VnPayFixtures.HashSecret);

        db.PaymentIntents.Single().Status.Should().Be(PaymentStatus.Failed,
            "vnp_TransactionStatus mới là kết quả cuối của giao dịch");
    }

    [Fact]
    public async Task IPNThatBaiCuaHaiDonKhacNhau_KhongDungKhoaChongLapCuaNhau()
    {
        // VNPay trả `vnp_TransactionNo=0` cho giao dịch hỏng. Nếu khoá chống lặp chỉ là số đó thì
        // đơn thứ hai bị coi là "đã xử lý" và không bao giờ được ghi Failed.
        var (processor, db, _) = NewProcessor();
        var a = VnPayFixtures.SeedIntent(db);
        var b = VnPayFixtures.SeedIntent(db);

        await processor.ProcessAsync(
            IpnFor(a, VnPayFixtures.Amount, "24", "02", "0"), VnPayFixtures.HashSecret);
        var ack = await processor.ProcessAsync(
            IpnFor(b, VnPayFixtures.Amount, "24", "02", "0"), VnPayFixtures.HashSecret);

        ack.RspCode.Should().Be("00");
        db.PaymentIntents.Should().OnlyContain(p => p.Status == PaymentStatus.Failed);
    }

    // ------------------------------------------------------------------ bảng mã

    [Fact]
    public void BangMa_DungSauMa_VaChiaDungTerminalVsRetry()
    {
        VnPayResponseCodes.All.Select(a => a.RspCode)
            .Should().BeEquivalentTo(new[] { "00", "01", "02", "04", "97", "99" });
        VnPayResponseCodes.TerminalCodes.Should().BeEquivalentTo(new[] { "00", "02" });
        VnPayResponseCodes.RetryCodes.Should().BeEquivalentTo(new[] { "01", "04", "97", "99" });
        VnPayResponseCodes.All.Should().OnlyContain(a => a.Message.Length > 0);
    }

    [Fact]
    public void KhoaChongLap_GhepTxnRefVaTransactionNo_VaKhongVuot200KyTu()
    {
        VnPayIpnProcessor.BuildDedupeKey(VnPayFixtures.TxnRef, "14523698")
            .Should().Be($"{VnPayFixtures.TxnRef}:14523698");
        VnPayIpnProcessor.BuildDedupeKey(VnPayFixtures.TxnRef, null)
            .Should().Be($"{VnPayFixtures.TxnRef}:0");
        VnPayIpnProcessor.BuildDedupeKey(new string('x', 300), "1").Length.Should().Be(200);
    }
}
