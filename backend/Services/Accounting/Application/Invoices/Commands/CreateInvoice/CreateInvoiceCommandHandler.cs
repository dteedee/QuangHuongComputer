using Accounting.Domain;
using Accounting.Infrastructure;
using BuildingBlocks.SharedKernel;
using MediatR;

namespace Accounting.Application.Invoices.Commands.CreateInvoice;

public class CreateInvoiceCommandHandler : IRequestHandler<CreateInvoiceCommand, Result<Guid>>
{
    private readonly AccountingDbContext _context;

    public CreateInvoiceCommandHandler(AccountingDbContext context)
    {
        _context = context;
    }

    public async Task<Result<Guid>> Handle(CreateInvoiceCommand request, CancellationToken cancellationToken)
    {
        Invoice invoice;

        if (request.Type == InvoiceType.Receivable)
        {
            if (request.OrganizationAccountId.HasValue)
            {
                var organization = await _context.Accounts.FindAsync(new object[] { request.OrganizationAccountId.Value }, cancellationToken);
                if (organization == null)
                    return Result.Failure<Guid>(Error.NotFound("OrganizationAccount", request.OrganizationAccountId.Value));
            }

            invoice = Invoice.CreateReceivable(
                request.CustomerId,
                request.OrganizationAccountId,
                request.DueDate,
                request.VatRate,
                request.Currency,
                request.Notes);
        }
        else // Payable
        {
            if (!request.SupplierId.HasValue)
                return Result.Failure<Guid>(Error.Validation("SupplierId is required for payable invoices"));

            invoice = Invoice.CreatePayable(
                request.SupplierId.Value,
                request.DueDate,
                request.VatRate,
                request.Currency,
                request.Notes);
        }

        foreach (var line in request.Lines)
        {
            invoice.AddLine(line.Description, line.Quantity, line.UnitPrice, line.VatRate);
        }

        invoice.Issue(); // Auto-issue for now, or could be separate command

        _context.Invoices.Add(invoice);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success(invoice.Id);
    }
}
