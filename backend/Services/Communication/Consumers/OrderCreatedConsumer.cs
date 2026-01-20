using BuildingBlocks.Email;
using BuildingBlocks.Messaging.IntegrationEvents;
using MassTransit;

namespace Communication.Consumers;

public class OrderCreatedConsumer(IEmailService emailService) : IConsumer<OrderCreatedIntegrationEvent>
{
    public async Task Consume(ConsumeContext<OrderCreatedIntegrationEvent> context)
    {
        var message = context.Message;
        var subject = $"[Quang Huong Computer] Xác nhận đơn hàng #{message.OrderNumber}";
        
        var body = $@"
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                <h1 style='color: #D70018;'>Cảm ơn bạn đã đặt hàng!</h1>
                <p>Xin chào,</p>
                <p>Chúng tôi đã nhận được đơn hàng <strong>#{message.OrderNumber}</strong> của bạn.</p>
                <p>Tổng giá trị đơn hàng: <strong>{message.TotalAmount:N0} VND</strong></p>
                <hr style='border: 1px dashed #ccc; margin: 20px 0;' />
                <p>Chúng tôi sẽ sớm liên hệ xác nhận và giao hàng cho bạn.</p>
                <p>Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ hotline: <strong>1800.6321</strong></p>
                <br/>
                <p>Trân trọng,</p>
                <p><strong>Quang Huong Computer Team</strong></p>
            </div>
        ";

        await emailService.SendEmailAsync(new EmailMessage 
        { 
            ToEmail = message.Email, 
            Subject = subject, 
            Body = body,
            IsHtml = true
        });
        
        Console.WriteLine($"[Email Sent] To: {message.Email}, Order: {message.OrderNumber}");
    }
}
