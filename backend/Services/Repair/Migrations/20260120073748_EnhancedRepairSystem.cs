using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Repair.Migrations
{
    /// <inheritdoc />
    public partial class EnhancedRepairSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RepairRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    DeviceModel = table.Column<string>(type: "text", nullable: false),
                    SerialNumber = table.Column<string>(type: "text", nullable: false),
                    IssueDescription = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    EstimatedCost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    technicianNotes = table.Column<string>(type: "text", nullable: true),
                    RequestDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RepairRequests", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ServiceBookings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: true),
                    ServiceType = table.Column<int>(type: "integer", nullable: false),
                    DeviceModel = table.Column<string>(type: "text", nullable: false),
                    SerialNumber = table.Column<string>(type: "text", nullable: true),
                    IssueDescription = table.Column<string>(type: "text", nullable: false),
                    ImageUrls = table.Column<string>(type: "text", nullable: false),
                    VideoUrls = table.Column<string>(type: "text", nullable: false),
                    PreferredDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PreferredTimeSlot = table.Column<int>(type: "integer", nullable: false),
                    ServiceAddress = table.Column<string>(type: "text", nullable: true),
                    LocationType = table.Column<int>(type: "integer", nullable: true),
                    LocationNotes = table.Column<string>(type: "text", nullable: true),
                    EstimatedCost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    OnSiteFee = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    AcceptedTerms = table.Column<bool>(type: "boolean", nullable: false),
                    TermsAcceptedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    WorkOrderId = table.Column<Guid>(type: "uuid", nullable: true),
                    AllowPayLater = table.Column<bool>(type: "boolean", nullable: false),
                    CustomerName = table.Column<string>(type: "text", nullable: false),
                    CustomerPhone = table.Column<string>(type: "text", nullable: false),
                    CustomerEmail = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServiceBookings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Technicians",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Specialty = table.Column<string>(type: "text", nullable: false),
                    IsAvailable = table.Column<bool>(type: "boolean", nullable: false),
                    HourlyRate = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Technicians", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WorkOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TicketNumber = table.Column<string>(type: "text", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    DeviceModel = table.Column<string>(type: "text", nullable: false),
                    SerialNumber = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    TechnicianId = table.Column<Guid>(type: "uuid", nullable: true),
                    EstimatedCost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    ActualCost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    PartsCost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    LaborCost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TechnicalNotes = table.Column<string>(type: "text", nullable: true),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FinishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ServiceBookingId = table.Column<Guid>(type: "uuid", nullable: true),
                    CurrentQuoteId = table.Column<Guid>(type: "uuid", nullable: true),
                    AssignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DiagnosedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    QuotedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ServiceType = table.Column<int>(type: "integer", nullable: true),
                    ServiceAddress = table.Column<string>(type: "text", nullable: true),
                    ServiceFee = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkOrders", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RepairQuotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuoteNumber = table.Column<string>(type: "text", nullable: false),
                    PartsCost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    LaborCost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    ServiceFee = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    EstimatedHours = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    HourlyRate = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RejectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RejectionReason = table.Column<string>(type: "text", nullable: true),
                    ValidUntil = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RepairQuotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RepairQuotes_WorkOrders_WorkOrderId",
                        column: x => x.WorkOrderId,
                        principalTable: "WorkOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WorkOrderActivityLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    Activity = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    PreviousStatus = table.Column<int>(type: "integer", nullable: true),
                    NewStatus = table.Column<int>(type: "integer", nullable: true),
                    PerformedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    PerformedByName = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkOrderActivityLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkOrderActivityLogs_WorkOrders_WorkOrderId",
                        column: x => x.WorkOrderId,
                        principalTable: "WorkOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WorkOrderParts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    InventoryItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    PartName = table.Column<string>(type: "text", nullable: false),
                    PartNumber = table.Column<string>(type: "text", nullable: true),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkOrderParts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkOrderParts_WorkOrders_WorkOrderId",
                        column: x => x.WorkOrderId,
                        principalTable: "WorkOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RepairQuotes_QuoteNumber",
                table: "RepairQuotes",
                column: "QuoteNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RepairQuotes_Status",
                table: "RepairQuotes",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_RepairQuotes_WorkOrderId",
                table: "RepairQuotes",
                column: "WorkOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceBookings_CustomerId",
                table: "ServiceBookings",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceBookings_PreferredDate",
                table: "ServiceBookings",
                column: "PreferredDate");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceBookings_Status",
                table: "ServiceBookings",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrderActivityLogs_CreatedAt",
                table: "WorkOrderActivityLogs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrderActivityLogs_WorkOrderId",
                table: "WorkOrderActivityLogs",
                column: "WorkOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrderParts_InventoryItemId",
                table: "WorkOrderParts",
                column: "InventoryItemId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrderParts_WorkOrderId",
                table: "WorkOrderParts",
                column: "WorkOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrders_CustomerId",
                table: "WorkOrders",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrders_Status",
                table: "WorkOrders",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrders_TechnicianId",
                table: "WorkOrders",
                column: "TechnicianId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrders_TicketNumber",
                table: "WorkOrders",
                column: "TicketNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RepairQuotes");

            migrationBuilder.DropTable(
                name: "RepairRequests");

            migrationBuilder.DropTable(
                name: "ServiceBookings");

            migrationBuilder.DropTable(
                name: "Technicians");

            migrationBuilder.DropTable(
                name: "WorkOrderActivityLogs");

            migrationBuilder.DropTable(
                name: "WorkOrderParts");

            migrationBuilder.DropTable(
                name: "WorkOrders");
        }
    }
}
