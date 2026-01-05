using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Payments.Domain;
using Payments.Infrastructure;
using System.Security.Claims;

namespace Payments;

public static class PaymentsEndpoints
{
    public static void MapPaymentsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/payments").RequireAuthorization();

        group.MapPost("/initiate", async (InitiatePaymentDto model, PaymentsDbContext db, ClaimsPrincipal user) =>
        {
            // Simple logic: create a payment intent
            // In a real app, this would call Stripe/VnPay API to get a client secret
            
            var payment = PaymentIntent.Create(
                model.OrderId,
                model.Amount,
                "USD", // Default
                model.Provider,
                Guid.NewGuid().ToString() // Idempotency Key
            );

            // Simulate external API call
            payment.SetExternalId($"EXT-{Guid.NewGuid()}", $"secret_{Guid.NewGuid()}");

            db.PaymentIntents.Add(payment);
            await db.SaveChangesAsync();

            return Results.Ok(new 
            { 
                PaymentId = payment.Id, 
                payment.ClientSecret,
                payment.Status 
            });
        });

        // Mock Webhook (Public)
        app.MapPost("/api/webhook/payments", async (WebhookDto model, PaymentsDbContext db) =>
        {
            // In reality, verify signature
            var payment = await db.PaymentIntents.FirstOrDefaultAsync(p => p.Id == model.PaymentId);
            if (payment == null) return Results.NotFound();

            if (model.Success)
            {
                payment.Succeed();
            }
            else
            {
                payment.Fail("Webhook reported failure");
            }

            await db.SaveChangesAsync();
            return Results.Ok();
        }).AllowAnonymous();
    }
}

public record InitiatePaymentDto(Guid OrderId, decimal Amount, PaymentProvider Provider);
public record WebhookDto(Guid PaymentId, bool Success);
