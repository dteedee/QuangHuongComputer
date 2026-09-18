using MassTransit;

namespace UnitTests.TestSupport;

/// <summary>
/// Bus giả cho unit test: đếm số lần publish, không gửi đi đâu.
///
/// Dùng khi một service nhận <see cref="IPublishEndpoint"/> qua constructor (ví dụ
/// ReturnOrchestrator, PaymentWebhookHandler). Test chỉ cần biết "có publish đúng số lần
/// mong đợi hay không"; hợp đồng của chính event đã có test riêng ở tầng contract.
///
/// Đặt ở TestSupport vì đã có hơn một nhóm test cần: trước đây mỗi file tự khai báo một
/// bản private, và khi ReturnOrchestrator thêm tham số bus thì test không biên dịch được.
/// </summary>
public sealed class FakePublishEndpoint : IPublishEndpoint
{
    private int _publishCount;

    /// <summary>Số message đã được publish qua bus giả này.</summary>
    public int PublishCount => Volatile.Read(ref _publishCount);

    private Task Count()
    {
        Interlocked.Increment(ref _publishCount);
        return Task.CompletedTask;
    }

    public Task Publish<T>(T message, CancellationToken cancellationToken = default) where T : class => Count();
    public Task Publish<T>(T message, IPipe<PublishContext<T>> publishPipe, CancellationToken cancellationToken = default) where T : class => Count();
    public Task Publish<T>(T message, IPipe<PublishContext> publishPipe, CancellationToken cancellationToken = default) where T : class => Count();
    public Task Publish(object message, CancellationToken cancellationToken = default) => Count();
    public Task Publish(object message, IPipe<PublishContext> publishPipe, CancellationToken cancellationToken = default) => Count();
    public Task Publish(object message, Type messageType, CancellationToken cancellationToken = default) => Count();
    public Task Publish(object message, Type messageType, IPipe<PublishContext> publishPipe, CancellationToken cancellationToken = default) => Count();
    public Task Publish<T>(object values, CancellationToken cancellationToken = default) where T : class => Count();
    public Task Publish<T>(object values, IPipe<PublishContext<T>> publishPipe, CancellationToken cancellationToken = default) where T : class => Count();
    public Task Publish<T>(object values, IPipe<PublishContext> publishPipe, CancellationToken cancellationToken = default) where T : class => Count();

    public ConnectHandle ConnectPublishObserver(IPublishObserver observer) => throw new NotSupportedException();
}
