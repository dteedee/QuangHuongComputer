using Microsoft.Extensions.Configuration;

namespace BuildingBlocks.Email;

/// <summary>
/// Public surface unchanged (CommunicationEndpoints.cs, EmailCampaignService.cs and four
/// Consumers construct against this interface and are outside this track's ownership) - only the
/// implementation moved onto the shared IEmailSender/EmailTemplateRenderer pipeline.
/// </summary>
public interface IEmailService
{
    Task SendEmailAsync(EmailMessage message);
    Task SendOrderConfirmationAsync(string toEmail, string customerName, string orderNumber, decimal totalAmount);
    Task SendPaymentSuccessAsync(string toEmail, string customerName, string orderNumber, string invoiceNumber);
    Task SendWarrantyRegistrationAsync(string toEmail, string customerName, string productName, string serialNumber, DateTime expirationDate);
}

/// <summary>
/// Template-aware facade: builds the HTML from Email/Templates/*.scriban, then hands the result to
/// IEmailSender (queued, retried, logged - never opens an SMTP connection itself).
/// </summary>
public class EmailService : IEmailService
{
    private readonly IEmailSender _sender;
    private readonly string _frontendUrl;

    public EmailService(IEmailSender sender, IConfiguration configuration)
    {
        _sender = sender;
        _frontendUrl = configuration["Frontend:Url"]
            ?? configuration["Cors:AllowedOrigins:0"]
            ?? "http://localhost:3000";
    }

    public Task SendEmailAsync(EmailMessage message) => _sender.QueueAsync(message).AsTask();

    public Task SendOrderConfirmationAsync(string toEmail, string customerName, string orderNumber, decimal totalAmount)
    {
        var body = EmailTemplateRenderer.Render("order-confirmed", new
        {
            customer_name = customerName,
            order_number = orderNumber,
            total_amount = totalAmount.ToString("N0"),
            orders_url = $"{_frontendUrl}/account/orders"
        });

        return SendEmailAsync(new EmailMessage
        {
            ToEmail = toEmail,
            Subject = $"Xác nhận đơn hàng #{orderNumber} - Quang Huong Computer",
            Body = body,
            IsHtml = true
        });
    }

    public Task SendPaymentSuccessAsync(string toEmail, string customerName, string orderNumber, string invoiceNumber)
    {
        var body = EmailTemplateRenderer.Render("payment-success", new
        {
            customer_name = customerName,
            order_number = orderNumber,
            invoice_number = invoiceNumber,
            orders_url = $"{_frontendUrl}/account/orders"
        });

        return SendEmailAsync(new EmailMessage
        {
            ToEmail = toEmail,
            Subject = $"Thanh toán thành công #{orderNumber} - Quang Huong Computer",
            Body = body,
            IsHtml = true
        });
    }

    public Task SendWarrantyRegistrationAsync(string toEmail, string customerName, string productName, string serialNumber, DateTime expirationDate)
    {
        var body = EmailTemplateRenderer.Render("warranty-registered", new
        {
            customer_name = customerName,
            product_name = productName,
            serial_number = serialNumber,
            expiration_date = expirationDate.ToString("dd/MM/yyyy")
        });

        return SendEmailAsync(new EmailMessage
        {
            ToEmail = toEmail,
            Subject = $"Đăng ký bảo hành thành công - {productName}",
            Body = body,
            IsHtml = true
        });
    }
}
