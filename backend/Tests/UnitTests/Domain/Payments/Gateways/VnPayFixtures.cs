using MassTransit;
using Microsoft.EntityFrameworkCore;
using Payments.Application.Providers.VnPay;
using Payments.Domain;
using Payments.Infrastructure;

namespace UnitTests.Domain.Payments.Gateways;

/// <summary>
/// W2-21 — bộ dữ liệu mẫu VNPay dùng chung cho mọi test cổng. Không test nào chạm mạng.
///
/// **Nguồn gốc của các giá trị:** tên trường, độ dài và định dạng lấy từ đặc tả VNPay 2.1.0
/// ([S8] thanh-toan-pay, [S9] querydr&amp;refund) như D04 đã trích. Chúng **không phải** bản ghi
/// chụp từ một tài khoản sandbox thật — dự án chưa có `TmnCode`/`HashSecret` sandbox nào (xem
/// mục "Chưa giải quyết" của báo cáo W2-21). Vì vậy giá trị kỳ vọng của chữ ký được tính bằng
/// MỘT cài đặt ĐỘC LẬP (`openssl dgst -sha512 -hmac`) chứ không phải bằng chính code đang test:
/// xem <see cref="ExpectedPayHashFromOpenSsl"/>.
/// </summary>
internal static class VnPayFixtures
{
    /// <summary>Secret test. Phải vượt được <c>WebhookSignature.IsConfiguredSecret</c> (không DEMO/TEST/${}).</summary>
    public const string HashSecret = "QHVNPAYHASHSECRET2026";

    public const string TmnCode = "QHC01234";

    public static readonly Guid IntentId = Guid.ParseExact("1f7b0e42000040008000000000000001", "N");

    /// <summary>32 ký tự intent id + 12 ký tự `yyMMddHHmmss` (18/09/2026 20:30:00 giờ VN).</summary>
    public const string TxnRef = "1f7b0e42000040008000000000000001260918203000";

    public const string CreateDate = "20260918203000";

    public const decimal Amount = 290_000m;

    /// <summary>
    /// Chuỗi ký của URL thanh toán mẫu — sắp xếp ordinal, bỏ giá trị rỗng, encode kiểu
    /// <c>WebUtility.UrlEncode</c> (hex CHỮ HOA, khoảng trắng thành <c>+</c>).
    /// </summary>
    public const string PayCanonical =
        "vnp_Amount=29000000&vnp_BankCode=NCB&vnp_Command=pay&vnp_CreateDate=20260918203000" +
        "&vnp_CurrCode=VND&vnp_ExpireDate=20260918204500&vnp_IpAddr=113.161.0.1&vnp_Locale=vn" +
        "&vnp_OrderInfo=Thanh+toan+don+hang+1F7B0E42&vnp_OrderType=other" +
        "&vnp_ReturnUrl=https%3A%2F%2Fquanghuongcomputer.vn%2Fapi%2Fpayments%2Fv2%2Fvnpay%2Freturn" +
        "&vnp_TmnCode=QHC01234&vnp_TxnRef=1f7b0e42000040008000000000000001260918203000&vnp_Version=2.1.0";

    /// <summary>
    /// HMAC-SHA512 của <see cref="PayCanonical"/> với <see cref="HashSecret"/>, tính bằng
    /// <c>openssl dgst -sha512 -hmac 'QHVNPAYHASHSECRET2026'</c> (2026-09-18).
    /// Đây là "known answer" độc lập: nếu code đổi cách encode/sắp xếp, test này đỏ.
    /// </summary>
    public const string ExpectedPayHashFromOpenSsl =
        "826274979fcda13bc3b7d87ee5569e234976c5d3d30f723d9e15838f6a838a4f" +
        "b4fa6d3e51b1e2fdc7666486d7f6f6dca0f6aed8902de11dd473d074f5acda95";

    /// <summary>Chuỗi ký dạng ống của `querydr` (thứ tự trường theo [S9]).</summary>
    public const string QueryRequestId = "a1b2c3d4e5f60718293a4b5c6d7e8f90";

    public const string QueryCanonical =
        "a1b2c3d4e5f60718293a4b5c6d7e8f90|2.1.0|querydr|QHC01234" +
        "|1f7b0e42000040008000000000000001260918203000|20260918203000|20260918205500|127.0.0.1" +
        "|Tra cuu giao dich 1f7b0e42000040008000000000000001";

    /// <summary>HMAC-SHA512 của <see cref="QueryCanonical"/>, cũng tính bằng openssl.</summary>
    public const string ExpectedQueryHashFromOpenSsl =
        "ad9ab8b8009910c91a2c804488b997539e89149a794b9daac9f9b832c593be96" +
        "0f6c1b42515b34cbfe942fa386dd62ce84df1085813bbc3e1bc03446279a0332";

    /// <summary>Tập tham số của URL thanh toán mẫu (chưa kèm chữ ký).</summary>
    public static Dictionary<string, string?> PayFields() => new(StringComparer.Ordinal)
    {
        ["vnp_Version"] = "2.1.0",
        ["vnp_Command"] = "pay",
        ["vnp_TmnCode"] = TmnCode,
        ["vnp_Amount"] = "29000000",
        ["vnp_CreateDate"] = CreateDate,
        ["vnp_ExpireDate"] = "20260918204500",
        ["vnp_CurrCode"] = "VND",
        ["vnp_IpAddr"] = "113.161.0.1",
        ["vnp_Locale"] = "vn",
        ["vnp_OrderInfo"] = "Thanh toan don hang 1F7B0E42",
        ["vnp_OrderType"] = "other",
        ["vnp_ReturnUrl"] = "https://quanghuongcomputer.vn/api/payments/v2/vnpay/return",
        ["vnp_TxnRef"] = TxnRef,
        ["vnp_BankCode"] = "NCB"
    };

    /// <summary>Một IPN hợp lệ đã ký. Người gọi chỉnh trường rồi ký lại bằng <see cref="Sign"/>.</summary>
    public static Dictionary<string, string?> Ipn(
        string txnRef = TxnRef,
        string amountUnits = "29000000",
        string responseCode = "00",
        string transactionStatus = "00",
        string transactionNo = "14523698")
    {
        var data = new Dictionary<string, string?>(StringComparer.Ordinal)
        {
            ["vnp_TmnCode"] = TmnCode,
            ["vnp_Amount"] = amountUnits,
            ["vnp_BankCode"] = "NCB",
            ["vnp_BankTranNo"] = "VNP14523698",
            ["vnp_CardType"] = "ATM",
            ["vnp_OrderInfo"] = "Thanh toan don hang 1F7B0E42",
            ["vnp_PayDate"] = "20260918203512",
            ["vnp_ResponseCode"] = responseCode,
            ["vnp_TransactionNo"] = transactionNo,
            ["vnp_TransactionStatus"] = transactionStatus,
            ["vnp_TxnRef"] = txnRef,
            ["vnp_SecureHashType"] = "SHA512"
        };
        return Sign(data);
    }

    /// <summary>Ký lại một tập tham số (dùng sau khi test sửa một trường).</summary>
    public static Dictionary<string, string?> Sign(Dictionary<string, string?> data)
    {
        data.Remove(VnPaySignature.HashField);
        data[VnPaySignature.HashField] = VnPaySignature.Sign(HashSecret, data);
        return data;
    }

    public static PaymentsDbContext NewDb() => new(
        new DbContextOptionsBuilder<PaymentsDbContext>()
            .UseInMemoryDatabase($"vnpay-{Guid.NewGuid()}")
            .Options);

    /// <summary>
    /// Intent VNPay đang chờ, đã mang `vnp_TxnRef` trên <c>ExternalId</c> như lúc tạo lệnh.
    /// <c>Entity&lt;TId&gt;.Id</c> là <c>init</c>-only nên không đặt id trước được: mã tham chiếu
    /// phải dựng TỪ intent vừa tạo (<see cref="TxnRefFor"/>), đúng như lúc chạy thật.
    /// </summary>
    public static PaymentIntent SeedIntent(PaymentsDbContext db, decimal amount = Amount)
    {
        var intent = PaymentIntent.Create(
            orderId: Guid.NewGuid(), amount: amount, currency: "VND",
            provider: PaymentProvider.VnPay, idempotencyKey: Guid.NewGuid().ToString());
        intent.SetExternalId(TxnRefFor(intent), null);
        db.PaymentIntents.Add(intent);
        db.SaveChanges();
        return intent;
    }

    public static string TxnRefFor(PaymentIntent intent)
        => VnPayPaymentUrlBuilder.BuildTxnRef(intent.Id, new DateTime(2026, 9, 18, 20, 30, 0));

    /// <summary>Bus giả — chỉ đếm, không gửi gì.</summary>
    internal sealed class CountingBus : IPublishEndpoint
    {
        public int PublishCount;

        private Task Count() { Interlocked.Increment(ref PublishCount); return Task.CompletedTask; }

        public Task Publish<T>(T message, CancellationToken cancellationToken = default) where T : class => Count();
        public Task Publish<T>(T message, IPipe<PublishContext<T>> pipe, CancellationToken cancellationToken = default) where T : class => Count();
        public Task Publish<T>(T message, IPipe<PublishContext> pipe, CancellationToken cancellationToken = default) where T : class => Count();
        public Task Publish(object message, CancellationToken cancellationToken = default) => Count();
        public Task Publish(object message, IPipe<PublishContext> pipe, CancellationToken cancellationToken = default) => Count();
        public Task Publish(object message, Type messageType, CancellationToken cancellationToken = default) => Count();
        public Task Publish(object message, Type messageType, IPipe<PublishContext> pipe, CancellationToken cancellationToken = default) => Count();
        public Task Publish<T>(object values, CancellationToken cancellationToken = default) where T : class => Count();
        public Task Publish<T>(object values, IPipe<PublishContext<T>> pipe, CancellationToken cancellationToken = default) where T : class => Count();
        public Task Publish<T>(object values, IPipe<PublishContext> pipe, CancellationToken cancellationToken = default) where T : class => Count();
        public ConnectHandle ConnectPublishObserver(IPublishObserver observer) => throw new NotSupportedException();
    }
}
