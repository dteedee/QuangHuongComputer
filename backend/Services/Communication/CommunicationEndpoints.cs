
using BuildingBlocks.Email;
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
                await emailService.SendEmailAsync(new EmailMessage 
                { 
                    ToEmail = model.To, 
                    Subject = model.Subject, 
                    Body = model.Body,
                    IsHtml = true
                });
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
