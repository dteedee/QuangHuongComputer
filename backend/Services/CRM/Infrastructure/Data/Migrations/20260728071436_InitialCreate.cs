using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRM.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "crm");

            migrationBuilder.CreateTable(
                name: "AutomationRules",
                schema: "crm",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Trigger = table.Column<int>(type: "integer", nullable: false),
                    TriggerDelayMinutes = table.Column<int>(type: "integer", nullable: false),
                    Action = table.Column<int>(type: "integer", nullable: false),
                    ActionTemplateId = table.Column<string>(type: "text", nullable: true),
                    ParameterJson = table.Column<string>(type: "jsonb", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    LastRunAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AutomationRules", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CustomerAnalytics",
                schema: "crm",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RecencyScore = table.Column<int>(type: "integer", nullable: false),
                    FrequencyScore = table.Column<int>(type: "integer", nullable: false),
                    MonetaryScore = table.Column<int>(type: "integer", nullable: false),
                    TotalOrderCount = table.Column<int>(type: "integer", nullable: false),
                    TotalSpent = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    AverageOrderValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    FirstPurchaseDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    LastPurchaseDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    LifecycleStage = table.Column<int>(type: "integer", nullable: false),
                    LifecycleStageChangedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    EmailOpenCount = table.Column<int>(type: "integer", nullable: false),
                    EmailClickCount = table.Column<int>(type: "integer", nullable: false),
                    LastEmailOpenedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    LastInteractionAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    InternalNotes = table.Column<string>(type: "text", nullable: true),
                    LastRfmCalculatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomerAnalytics", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CustomerSegments",
                schema: "crm",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "text", maxLength: 500, nullable: true),
                    Color = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    RuleDefinition = table.Column<string>(type: "jsonb", nullable: true),
                    IsAutoAssign = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CustomerCount = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomerSegments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LeadPipelineStages",
                schema: "crm",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "text", maxLength: 500, nullable: true),
                    Color = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    WinProbability = table.Column<int>(type: "integer", nullable: false),
                    IsFinalStage = table.Column<bool>(type: "boolean", nullable: false),
                    IsWonStage = table.Column<bool>(type: "boolean", nullable: false),
                    LeadCount = table.Column<int>(type: "integer", nullable: false),
                    TotalEstimatedValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeadPipelineStages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CustomerSegmentAssignments",
                schema: "crm",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerAnalyticsId = table.Column<Guid>(type: "uuid", nullable: false),
                    SegmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsAutoAssigned = table.Column<bool>(type: "boolean", nullable: false),
                    AssignedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    AssignedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomerSegmentAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "fk_segment_assignments_customer",
                        column: x => x.CustomerAnalyticsId,
                        principalSchema: "crm",
                        principalTable: "CustomerAnalytics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_segment_assignments_segment",
                        column: x => x.SegmentId,
                        principalSchema: "crm",
                        principalTable: "CustomerSegments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EmailCampaigns",
                schema: "crm",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Subject = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    PreviewText = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    HtmlContent = table.Column<string>(type: "text", nullable: false),
                    PlainTextContent = table.Column<string>(type: "text", nullable: true),
                    TargetSegmentId = table.Column<Guid>(type: "uuid", nullable: true),
                    TargetLifecycleStages = table.Column<string>(type: "jsonb", nullable: true),
                    MinRfmScore = table.Column<int>(type: "integer", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ScheduledAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    SentAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    TotalRecipients = table.Column<int>(type: "integer", nullable: false),
                    SentCount = table.Column<int>(type: "integer", nullable: false),
                    DeliveredCount = table.Column<int>(type: "integer", nullable: false),
                    OpenedCount = table.Column<int>(type: "integer", nullable: false),
                    ClickedCount = table.Column<int>(type: "integer", nullable: false),
                    BouncedCount = table.Column<int>(type: "integer", nullable: false),
                    UnsubscribedCount = table.Column<int>(type: "integer", nullable: false),
                    FromEmail = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    FromName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ReplyToEmail = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmailCampaigns", x => x.Id);
                    table.ForeignKey(
                        name: "fk_campaigns_target_segment",
                        column: x => x.TargetSegmentId,
                        principalSchema: "crm",
                        principalTable: "CustomerSegments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Leads",
                schema: "crm",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FullName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Company = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    JobTitle = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Source = table.Column<int>(type: "integer", nullable: false),
                    SourceDetail = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    PipelineStageId = table.Column<Guid>(type: "uuid", nullable: true),
                    AssignedToUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    AssignedToUserName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    EstimatedValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    NextFollowUpAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    NextFollowUpNote = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsConverted = table.Column<bool>(type: "boolean", nullable: false),
                    ConvertedCustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    ConvertedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    LossReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    Address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    City = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    District = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    InterestedProducts = table.Column<string>(type: "jsonb", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Leads", x => x.Id);
                    table.ForeignKey(
                        name: "fk_leads_pipeline_stage",
                        column: x => x.PipelineStageId,
                        principalSchema: "crm",
                        principalTable: "LeadPipelineStages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "EmailCampaignRecipients",
                schema: "crm",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CampaignId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerAnalyticsId = table.Column<Guid>(type: "uuid", nullable: true),
                    Email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    FullName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    SentAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    DeliveredAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    OpenedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ClickedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    BouncedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    UnsubscribedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    OpenCount = table.Column<int>(type: "integer", nullable: false),
                    ClickCount = table.Column<int>(type: "integer", nullable: false),
                    ClickedLinks = table.Column<string>(type: "jsonb", nullable: true),
                    BounceReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    TrackingId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmailCampaignRecipients", x => x.Id);
                    table.ForeignKey(
                        name: "fk_recipients_campaign",
                        column: x => x.CampaignId,
                        principalSchema: "crm",
                        principalTable: "EmailCampaigns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_recipients_customer",
                        column: x => x.CustomerAnalyticsId,
                        principalSchema: "crm",
                        principalTable: "CustomerAnalytics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "CustomerInteractions",
                schema: "crm",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerAnalyticsId = table.Column<Guid>(type: "uuid", nullable: true),
                    LeadId = table.Column<Guid>(type: "uuid", nullable: true),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Subject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Content = table.Column<string>(type: "text", nullable: true),
                    PerformedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    PerformedByUserName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    PerformedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    DurationMinutes = table.Column<int>(type: "integer", nullable: true),
                    CallOutcome = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    MeetingLocation = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    FollowUpDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    FollowUpNote = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Sentiment = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Attachments = table.Column<string>(type: "jsonb", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomerInteractions", x => x.Id);
                    table.ForeignKey(
                        name: "fk_interactions_customer",
                        column: x => x.CustomerAnalyticsId,
                        principalSchema: "crm",
                        principalTable: "CustomerAnalytics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_interactions_lead",
                        column: x => x.LeadId,
                        principalSchema: "crm",
                        principalTable: "Leads",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CustomerTasks",
                schema: "crm",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerAnalyticsId = table.Column<Guid>(type: "uuid", nullable: true),
                    LeadId = table.Column<Guid>(type: "uuid", nullable: true),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    AssignedToUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    AssignedToUserName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    DueDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CompletedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReminderAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ReminderSent = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomerTasks", x => x.Id);
                    table.ForeignKey(
                        name: "fk_tasks_customer",
                        column: x => x.CustomerAnalyticsId,
                        principalSchema: "crm",
                        principalTable: "CustomerAnalytics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_tasks_lead",
                        column: x => x.LeadId,
                        principalSchema: "crm",
                        principalTable: "Leads",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_automation_rules_trigger_active",
                schema: "crm",
                table: "AutomationRules",
                columns: new[] { "Trigger", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "ix_customer_analytics_last_purchase",
                schema: "crm",
                table: "CustomerAnalytics",
                column: "LastPurchaseDate");

            migrationBuilder.CreateIndex(
                name: "ix_customer_analytics_lifecycle_stage",
                schema: "crm",
                table: "CustomerAnalytics",
                column: "LifecycleStage");

            migrationBuilder.CreateIndex(
                name: "ix_customer_analytics_rfm_scores",
                schema: "crm",
                table: "CustomerAnalytics",
                columns: new[] { "RecencyScore", "FrequencyScore", "MonetaryScore" });

            migrationBuilder.CreateIndex(
                name: "ix_customer_analytics_total_spent",
                schema: "crm",
                table: "CustomerAnalytics",
                column: "TotalSpent");

            migrationBuilder.CreateIndex(
                name: "uq_customer_analytics_user_id",
                schema: "crm",
                table: "CustomerAnalytics",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_interactions_customer",
                schema: "crm",
                table: "CustomerInteractions",
                column: "CustomerAnalyticsId");

            migrationBuilder.CreateIndex(
                name: "ix_interactions_follow_up",
                schema: "crm",
                table: "CustomerInteractions",
                column: "FollowUpDate");

            migrationBuilder.CreateIndex(
                name: "ix_interactions_lead",
                schema: "crm",
                table: "CustomerInteractions",
                column: "LeadId");

            migrationBuilder.CreateIndex(
                name: "ix_interactions_performed_at",
                schema: "crm",
                table: "CustomerInteractions",
                column: "PerformedAt");

            migrationBuilder.CreateIndex(
                name: "ix_interactions_type",
                schema: "crm",
                table: "CustomerInteractions",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerSegmentAssignments_SegmentId",
                schema: "crm",
                table: "CustomerSegmentAssignments",
                column: "SegmentId");

            migrationBuilder.CreateIndex(
                name: "uq_segment_assignments_customer_segment",
                schema: "crm",
                table: "CustomerSegmentAssignments",
                columns: new[] { "CustomerAnalyticsId", "SegmentId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_customer_segments_sort_order",
                schema: "crm",
                table: "CustomerSegments",
                column: "SortOrder");

            migrationBuilder.CreateIndex(
                name: "uq_customer_segments_code",
                schema: "crm",
                table: "CustomerSegments",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CustomerTasks_CustomerAnalyticsId",
                schema: "crm",
                table: "CustomerTasks",
                column: "CustomerAnalyticsId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerTasks_LeadId",
                schema: "crm",
                table: "CustomerTasks",
                column: "LeadId");

            migrationBuilder.CreateIndex(
                name: "ix_tasks_assigned_to",
                schema: "crm",
                table: "CustomerTasks",
                column: "AssignedToUserId");

            migrationBuilder.CreateIndex(
                name: "ix_tasks_due_date",
                schema: "crm",
                table: "CustomerTasks",
                column: "DueDate");

            migrationBuilder.CreateIndex(
                name: "ix_tasks_pending_reminders",
                schema: "crm",
                table: "CustomerTasks",
                column: "ReminderAt",
                filter: "\"ReminderSent\" = false");

            migrationBuilder.CreateIndex(
                name: "ix_tasks_status",
                schema: "crm",
                table: "CustomerTasks",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "ix_email_campaign_recipients_campaign_id_status",
                schema: "crm",
                table: "EmailCampaignRecipients",
                columns: new[] { "CampaignId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_EmailCampaignRecipients_CustomerAnalyticsId",
                schema: "crm",
                table: "EmailCampaignRecipients",
                column: "CustomerAnalyticsId");

            migrationBuilder.CreateIndex(
                name: "uq_recipients_campaign_email",
                schema: "crm",
                table: "EmailCampaignRecipients",
                columns: new[] { "CampaignId", "Email" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "uq_recipients_tracking_id",
                schema: "crm",
                table: "EmailCampaignRecipients",
                column: "TrackingId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_campaigns_scheduled_at",
                schema: "crm",
                table: "EmailCampaigns",
                column: "ScheduledAt");

            migrationBuilder.CreateIndex(
                name: "ix_campaigns_sent_at",
                schema: "crm",
                table: "EmailCampaigns",
                column: "SentAt");

            migrationBuilder.CreateIndex(
                name: "ix_campaigns_status",
                schema: "crm",
                table: "EmailCampaigns",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_EmailCampaigns_TargetSegmentId",
                schema: "crm",
                table: "EmailCampaigns",
                column: "TargetSegmentId");

            migrationBuilder.CreateIndex(
                name: "ix_pipeline_stages_sort_order",
                schema: "crm",
                table: "LeadPipelineStages",
                column: "SortOrder");

            migrationBuilder.CreateIndex(
                name: "ix_leads_assigned_to",
                schema: "crm",
                table: "Leads",
                column: "AssignedToUserId");

            migrationBuilder.CreateIndex(
                name: "ix_leads_created_at",
                schema: "crm",
                table: "Leads",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "ix_leads_email",
                schema: "crm",
                table: "Leads",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "ix_leads_next_follow_up",
                schema: "crm",
                table: "Leads",
                column: "NextFollowUpAt");

            migrationBuilder.CreateIndex(
                name: "IX_Leads_PipelineStageId",
                schema: "crm",
                table: "Leads",
                column: "PipelineStageId");

            migrationBuilder.CreateIndex(
                name: "ix_leads_source",
                schema: "crm",
                table: "Leads",
                column: "Source");

            migrationBuilder.CreateIndex(
                name: "ix_leads_status",
                schema: "crm",
                table: "Leads",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AutomationRules",
                schema: "crm");

            migrationBuilder.DropTable(
                name: "CustomerInteractions",
                schema: "crm");

            migrationBuilder.DropTable(
                name: "CustomerSegmentAssignments",
                schema: "crm");

            migrationBuilder.DropTable(
                name: "CustomerTasks",
                schema: "crm");

            migrationBuilder.DropTable(
                name: "EmailCampaignRecipients",
                schema: "crm");

            migrationBuilder.DropTable(
                name: "Leads",
                schema: "crm");

            migrationBuilder.DropTable(
                name: "EmailCampaigns",
                schema: "crm");

            migrationBuilder.DropTable(
                name: "CustomerAnalytics",
                schema: "crm");

            migrationBuilder.DropTable(
                name: "LeadPipelineStages",
                schema: "crm");

            migrationBuilder.DropTable(
                name: "CustomerSegments",
                schema: "crm");
        }
    }
}
