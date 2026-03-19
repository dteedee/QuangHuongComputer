using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BuildingBlocks.Email;

public interface IEmailService
{
    Task SendEmailAsync(EmailMessage message);
    Task SendOrderConfirmationAsync(string toEmail, string customerName, string orderNumber, decimal totalAmount);
    Task SendPaymentSuccessAsync(string toEmail, string customerName, string orderNumber, string invoiceNumber);
    Task SendWarrantyRegistrationAsync(string toEmail, string customerName, string productName, string serialNumber, DateTime expirationDate);
}

public class EmailService : IEmailService
{
    private readonly EmailConfig _config;
    private readonly ILogger<EmailService> _logger;
    private readonly string _frontendUrl;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _config = new EmailConfig
        {
            SmtpHost = configuration["Email:SmtpHost"] ?? "smtp.gmail.com",
            SmtpPort = int.Parse(configuration["Email:SmtpPort"] ?? "587"),
            SmtpUsername = configuration["Email:SmtpUsername"] ?? "",
            SmtpPassword = configuration["Email:SmtpPassword"] ?? "",
            FromEmail = configuration["Email:FromEmail"] ?? "noreply@quanghuongcomputer.com",
            FromName = configuration["Email:FromName"] ?? "Quang Huong Computer"
        };
        _logger = logger;
        // Get frontend URL from configuration (Cors allowed origins or explicit setting)
        _frontendUrl = configuration["Frontend:Url"]
            ?? configuration["Cors:AllowedOrigins:0"]
            ?? "http://localhost:3000";
    }

    public async Task SendEmailAsync(EmailMessage message)
    {
        try
        {
            using var client = new SmtpClient(_config.SmtpHost, _config.SmtpPort)
            {
                EnableSsl = true,
                Credentials = new NetworkCredential(_config.SmtpUsername, _config.SmtpPassword)
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress(_config.FromEmail, _config.FromName),
                Subject = message.Subject,
                Body = message.Body,
                IsBodyHtml = message.IsHtml
            };

            mailMessage.To.Add(message.ToEmail);

            await client.SendMailAsync(mailMessage);
            _logger.LogInformation("Email sent successfully to {Email}", message.ToEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}", message.ToEmail);
            throw;
        }
    }

    public async Task SendOrderConfirmationAsync(string toEmail, string customerName, string orderNumber, decimal totalAmount)
    {
        var subject = $"Xác nhận đơn hàng #{orderNumber} - Quang Huong Computer";
        var body = $@"
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #D70018 0%, #b50014 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .order-info {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }}
        .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
        .button {{ display: inline-block; padding: 12px 30px; background: #D70018; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>🎉 Đơn hàng đã được xác nhận!</h1>
        </div>
        <div class=""content"">
            <p>Xin chào <strong>{customerName}</strong>,</p>
            <p>Cảm ơn bạn đã đặt hàng tại <strong>Quang Huong Computer</strong>!</p>
            
            <div class=""order-info"">
                <h3>Thông tin đơn hàng</h3>
                <p><strong>Mã đơn hàng:</strong> {orderNumber}</p>
                <p><strong>Tổng tiền:</strong> {totalAmount:N0} VNĐ</p>
                <p><strong>Trạng thái:</strong> Đang xử lý</p>
            </div>

            <p>Chúng tôi sẽ xử lý đơn hàng của bạn trong thời gian sớm nhất.</p>
            <p>Bạn sẽ nhận được email xác nhận thanh toán sau khi hoàn tất giao dịch.</p>

            <center>
                <a href=""{_frontendUrl}/account/orders"" class=""button"">Xem đơn hàng</a>
            </center>

            <p>Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ với chúng tôi.</p>
            
            <p>Trân trọng,<br><strong>Quang Huong Computer</strong></p>
        </div>
        <div class=""footer"">
            <p>Email này được gửi tự động, vui lòng không trả lời.</p>
            <p>© 2026 Quang Huong Computer. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";

        await SendEmailAsync(new EmailMessage
        {
            ToEmail = toEmail,
            Subject = subject,
            Body = body,
            IsHtml = true
        });
    }

    public async Task SendPaymentSuccessAsync(string toEmail, string customerName, string orderNumber, string invoiceNumber)
    {
        var subject = $"Thanh toán thành công #{orderNumber} - Quang Huong Computer";
        var body = $@"
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .success-box {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }}
        .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
        .button {{ display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>✅ Thanh toán thành công!</h1>
        </div>
        <div class=""content"">
            <p>Xin chào <strong>{customerName}</strong>,</p>
            <p>Thanh toán của bạn đã được xử lý thành công!</p>
            
            <div class=""success-box"">
                <h3>Chi tiết thanh toán</h3>
                <p><strong>Mã đơn hàng:</strong> {orderNumber}</p>
                <p><strong>Số hóa đơn:</strong> {invoiceNumber}</p>
                <p><strong>Trạng thái:</strong> Đã thanh toán</p>
            </div>

            <p>Hóa đơn điện tử đã được tạo và bạn có thể xem chi tiết trong tài khoản của mình.</p>
            <p>Sản phẩm của bạn đã được tự động đăng ký bảo hành.</p>

            <center>
                <a href=""{_frontendUrl}/account/orders"" class=""button"">Xem hóa đơn</a>
            </center>

            <p>Cảm ơn bạn đã tin tưởng và mua sắm tại Quang Huong Computer!</p>
            
            <p>Trân trọng,<br><strong>Quang Huong Computer</strong></p>
        </div>
        <div class=""footer"">
            <p>Email này được gửi tự động, vui lòng không trả lời.</p>
            <p>© 2026 Quang Huong Computer. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";

        await SendEmailAsync(new EmailMessage
        {
            ToEmail = toEmail,
            Subject = subject,
            Body = body,
            IsHtml = true
        });
    }

    public async Task SendWarrantyRegistrationAsync(string toEmail, string customerName, string productName, string serialNumber, DateTime expirationDate)
    {
        var subject = $"Đăng ký bảo hành thành công - {productName}";
        var body = $@"
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .warranty-box {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }}
        .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
        .highlight {{ background: #fef3c7; padding: 10px; border-radius: 5px; margin: 10px 0; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>🛡️ Bảo hành đã được kích hoạt!</h1>
        </div>
        <div class=""content"">
            <p>Xin chào <strong>{customerName}</strong>,</p>
            <p>Sản phẩm của bạn đã được đăng ký bảo hành tự động!</p>
            
            <div class=""warranty-box"">
                <h3>Thông tin bảo hành</h3>
                <p><strong>Sản phẩm:</strong> {productName}</p>
                <p><strong>Số Serial:</strong> <code>{serialNumber}</code></p>
                <p><strong>Hết hạn:</strong> {expirationDate:dd/MM/yyyy}</p>
            </div>

            <div class=""highlight"">
                <p><strong>⚠️ Lưu ý quan trọng:</strong></p>
                <p>Vui lòng lưu giữ số Serial để tra cứu bảo hành. Bạn có thể kiểm tra thông tin bảo hành bất kỳ lúc nào trong tài khoản của mình.</p>
            </div>

            <p><strong>Điều kiện bảo hành:</strong></p>
            <ul>
                <li>Sản phẩm còn trong thời hạn bảo hành</li>
                <li>Không có dấu hiệu tác động vật lý</li>
                <li>Tem bảo hành còn nguyên vẹn</li>
                <li>Có hóa đơn mua hàng</li>
            </ul>

            <p>Nếu cần hỗ trợ bảo hành, vui lòng liên hệ với chúng tôi.</p>
            
            <p>Trân trọng,<br><strong>Quang Huong Computer</strong></p>
        </div>
        <div class=""footer"">
            <p>Email này được gửi tự động, vui lòng không trả lời.</p>
            <p>© 2026 Quang Huong Computer. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";

        await SendEmailAsync(new EmailMessage
        {
            ToEmail = toEmail,
            Subject = subject,
            Body = body,
            IsHtml = true
        });
    }
}

public class EmailMessage
{
    public string ToEmail { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool IsHtml { get; set; } = true;
}

public class EmailConfig
{
    public string SmtpHost { get; set; } = string.Empty;
    public int SmtpPort { get; set; }
    public string SmtpUsername { get; set; } = string.Empty;
    public string SmtpPassword { get; set; } = string.Empty;
    public string FromEmail { get; set; } = string.Empty;
    public string FromName { get; set; } = string.Empty;
}
