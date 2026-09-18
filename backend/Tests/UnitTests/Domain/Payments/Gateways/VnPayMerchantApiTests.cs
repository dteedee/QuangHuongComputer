using System.Net;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Payments.Application.Providers.VnPay;
using Payments.Domain;
using Payments.Infrastructure.VNPay;
using Xunit;

namespace UnitTests.Domain.Payments.Gateways;

/// <summary>
/// W2-21 bước 5-6 — `querydr` + `refund` của `merchant_webapi` ([S9]).
///
/// Điểm quan trọng nhất ở đây KHÔNG phải "gọi được API" mà là: khi không xác thực được phản hồi,
/// hệ thống **không bao giờ** báo là đã hoàn tiền. Sai ở đó là hoàn cho khách hai lần.
/// </summary>
public class VnPayMerchantApiTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private sealed class StubHandler : HttpMessageHandler
    {
        public string? CapturedBody;
        public HttpStatusCode Status = HttpStatusCode.OK;
        public Func<VnPayMerchantResponse> Respond = () => new VnPayMerchantResponse();

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CapturedBody = request.Content is null
                ? null
                : await request.Content.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(Status)
            {
                Content = new StringContent(
                    JsonSerializer.Serialize(Respond(), Json), Encoding.UTF8, "application/json")
            };
        }
    }

    private static (VnPayMerchantApiClient Client, StubHandler Stub) NewClient()
    {
        var stub = new StubHandler();
        var options = VnPayOptions.ForTesting(VnPayFixtures.TmnCode, VnPayFixtures.HashSecret);
        return (new VnPayMerchantApiClient(new HttpClient(stub), options, NullLogger.Instance), stub);
    }

    private static PaymentIntent PaidIntent(decimal amount = VnPayFixtures.Amount)
    {
        var intent = PaymentIntent.Create(
            Guid.NewGuid(), amount, "VND", PaymentProvider.VnPay, Guid.NewGuid().ToString());
        intent.SetExternalId(VnPayFixtures.TxnRefFor(intent), null);
        intent.Succeed();
        return intent;
    }

    /// <summary>Phản hồi hợp lệ, ĐÃ ký đúng thứ tự trường tài liệu.</summary>
    private static VnPayMerchantResponse SignedResponse(
        string command, decimal amount, string transactionStatus = "00", string responseCode = "00")
    {
        var response = new VnPayMerchantResponse
        {
            ResponseId = Guid.NewGuid().ToString("N"),
            Command = command,
            ResponseCode = responseCode,
            Message = "Success",
            TmnCode = VnPayFixtures.TmnCode,
            TxnRef = VnPayFixtures.TxnRef,
            Amount = VnPayMerchantApi.ToUnits(amount),
            BankCode = "NCB",
            PayDate = "20260918203512",
            TransactionNo = "14523698",
            TransactionType = command == VnPayMerchantApi.QueryCommand ? "01" : "02",
            TransactionStatus = transactionStatus,
            OrderInfo = "Thanh toan don hang"
        };
        response.SecureHash = VnPaySignature.SignPipe(
            VnPayFixtures.HashSecret, VnPayMerchantApi.ResponseChecksumFields(response));
        return response;
    }

    // ------------------------------------------------------------------ chữ ký

    [Fact]
    public void ChuKyQuerydr_TrungVoiOpenSsl()
    {
        var request = new VnPayQueryRequest
        {
            RequestId = VnPayFixtures.QueryRequestId,
            TmnCode = VnPayFixtures.TmnCode,
            TxnRef = VnPayFixtures.TxnRef,
            OrderInfo = "Tra cuu giao dich 1f7b0e42000040008000000000000001",
            TransactionDate = VnPayFixtures.CreateDate,
            CreateDate = "20260918205500",
            IpAddr = "127.0.0.1"
        };
        VnPayMerchantApi.Sign(VnPayFixtures.HashSecret, request)
            .Should().Be(VnPayFixtures.ExpectedQueryHashFromOpenSsl);
    }

    [Fact]
    public void ThuTuTruongChuKyRefund_DungTaiLieu()
    {
        var request = new VnPayRefundRequest
        {
            RequestId = "r1", TmnCode = "t", TransactionType = "03", TxnRef = "x", Amount = "100",
            TransactionNo = "n", TransactionDate = "d", CreateBy = "c", CreateDate = "cd",
            IpAddr = "ip", OrderInfo = "oi"
        };
        VnPayMerchantApi.RefundChecksumFields(request).Should().Equal(
            "r1", "2.1.0", "refund", "t", "03", "x", "100", "n", "d", "c", "cd", "ip", "oi");
    }

    [Fact]
    public void ChuKyPhanHoiSai_VerifyFalse()
    {
        var response = SignedResponse(VnPayMerchantApi.QueryCommand, VnPayFixtures.Amount);
        response.Amount = "1";   // sửa sau khi đã ký
        VnPayMerchantApi.VerifyResponse(VnPayFixtures.HashSecret, response).Should().BeFalse();
    }

    [Fact]
    public void DoiDonVi_NhanChiaTram()
    {
        VnPayMerchantApi.ToUnits(290_000m).Should().Be("29000000");
        VnPayMerchantApi.FromUnits("29000000").Should().Be(290_000m);
        VnPayMerchantApi.FromUnits("khong-phai-so").Should().BeNull();
        VnPayMerchantApi.FromUnits(null).Should().BeNull();
    }

    // ------------------------------------------------------------------ querydr

    [Fact]
    public async Task Querydr_DaThuVaKhopTien_TraPaid()
    {
        var (client, stub) = NewClient();
        var intent = PaidIntent();
        stub.Respond = () => SignedResponse(VnPayMerchantApi.QueryCommand, VnPayFixtures.Amount);

        var result = await client.QueryAsync(intent, CancellationToken.None);

        result.Known.Should().BeTrue();
        result.Succeeded.Should().BeTrue();
        result.Amount.Should().Be(VnPayFixtures.Amount);
        stub.CapturedBody.Should().Contain("\"vnp_Command\":\"querydr\"")
            .And.Contain("\"vnp_TransactionDate\":\"20260918203000\"",
                "vnp_TransactionDate phải bằng vnp_CreateDate đã gửi, lấy lại từ đuôi vnp_TxnRef");
    }

    [Fact]
    public async Task Querydr_LechSoTien_KhongBaoGioTraPaid()
    {
        var (client, stub) = NewClient();
        var intent = PaidIntent(29_000_000m);
        stub.Respond = () => SignedResponse(VnPayMerchantApi.QueryCommand, 1_000m);

        var result = await client.QueryAsync(intent, CancellationToken.None);

        result.Known.Should().BeTrue();
        result.Succeeded.Should().BeFalse();
    }

    [Fact]
    public async Task Querydr_ChuKyPhanHoiHong_TraUnknown()
    {
        var (client, stub) = NewClient();
        stub.Respond = () =>
        {
            var r = SignedResponse(VnPayMerchantApi.QueryCommand, VnPayFixtures.Amount);
            r.SecureHash = new string('0', 128);
            return r;
        };

        (await client.QueryAsync(PaidIntent(), CancellationToken.None)).Known.Should().BeFalse();
    }

    [Fact]
    public async Task Querydr_CongLoiHTTP_TraUnknown()
    {
        var (client, stub) = NewClient();
        stub.Status = HttpStatusCode.BadGateway;
        (await client.QueryAsync(PaidIntent(), CancellationToken.None)).Known.Should().BeFalse();
    }

    // ------------------------------------------------------------------ refund

    [Fact]
    public async Task HoanToanPhan_DungType02()
    {
        var (client, stub) = NewClient();
        var intent = PaidIntent();
        stub.Respond = () => SignedResponse(VnPayMerchantApi.RefundCommand, VnPayFixtures.Amount);

        var result = await client.RefundAsync(intent, VnPayFixtures.Amount, "14523698", CancellationToken.None);

        result.Succeeded.Should().BeTrue();
        result.Reference.Should().Be("14523698");
        stub.CapturedBody.Should().Contain("\"vnp_TransactionType\":\"02\"");
    }

    [Fact]
    public async Task HoanMotPhan_DungType03()
    {
        var (client, stub) = NewClient();
        var intent = PaidIntent();
        stub.Respond = () => SignedResponse(VnPayMerchantApi.RefundCommand, 50_000m);

        var result = await client.RefundAsync(intent, 50_000m, "14523698", CancellationToken.None);

        result.Succeeded.Should().BeTrue();
        stub.CapturedBody.Should().Contain("\"vnp_TransactionType\":\"03\"")
            .And.Contain("\"vnp_Amount\":\"5000000\"");
    }

    [Fact]
    public async Task Refund_ChuKyPhanHoiKhongXacThucDuoc_KhongBaoGioBaoDaHoan()
    {
        var (client, stub) = NewClient();
        stub.Respond = () =>
        {
            var r = SignedResponse(VnPayMerchantApi.RefundCommand, VnPayFixtures.Amount);
            r.SecureHash = new string('0', 128);
            return r;
        };

        var result = await client.RefundAsync(PaidIntent(), VnPayFixtures.Amount, "1", CancellationToken.None);

        result.Supported.Should().BeTrue();
        result.Succeeded.Should().BeFalse();
        result.Reference.Should().BeNull();
        result.Error.Should().Contain("kiểm tra trên cổng VNPay TRƯỚC khi chuyển tiền tay");
    }

    [Fact]
    public async Task Refund_CongTuChoi_TraFailedKemMaLoi()
    {
        var (client, stub) = NewClient();
        stub.Respond = () => SignedResponse(VnPayMerchantApi.RefundCommand, VnPayFixtures.Amount, responseCode: "94");

        var result = await client.RefundAsync(PaidIntent(), VnPayFixtures.Amount, "1", CancellationToken.None);

        result.Succeeded.Should().BeFalse();
        result.Error.Should().Contain("94");
    }

    [Fact]
    public async Task Refund_CongChuaHoanXong_KhongCoiLaThanhCong()
    {
        var (client, stub) = NewClient();
        stub.Respond = () => SignedResponse(
            VnPayMerchantApi.RefundCommand, VnPayFixtures.Amount, transactionStatus: "05");

        var result = await client.RefundAsync(PaidIntent(), VnPayFixtures.Amount, "1", CancellationToken.None);

        result.Succeeded.Should().BeFalse();
        result.Error.Should().Contain("05");
    }

    [Fact]
    public async Task ChuaCauHinh_KhongGoiMang_VaTraFailed()
    {
        var stub = new StubHandler();
        var client = new VnPayMerchantApiClient(
            new HttpClient(stub), VnPayOptions.ForTesting("", ""), NullLogger.Instance);

        var refund = await client.RefundAsync(PaidIntent(), 1_000m, "1", CancellationToken.None);
        var query = await client.QueryAsync(PaidIntent(), CancellationToken.None);

        refund.Succeeded.Should().BeFalse();
        query.Known.Should().BeFalse();
        stub.CapturedBody.Should().BeNull("cổng chưa cấu hình thì không được gọi ra ngoài");
    }
}
