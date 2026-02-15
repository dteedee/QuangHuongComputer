using Accounting.Domain;
using Accounting.Infrastructure;
using BuildingBlocks.Messaging.IntegrationEvents;
using MassTransit;
using Microsoft.Extensions.Logging;

namespace Accounting.Application.Consumers;

/// <summary>
/// Consumes POReceivedEvent from Inventory module to automatically create AP Invoice
/// when goods are received from a purchase order
/// </summary>
public class POReceivedConsumer : IConsumer<POReceivedEvent>
{
    private readonly AccountingDbContext _dbContext;
    private readonly ILogger<POReceivedConsumer> _logger;

    public POReceivedConsumer(AccountingDbContext dbContext, ILogger<POReceivedConsumer> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<POReceivedEvent> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Creating AP Invoice for PO {PONumber} from Supplier {SupplierId}",
            msg.PONumber, msg.SupplierId);

        // Create AP invoice linked to the purchase order
        var invoice = Invoice.CreatePayable(
            msg.SupplierId,
            DateTime.UtcNow.AddDays(30), // Default 30-day payment term
            10, // Default 10% VAT
            Currency.VND,
            $"PO: {msg.PONumber}",
            msg.POId,
            msg.GoodsReceiptId
        );

        foreach (var item in msg.Items)
        {
            invoice.AddLine(
                item.ProductName,
                item.Quantity,
                item.UnitPrice,
                item.VatRate
            );
        }

        invoice.Issue();

        _dbContext.Invoices.Add(invoice);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "AP Invoice {InvoiceNumber} created for PO {PONumber}, Total: {Total}",
            invoice.InvoiceNumber, msg.PONumber, invoice.TotalAmount);
    }
}
