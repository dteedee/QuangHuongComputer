using Microsoft.EntityFrameworkCore.Migrations;

namespace Communication.Infrastructure.Migrations;

/// <summary>
/// Migration to add performance indexes for Communication service
/// </summary>
public partial class AddCommunicationPerformanceIndexes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Conversation Indexes
        migrationBuilder.CreateIndex(
            name: "IX_Conversations_ParticipantIds",
            table: "Conversations",
            column: "ParticipantIds");

        migrationBuilder.CreateIndex(
            name: "IX_Conversations_CreatedAt",
            table: "Conversations",
            column: "CreatedAt");

        migrationBuilder.CreateIndex(
            name: "IX_Conversations_LastMessageAt",
            table: "Conversations",
            column: "LastMessageAt");

        // Message Indexes
        migrationBuilder.CreateIndex(
            name: "IX_Messages_ConversationId",
            table: "Messages",
            column: "ConversationId");

        migrationBuilder.CreateIndex(
            name: "IX_Messages_SenderId",
            table: "Messages",
            column: "SenderId");

        migrationBuilder.CreateIndex(
            name: "IX_Messages_CreatedAt",
            table: "Messages",
            column: "CreatedAt");

        migrationBuilder.CreateIndex(
            name: "IX_Messages_ConversationId_CreatedAt",
            table: "Messages",
            columns: new[] { "ConversationId", "CreatedAt" });

        migrationBuilder.CreateIndex(
            name: "IX_Messages_IsRead",
            table: "Messages",
            column: "IsRead");

        // Notification Indexes
        migrationBuilder.CreateIndex(
            name: "IX_Notifications_UserId",
            table: "Notifications",
            column: "UserId");

        migrationBuilder.CreateIndex(
            name: "IX_Notifications_CreatedAt",
            table: "Notifications",
            column: "CreatedAt");

        migrationBuilder.CreateIndex(
            name: "IX_Notifications_IsRead",
            table: "Notifications",
            column: "IsRead");

        migrationBuilder.CreateIndex(
            name: "IX_Notifications_UserId_IsRead",
            table: "Notifications",
            columns: new[] { "UserId", "IsRead" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "IX_Conversations_ParticipantIds", table: "Conversations");
        migrationBuilder.DropIndex(name: "IX_Conversations_CreatedAt", table: "Conversations");
        migrationBuilder.DropIndex(name: "IX_Conversations_LastMessageAt", table: "Conversations");
        migrationBuilder.DropIndex(name: "IX_Messages_ConversationId", table: "Messages");
        migrationBuilder.DropIndex(name: "IX_Messages_SenderId", table: "Messages");
        migrationBuilder.DropIndex(name: "IX_Messages_CreatedAt", table: "Messages");
        migrationBuilder.DropIndex(name: "IX_Messages_ConversationId_CreatedAt", table: "Messages");
        migrationBuilder.DropIndex(name: "IX_Messages_IsRead", table: "Messages");
        migrationBuilder.DropIndex(name: "IX_Notifications_UserId", table: "Notifications");
        migrationBuilder.DropIndex(name: "IX_Notifications_CreatedAt", table: "Notifications");
        migrationBuilder.DropIndex(name: "IX_Notifications_IsRead", table: "Notifications");
        migrationBuilder.DropIndex(name: "IX_Notifications_UserId_IsRead", table: "Notifications");
    }
}
