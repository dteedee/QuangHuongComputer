using Accounting.Domain;
using Accounting.Infrastructure;
using BuildingBlocks.Messaging.IntegrationEvents;
using MassTransit;
using Microsoft.Extensions.Logging;

namespace Accounting.Application.Consumers;

public class InvoiceRequestedConsumer : IConsumer<InvoiceRequestedEvent>
{
    private readonly AccountingDbContext _dbContext;
    private readonly ILogger<InvoiceRequestedConsumer> _logger;

    public InvoiceRequestedConsumer(AccountingDbContext dbContext, ILogger<InvoiceRequestedConsumer> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<InvoiceRequestedEvent> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Creating Invoice for Order {OrderId}", msg.OrderId);

        // Idempotency check (simple)
        // In real app, check if invoice for this order already exists.
        // Assuming Notes stores OrderId for now or we add OrderId to Invoice entity (better).
        // For now, check via Notes or just proceed (demo).
        
        var invoice = Invoice.CreateReceivable(
            msg.CustomerId, 
            null, 
            DateTime.UtcNow.AddDays(7), 
            10, // 10% VAT
            Currency.USD, 
            $"Order Ref: {msg.OrderId}"
        );

        foreach (var item in msg.Items)
        {
            invoice.AddLine(item.ProductName, item.Quantity, item.UnitPrice, 10);
        }

        invoice.Issue();
        
        // Auto-mark as paid since it came from Payment Succeeded
        // Or wait for another event?
        // Since the workflow is Order -> Pay -> Invoice, the invoice is effectively paid immediately usually for e-commerce.
        // But strictly, Payment -> Invoice means Invoice is already covered.
        
        invoice.RecordPayment(msg.TotalAmount, "Pre-paid Order", PaymentMethod.BankTransfer); // Using BankTransfer as placeholder

        _dbContext.Invoices.Add(invoice);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Invoice {InvoiceNumber} created and paid for Order {OrderId}", invoice.InvoiceNumber, msg.OrderId);
    }
}
