
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using MimeKit;

namespace Communication;

public interface IEmailService
{
    Task SendEmailAsync(string to, string subject, string htmlBody);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;

    public EmailService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task SendEmailAsync(string to, string subject, string htmlBody)
    {
        var host = _configuration["EmailSettings:SmtpHost"];
        var port = int.Parse(_configuration["EmailSettings:SmtpPort"] ?? "587");
        var user = _configuration["EmailSettings:SmtpUser"];
        var pass = _configuration["EmailSettings:SmtpPass"];
        var senderName = _configuration["EmailSettings:SenderName"] ?? "Quang Huong Computer";

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(senderName, user));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = subject;

        var builder = new BodyBuilder();
        builder.HtmlBody = htmlBody;
        message.Body = builder.ToMessageBody();

        using var client = new SmtpClient();
        try 
        {
            await client.ConnectAsync(host, port, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(user, pass);
            await client.SendAsync(message);
        }
        finally
        {
            await client.DisconnectAsync(true);
        }
    }
}
