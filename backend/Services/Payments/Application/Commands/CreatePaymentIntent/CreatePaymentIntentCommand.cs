using BuildingBlocks.SharedKernel;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Payments.Domain;
using Payments.Infrastructure;

namespace Payments.Application.Commands.CreatePaymentIntent;

public record CreatePaymentIntentCommand(
    Guid OrderId,
    decimal Amount,
    string Currency,
    PaymentProvider Provider,
    string IdempotencyKey) : IRequest<Result<Guid>>;

public class CreatePaymentIntentCommandHandler : IRequestHandler<CreatePaymentIntentCommand, Result<Guid>>
{
    private readonly PaymentsDbContext _context;

    public CreatePaymentIntentCommandHandler(PaymentsDbContext context)
    {
        _context = context;
    }

    public async Task<Result<Guid>> Handle(CreatePaymentIntentCommand request, CancellationToken cancellationToken)
    {
        // Idempotency check
        var existingParams = await _context.PaymentIntents
            .FirstOrDefaultAsync(p => p.IdempotencyKey == request.IdempotencyKey, cancellationToken);
            
        if (existingParams != null)
        {
            return Result.Success(existingParams.Id);
        }

        var intent = PaymentIntent.Create(
            request.OrderId,
            request.Amount,
            request.Currency,
            request.Provider,
            request.IdempotencyKey);

        // Here we would typically call external gateway (Stripe/VnPay) to get ClientSecret/ExternalId
        // For simulation, we generate a fake one
        intent.SetExternalId($"ext_{Guid.NewGuid()}", $"secret_{Guid.NewGuid()}");

        _context.PaymentIntents.Add(intent);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success(intent.Id);
    }
}
