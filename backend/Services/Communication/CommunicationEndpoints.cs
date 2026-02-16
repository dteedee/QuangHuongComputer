using BuildingBlocks.Email;
using BuildingBlocks.Security;
using Communication.Repositories;
using Communication.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Communication;

public static class CommunicationEndpoints
{
    public static void MapCommunicationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/communication");

        // ========================================
        // NOTIFICATION ENDPOINTS
        // ========================================
        app.MapNotificationEndpoints();

        // Newsletter Subscription endpoints
        group.MapPost("/newsletter/subscribe", async ([FromBody] NewsletterSubscribeDto dto, Communication.Infrastructure.CommunicationDbContext db, HttpContext context) =>
        {
            try
            {
                // Check if email already exists
                var existing = await db.NewsletterSubscriptions
                    .FirstOrDefaultAsync(n => n.Email == dto.Email);

                if (existing != null)
                {
                    if (existing.IsActive)
                    {
                        return Results.Ok(new { message = "Email đã được đăng ký trước đó", alreadySubscribed = true });
                    }
                    else
                    {
                        // Reactivate subscription
                        existing.IsActive = true;
                        existing.SubscribedAt = DateTime.UtcNow;
                        existing.UnsubscribedAt = null;
                        existing.UnsubscribeReason = null;
                        await db.SaveChangesAsync();
                        return Results.Ok(new { message = "Đăng ký thành công! Cảm ơn bạn đã quay lại.", success = true });
                    }
                }

                // Create new subscription
                var subscription = new Communication.Domain.NewsletterSubscription
                {
                    Id = Guid.NewGuid(),
                    Email = dto.Email,
                    Name = dto.Name,
                    SubscriptionSource = "Website",
                    IpAddress = context.Connection.RemoteIpAddress?.ToString(),
                    UserAgent = context.Request.Headers.UserAgent.ToString(),
                    IsActive = true,
                    SubscribedAt = DateTime.UtcNow
                };

                db.NewsletterSubscriptions.Add(subscription);
                await db.SaveChangesAsync();

                return Results.Ok(new { message = "Đăng ký nhận tin thành công!", success = true, id = subscription.Id });
            }
            catch (Exception ex)
            {
                return Results.Problem($"Có lỗi xảy ra: {ex.Message}");
            }
        });

        group.MapPost("/newsletter/unsubscribe", async ([FromBody] NewsletterUnsubscribeDto dto, Communication.Infrastructure.CommunicationDbContext db) =>
        {
            var subscription = await db.NewsletterSubscriptions
                .FirstOrDefaultAsync(n => n.Email == dto.Email && n.IsActive);

            if (subscription == null)
            {
                return Results.NotFound(new { message = "Không tìm thấy email đã đăng ký" });
            }

            subscription.IsActive = false;
            subscription.UnsubscribedAt = DateTime.UtcNow;
            subscription.UnsubscribeReason = dto.Reason;
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Đã hủy đăng ký thành công" });
        });

        // Admin endpoints
        var newsletterAdmin = app.MapGroup("/api/communication/newsletter/admin")
            .RequireAuthorization(policy => policy.RequireRole(Roles.Admin));

        newsletterAdmin.MapGet("/", async (Communication.Infrastructure.CommunicationDbContext db, bool? isActive) =>
        {
            var query = db.NewsletterSubscriptions.AsQueryable();

            if (isActive.HasValue)
            {
                query = query.Where(n => n.IsActive == isActive.Value);
            }

            var subscriptions = await query
                .OrderByDescending(n => n.SubscribedAt)
                .ToListAsync();

            return Results.Ok(subscriptions);
        });

        newsletterAdmin.MapGet("/stats", async (Communication.Infrastructure.CommunicationDbContext db) =>
        {
            var total = await db.NewsletterSubscriptions.CountAsync();
            var active = await db.NewsletterSubscriptions.CountAsync(n => n.IsActive);
            var thisMonth = await db.NewsletterSubscriptions.CountAsync(n =>
                n.SubscribedAt >= DateTime.UtcNow.AddMonths(-1) && n.IsActive);

            return Results.Ok(new
            {
                total,
                active,
                inactive = total - active,
                newThisMonth = thisMonth
            });
        });

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
public record NewsletterSubscribeDto(string Email, string? Name);
public record NewsletterUnsubscribeDto(string Email, string? Reason);

public static class NotificationEndpointsExtensions
{
    public static void MapNotificationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/notifications").RequireAuthorization();

        // GET /api/notifications - Get notifications for current user
        group.MapGet("/", async (
            HttpContext context,
            INotificationService notificationService,
            int page = 1,
            int pageSize = 50) =>
        {
            var userId = GetUserId(context);
            var notifications = await notificationService.GetUserNotificationsAsync(userId, page, pageSize);
            return Results.Ok(notifications);
        });

        // GET /api/notifications/unread-count - Get unread count
        group.MapGet("/unread-count", async (
            HttpContext context,
            INotificationService notificationService) =>
        {
            var userId = GetUserId(context);
            var count = await notificationService.GetUnreadCountAsync(userId);
            return Results.Ok(new { count });
        });

        // POST /api/notifications/{id}/read - Mark notification as read
        group.MapPost("/{id}/read", async (
            Guid id,
            HttpContext context,
            INotificationService notificationService) =>
        {
            var userId = GetUserId(context);
            var result = await notificationService.MarkAsReadAsync(id, userId);

            if (!result)
            {
                return Results.NotFound(new { message = "Notification not found" });
            }

            return Results.Ok(new { message = "Notification marked as read" });
        });

        // POST /api/notifications/read-all - Mark all as read
        group.MapPost("/read-all", async (
            HttpContext context,
            INotificationService notificationService) =>
        {
            var userId = GetUserId(context);
            await notificationService.MarkAllAsReadAsync(userId);
            return Results.Ok(new { message = "All notifications marked as read" });
        });
    }

    private static string GetUserId(HttpContext context)
    {
        return context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? context.User.FindFirst("sub")?.Value
            ?? "";
    }
}
