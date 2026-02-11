namespace Identity.Services;

public interface IEmailService
{
    Task SendPasswordResetEmailAsync(string toEmail, string resetCode);
    Task SendWelcomeEmailAsync(string toEmail, string fullName);
    Task SendEmailAsync(string toEmail, string subject, string htmlBody);
}
