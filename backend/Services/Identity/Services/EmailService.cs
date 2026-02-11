using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using BuildingBlocks.Localization;

namespace Identity.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;
    private readonly string _smtpHost;
    private readonly int _smtpPort;
    private readonly string _smtpUsername;
    private readonly string _smtpPassword;
    private readonly string _fromEmail;
    private readonly string _fromName;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;

        _smtpHost = _configuration["Email:Smtp:Host"] ?? "smtp.gmail.com";
        _smtpPort = int.Parse(_configuration["Email:Smtp:Port"] ?? "587");
        _smtpUsername = _configuration["Email:Smtp:Username"] ?? "";
        _smtpPassword = _configuration["Email:Smtp:Password"] ?? "";
        _fromEmail = _configuration["Email:Smtp:FromEmail"] ?? "noreply@quanghuongcomputer.com";
        _fromName = _configuration["Email:Smtp:FromName"] ?? "Quang Hưởng Computer";
    }

    public async Task SendPasswordResetEmailAsync(string toEmail, string resetCode)
    {
        var subject = "Mã xác nhận đặt lại mật khẩu - Quang Hưởng Computer";
        var resetLink = $"{_configuration["Frontend:Url"] ?? "http://localhost:5173"}/reset-password";
        
        var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <style>
        body {{ 
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
            line-height: 1.6; 
            color: #1a1a1a; 
            margin: 0; 
            padding: 0; 
            background-color: #f4f7f9; 
        }}
        .wrapper {{ 
            width: 100%; 
            table-layout: fixed; 
            background-color: #f4f7f9; 
            padding-bottom: 40px; 
            padding-top: 40px;
        }}
        .main {{ 
            background-color: #ffffff; 
            margin: 0 auto; 
            width: 100%; 
            max-width: 600px; 
            border-spacing: 0; 
            border-radius: 24px; 
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.05);
        }}
        .header {{ 
            background: linear-gradient(135deg, #D70018 0%, #000000 100%); 
            padding: 40px 30px; 
            text-align: center; 
        }}
        .header h1 {{ 
            color: #ffffff; 
            margin: 0; 
            font-size: 28px; 
            font-weight: 900; 
            text-transform: uppercase; 
            letter-spacing: 2px;
            font-style: italic;
        }}
        .content {{ 
            padding: 40px 40px; 
            background: #ffffff;
        }}
        .welcome-text {{
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 20px;
            color: #d70018;
        }}
        .code-container {{
            background: #f8fafc;
            border: 2px dashed #e2e8f0;
            border-radius: 16px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
        }}
        .otp-code {{
            font-size: 48px;
            font-weight: 900;
            letter-spacing: 12px;
            color: #000000;
            margin: 0;
            font-family: 'Courier New', Courier, monospace;
        }}
        .instruction {{
            font-size: 15px;
            color: #64748b;
            margin-bottom: 30px;
            text-align: center;
        }}
        .btn-container {{
            text-align: center;
        }}
        .button {{ 
            display: inline-block; 
            padding: 18px 36px; 
            background: #D70018; 
            color: #ffffff !important; 
            text-decoration: none; 
            border-radius: 14px; 
            font-weight: 900; 
            text-transform: uppercase;
            letter-spacing: 1px;
            font-size: 14px;
            transition: all 0.3s ease;
            box-shadow: 0 10px 20px rgba(215, 0, 24, 0.15);
        }}
        .warning {{
            margin-top: 40px;
            padding: 20px;
            background: #fff5f5;
            border-radius: 12px;
            font-size: 13px;
            color: #c53030;
            border-left: 4px solid #d70018;
        }}
        .footer {{ 
            text-align: center; 
            padding: 30px; 
            color: #94a3b8; 
            font-size: 12px; 
        }}
    </style>
</head>
<body>
    <div class='wrapper'>
        <table class='main'>
            <tr>
                <td class='header'>
                    <h1>Quang Hưởng Computer</h1>
                </td>
            </tr>
            <tr>
                <td class='content'>
                    <div class='welcome-text'>Xác minh yêu cầu đặt lại mật khẩu</div>
                    <p>Chào bạn, chúng tôi nhận được yêu cầu thay đổi mật khẩu cho tài khoản của bạn. Để đảm bảo an toàn, vui lòng sử dụng mã xác nhận bên dưới:</p>
                    
                    <div class='code-container'>
                        <div class='otp-code'>{resetCode}</div>
                    </div>
                    
                    <p class='instruction'>Mã này có hiệu lực trong <b>15 phút</b>. Không chia sẻ mã này với bất kỳ ai.</p>
                    
                    <div class='btn-container'>
                        <a href='{resetLink}' class='button'>Tiếp tục đặt lại mật khẩu</a>
                    </div>
                    
                    <div class='warning'>
                        <b>Lưu ý bảo mật:</b> Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này hoặc liên hệ hỗ trợ nếu bạn lo lắng về an toàn tài khoản.
                    </div>
                </td>
            </tr>
            <tr>
                <td class='footer'>
                    <p>&copy; 2026 Quang Hưởng Computer. All rights reserved.</p>
                    <p>Đây là email tự động từ hệ thống. Vui lòng không phản hồi.</p>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>";

        await SendEmailAsync(toEmail, subject, htmlBody);
    }

    public async Task SendWelcomeEmailAsync(string toEmail, string fullName)
    {
        var subject = "Chào mừng đến với Quang Hưởng Computer!";
        var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #D70018; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Chào mừng bạn!</h1>
        </div>
        <div class='content'>
            <p>Xin chào <strong>{fullName}</strong>,</p>
            <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>Quang Hưởng Computer</strong>!</p>
            <p>Chúng tôi rất vui mừng được đồng hành cùng bạn trong việc tìm kiếm các sản phẩm công nghệ chất lượng cao.</p>
            <p>Với tài khoản của mình, bạn có thể:</p>
            <ul>
                <li>Mua sắm trực tuyến dễ dàng</li>
                <li>Theo dõi đơn hàng</li>
                <li>Quản lý bảo hành</li>
                <li>Nhận thông báo về khuyến mãi đặc biệt</li>
            </ul>
            <p>Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với chúng tôi.</p>
            <p>Email này được gửi lúc: {VietnameseFormatter.FormatDateTime(DateTime.Now)}</p>
        </div>
        <div class='footer'>
            <p>&copy; 2026 Quang Hưởng Computer. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";

        await SendEmailAsync(toEmail, subject, htmlBody);
    }

    public async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
    {
        try
        {
            if (string.IsNullOrEmpty(_smtpUsername) || string.IsNullOrEmpty(_smtpPassword))
            {
                _logger.LogWarning("Chưa cấu hình xác thực SMTP. Email không gửi đến {Email}", toEmail);
                return;
            }

            using var smtpClient = new SmtpClient(_smtpHost, _smtpPort)
            {
                EnableSsl = true,
                Credentials = new NetworkCredential(_smtpUsername, _smtpPassword)
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress(_fromEmail, _fromName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true
            };

            mailMessage.To.Add(toEmail);

            await smtpClient.SendMailAsync(mailMessage);
            _logger.LogInformation("Gửi email thành công đến {Email}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gửi email thất bại đến {Email}", toEmail);
            throw;
        }
    }
}
