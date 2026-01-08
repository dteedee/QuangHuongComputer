using BuildingBlocks.Email;
using BuildingBlocks.Messaging.IntegrationEvents;
using MassTransit;
using Microsoft.Extensions.Logging;
using Warranty.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Warranty.Application.Consumers;

public class WarrantyRegistrationEmailConsumer : IConsumer<OrderFulfilledEvent>
{
    private readonly IEmailService _emailService;
    private readonly WarrantyDbContext _context;
    private readonly ILogger<WarrantyRegistrationEmailConsumer> _logger;

    public WarrantyRegistrationEmailConsumer(
        IEmailService emailService,
        WarrantyDbContext context,
        ILogger<WarrantyRegistrationEmailConsumer> logger)
    {
        _emailService = emailService;
        _context = context;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<OrderFulfilledEvent> context)
    {
        try
        {
            // Fetch all warranties registered for this order
            var warranties = await _context.ProductWarranties
                .Where(w => w.CustomerId == context.Message.CustomerId)
                .OrderByDescending(w => w.CreatedAt)
                .Take(context.Message.Items.Count)
                .ToListAsync();

            if (!warranties.Any())
            {
                _logger.LogWarning("No warranties found for customer {CustomerId}", context.Message.CustomerId);
                return;
            }

            // In a real scenario, fetch customer email from Identity service
            var customerEmail = $"customer-{context.Message.CustomerId}@example.com";
            var customerName = "Valued Customer";

            // Send email for each warranty
            foreach (var warranty in warranties)
            {
                var productName = $"Product {warranty.ProductId.ToString().Substring(0, 8)}";
                
                await _emailService.SendWarrantyRegistrationAsync(
                    customerEmail,
                    customerName,
                    productName,
                    warranty.SerialNumber,
                    warranty.ExpirationDate
                );

                _logger.LogInformation("Warranty registration email sent for serial {SerialNumber}", warranty.SerialNumber);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send warranty registration emails for order {OrderId}", context.Message.OrderId);
            // Don't throw - email failure shouldn't break the warranty registration flow
        }
    }
}
