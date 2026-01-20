using BuildingBlocks.Email;
using BuildingBlocks.Security;
using Communication.Repositories;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using System.Security.Claims;

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

        // Chat conversation endpoints
        var chatGroup = app.MapGroup("/api/chat").RequireAuthorization();

        chatGroup.MapGet("/conversations", async (HttpContext context, IConversationRepository repo) =>
        {
            var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? context.User.FindFirst("sub")?.Value
                ?? "";
            var userRoles = context.User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToArray();

            var conversations = await repo.GetConversationsForUserAsync(userId, userRoles);

            return Results.Ok(conversations.Select(c => new
            {
                c.Id,
                c.CustomerId,
                c.CustomerName,
                c.AssignedToUserId,
                c.AssignedToUserName,
                Status = c.Status.ToString(),
                c.LastMessageAt,
                c.CreatedAt,
                LastMessage = c.Messages.OrderByDescending(m => m.CreatedAt).FirstOrDefault()
            }));
        });

        chatGroup.MapGet("/conversations/{id}", async (Guid id, HttpContext context, IConversationRepository repo) =>
        {
            var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? context.User.FindFirst("sub")?.Value
                ?? "";
            var userRoles = context.User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToArray();

            var conversation = await repo.GetByIdAsync(id);
            if (conversation == null)
            {
                return Results.NotFound();
            }

            if (!conversation.CanBeAccessedBy(userId, userRoles))
            {
                return Results.Forbid();
            }

            return Results.Ok(new
            {
                conversation.Id,
                conversation.CustomerId,
                conversation.CustomerName,
                conversation.AssignedToUserId,
                conversation.AssignedToUserName,
                Status = conversation.Status.ToString(),
                conversation.LastMessageAt,
                conversation.CreatedAt,
                Messages = conversation.Messages.OrderBy(m => m.CreatedAt).Select(m => new
                {
                    m.Id,
                    m.SenderId,
                    m.SenderName,
                    SenderType = m.SenderType.ToString(),
                    m.Text,
                    m.IsRead,
                    m.CreatedAt
                })
            });
        });

        chatGroup.MapGet("/conversations/unassigned", async (IConversationRepository repo) =>
        {
            var conversations = await repo.GetUnassignedConversationsAsync();
            return Results.Ok(conversations.Select(c => new
            {
                c.Id,
                c.CustomerName,
                c.LastMessageAt,
                c.CreatedAt,
                MessageCount = c.Messages.Count
            }));
        }).RequireAuthorization(policy => policy.RequireRole(Roles.Admin, Roles.Sale));

        // AI chatbot integration
        chatGroup.MapPost("/ai/ask", async (
            [FromBody] AiAskRequest request,
            Communication.Application.IAiChatService aiChatService,
            CancellationToken ct) =>
        {
            try
            {
                var response = await aiChatService.GetAiResponseAsync(request.ConversationId, request.Question, ct);
                return Results.Ok(new { response });
            }
            catch (Exception ex)
            {
                return Results.Problem($"AI service error: {ex.Message}");
            }
        });
    }
}

public record SendEmailDto(string To, string Subject, string Body);
public record AiAskRequest(Guid ConversationId, string Question);
