using Accounting.Domain;
using BuildingBlocks.SharedKernel;
using MediatR;

namespace Accounting.Application.Invoices.Commands.CreateInvoice;

public record CreateInvoiceCommand(
    InvoiceType Type,
    Guid? CustomerId,
    Guid? OrganizationAccountId,
    Guid? SupplierId,
    DateTime DueDate,
    decimal VatRate,
    Currency Currency,
    List<InvoiceLineDto> Lines,
    string? Notes) : IRequest<Result<Guid>>;

public record InvoiceLineDto(
    string Description,
    decimal Quantity,
    decimal UnitPrice,
    decimal VatRate);
