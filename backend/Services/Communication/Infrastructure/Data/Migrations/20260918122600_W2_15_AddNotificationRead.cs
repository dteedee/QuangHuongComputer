using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Communication.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class W2_15_AddNotificationRead : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NotificationReads",
                schema: "communication",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    NotificationLogId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReadAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationReads", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationRead_Notification_User_Unique",
                schema: "communication",
                table: "NotificationReads",
                columns: new[] { "NotificationLogId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NotificationRead_User_Notification",
                schema: "communication",
                table: "NotificationReads",
                columns: new[] { "UserId", "NotificationLogId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NotificationReads",
                schema: "communication");
        }
    }
}
