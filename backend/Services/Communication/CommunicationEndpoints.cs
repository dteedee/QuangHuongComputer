
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;

namespace Communication;

public static class CommunicationEndpoints
{
    public static void MapCommunicationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/communication");

        group.MapPost("/send-email", async ([FromBody] SendEmailDto model, IEmailService emailService) =>
        {
            try
            {
                await emailService.SendEmailAsync(model.To, model.Subject, model.Body);
                return Results.Ok(new { Message = "Email sent successfully" });
            }
            catch (Exception ex)
            {
                return Results.Problem($"Failed to send email: {ex.Message}");
            }
        }); // In production, add .RequireAuthorization("Admin") or similar
    }
}

public record SendEmailDto(string To, string Subject, string Body);
