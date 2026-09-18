using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Accounting.Infrastructure.Data.Migrations
{
    /// <summary>
    /// W2-14 — hoá đơn trung thực với đơn hàng, giấy báo có, đối soát ca thu ngân, sổ quỹ.
    ///
    /// Viết tay (không chạy <c>dotnet ef migrations add</c>) vì quy trình D12 chỉ cho phép biên dịch
    /// qua <c>scripts/qh-build.sh</c>; model snapshot được cập nhật thủ công kèm theo file này.
    ///
    /// Không có bước chuyển dữ liệu cho các cột tiền mới trên <c>InvoiceLine</c>: dữ liệu DEV hiện
    /// có là hoá đơn demo bằng USD do consumer cũ sinh ra, không tái lập được số liệu thuế đúng
    /// từ chúng. Các cột mới mặc định 0 và hoá đơn cũ giữ nguyên <c>UnitPrice</c>/<c>Quantity</c>.
    /// </summary>
    [DbContext(typeof(AccountingDbContext))]
    [Migration("20260918193000_W214AccountingOrderInvoicesShiftsCashBook")]
    public partial class W214AccountingOrderInvoicesShiftsCashBook : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ===== Invoices: đơn hàng nguồn + ảnh chụp người mua =====
            migrationBuilder.AddColumn<Guid>(
                name: "OrderId", table: "Invoices", type: "uuid", nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "OrderNumber", table: "Invoices", type: "character varying(50)", maxLength: 50, nullable: true);
            migrationBuilder.AddColumn<DateOnly>(
                name: "BusinessDate", table: "Invoices", type: "date", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BuyerType", table: "Invoices", type: "character varying(20)", maxLength: 20, nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "BuyerLegalName", table: "Invoices", type: "character varying(255)", maxLength: 255, nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "BuyerFullName", table: "Invoices", type: "character varying(255)", maxLength: 255, nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "BuyerTaxCode", table: "Invoices", type: "character varying(20)", maxLength: 20, nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "BuyerBudgetUnitCode", table: "Invoices", type: "character varying(20)", maxLength: 20, nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "BuyerAddress", table: "Invoices", type: "character varying(500)", maxLength: 500, nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "BuyerEmail", table: "Invoices", type: "character varying(255)", maxLength: 255, nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "BuyerPhone", table: "Invoices", type: "character varying(20)", maxLength: 20, nullable: true);

            // Một đơn hàng = đúng một hoá đơn. Index lọc để các hoá đơn không gắn đơn (AP, lập tay)
            // không đụng nhau ở giá trị NULL.
            migrationBuilder.CreateIndex(
                name: "IX_Invoices_OrderId_Unique", table: "Invoices", column: "OrderId",
                unique: true, filter: "\"OrderId\" IS NOT NULL");

            // Một (đơn mua, phiếu nhập) = đúng một hoá đơn mua vào. Trước đây chỉ chặn ở tầng ứng
            // dụng nên hai lần giao cùng một POReceivedEvent nhân đôi nợ nhà cung cấp.
            migrationBuilder.CreateIndex(
                name: "IX_Invoices_PO_GRN_Unique", table: "Invoices",
                columns: new[] { "PurchaseOrderId", "GoodsReceiptId" },
                unique: true,
                filter: "\"PurchaseOrderId\" IS NOT NULL AND \"GoodsReceiptId\" IS NOT NULL");

            // ===== InvoiceLine: các con số tiền được LƯU chứ không tính lại =====
            migrationBuilder.AddColumn<string>(
                name: "Sku", table: "InvoiceLine", type: "character varying(100)", maxLength: 100, nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "UnitName", table: "InvoiceLine", type: "character varying(50)", maxLength: 50, nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "Note", table: "InvoiceLine", type: "character varying(500)", maxLength: 500, nullable: true);
            migrationBuilder.AddColumn<decimal>(
                name: "GrossBeforeDiscount", table: "InvoiceLine", type: "numeric(18,2)",
                precision: 18, scale: 2, nullable: false, defaultValue: 0m);
            migrationBuilder.AddColumn<decimal>(
                name: "LineDiscount", table: "InvoiceLine", type: "numeric(18,2)",
                precision: 18, scale: 2, nullable: false, defaultValue: 0m);
            migrationBuilder.AddColumn<decimal>(
                name: "GrossAmount", table: "InvoiceLine", type: "numeric(18,2)",
                precision: 18, scale: 2, nullable: false, defaultValue: 0m);
            migrationBuilder.AddColumn<decimal>(
                name: "NetAmount", table: "InvoiceLine", type: "numeric(18,2)",
                precision: 18, scale: 2, nullable: false, defaultValue: 0m);
            migrationBuilder.AddColumn<decimal>(
                name: "VatAmount", table: "InvoiceLine", type: "numeric(18,2)",
                precision: 18, scale: 2, nullable: false, defaultValue: 0m);
            migrationBuilder.AddColumn<bool>(
                name: "IsPromotion", table: "InvoiceLine", type: "boolean", nullable: false, defaultValue: false);

            // ===== ShiftSessions: đối soát quỹ thật =====
            migrationBuilder.AddColumn<decimal>(
                name: "ExpectedCash", table: "ShiftSessions", type: "numeric(18,2)",
                precision: 18, scale: 2, nullable: true);
            migrationBuilder.AddColumn<decimal>(
                name: "Variance", table: "ShiftSessions", type: "numeric(18,2)",
                precision: 18, scale: 2, nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "VarianceReason", table: "ShiftSessions", type: "character varying(500)",
                maxLength: 500, nullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "VarianceApprovedBy", table: "ShiftSessions", type: "uuid", nullable: true);
            migrationBuilder.AddColumn<DateTime>(
                name: "VarianceApprovedAt", table: "ShiftSessions",
                type: "timestamp without time zone", nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Source", table: "ShiftTransaction", type: "integer", nullable: false, defaultValue: 0);

            // Một thu ngân chỉ một ca MỞ — chặn ở DB, không chỉ ở tầng ứng dụng (0 = Open).
            migrationBuilder.CreateIndex(
                name: "IX_ShiftSessions_Cashier_Open_Unique",
                table: "ShiftSessions",
                column: "CashierId",
                unique: true,
                filter: "\"Status\" = 0");

            // ===== Giấy báo có =====
            migrationBuilder.CreateTable(
                name: "CreditNotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CreditNoteNumber = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    OriginalInvoiceId = table.Column<Guid>(type: "uuid", nullable: true),
                    OriginalInvoiceNumber = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: true),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    ReasonCode = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    NetAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    VatAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    VatRate = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    IssueDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    BusinessDate = table.Column<DateOnly>(type: "date", nullable: true),
                    SourceKey = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    EInvoiceId = table.Column<string>(type: "text", nullable: true),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CreditNotes", x => x.Id);
                    table.CheckConstraint("CK_CreditNotes_Amount_Positive", "\"Amount\" > 0");
                    table.CheckConstraint("CK_CreditNotes_VatAmount_NonNegative", "\"VatAmount\" >= 0");
                    table.CheckConstraint("CK_CreditNotes_VatRate_Percent", "\"VatRate\" >= 0 AND \"VatRate\" <= 100");
                });

            migrationBuilder.CreateIndex(
                name: "IX_CreditNotes_Number_Unique", table: "CreditNotes", column: "CreditNoteNumber", unique: true);
            migrationBuilder.CreateIndex(
                name: "IX_CreditNotes_SourceKey_Unique", table: "CreditNotes", column: "SourceKey", unique: true);
            migrationBuilder.CreateIndex(
                name: "IX_CreditNotes_OriginalInvoiceId", table: "CreditNotes", column: "OriginalInvoiceId");
            migrationBuilder.CreateIndex(
                name: "IX_CreditNotes_OrderId", table: "CreditNotes", column: "OrderId");

            // ===== Sổ quỹ tiền mặt =====
            migrationBuilder.CreateTable(
                name: "CashVouchers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VoucherNumber = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Kind = table.Column<int>(type: "integer", nullable: false),
                    FundCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    VoucherDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    BusinessDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    CounterpartyName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Source = table.Column<int>(type: "integer", nullable: false),
                    ShiftSessionId = table.Column<Guid>(type: "uuid", nullable: true),
                    ExpenseId = table.Column<Guid>(type: "uuid", nullable: true),
                    InvoiceId = table.Column<Guid>(type: "uuid", nullable: true),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: true),
                    SourceKey = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CashVouchers", x => x.Id);
                    table.CheckConstraint("CK_CashVouchers_Amount_Positive", "\"Amount\" > 0");
                });

            migrationBuilder.CreateIndex(
                name: "IX_CashVouchers_Number_Unique", table: "CashVouchers", column: "VoucherNumber", unique: true);
            migrationBuilder.CreateIndex(
                name: "IX_CashVouchers_SourceKey_Unique", table: "CashVouchers", column: "SourceKey",
                unique: true, filter: "\"SourceKey\" IS NOT NULL");
            migrationBuilder.CreateIndex(
                name: "IX_CashVouchers_Fund_Date", table: "CashVouchers", columns: new[] { "FundCode", "VoucherDate" });
            migrationBuilder.CreateIndex(
                name: "IX_CashVouchers_ShiftSessionId", table: "CashVouchers", column: "ShiftSessionId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "CashVouchers");
            migrationBuilder.DropTable(name: "CreditNotes");

            migrationBuilder.DropIndex(name: "IX_ShiftSessions_Cashier_Open_Unique", table: "ShiftSessions");
            migrationBuilder.DropColumn(name: "Source", table: "ShiftTransaction");
            migrationBuilder.DropColumn(name: "VarianceApprovedAt", table: "ShiftSessions");
            migrationBuilder.DropColumn(name: "VarianceApprovedBy", table: "ShiftSessions");
            migrationBuilder.DropColumn(name: "VarianceReason", table: "ShiftSessions");
            migrationBuilder.DropColumn(name: "Variance", table: "ShiftSessions");
            migrationBuilder.DropColumn(name: "ExpectedCash", table: "ShiftSessions");

            migrationBuilder.DropColumn(name: "IsPromotion", table: "InvoiceLine");
            migrationBuilder.DropColumn(name: "VatAmount", table: "InvoiceLine");
            migrationBuilder.DropColumn(name: "NetAmount", table: "InvoiceLine");
            migrationBuilder.DropColumn(name: "GrossAmount", table: "InvoiceLine");
            migrationBuilder.DropColumn(name: "LineDiscount", table: "InvoiceLine");
            migrationBuilder.DropColumn(name: "GrossBeforeDiscount", table: "InvoiceLine");
            migrationBuilder.DropColumn(name: "Note", table: "InvoiceLine");
            migrationBuilder.DropColumn(name: "UnitName", table: "InvoiceLine");
            migrationBuilder.DropColumn(name: "Sku", table: "InvoiceLine");

            migrationBuilder.DropIndex(name: "IX_Invoices_PO_GRN_Unique", table: "Invoices");
            migrationBuilder.DropIndex(name: "IX_Invoices_OrderId_Unique", table: "Invoices");
            migrationBuilder.DropColumn(name: "BuyerPhone", table: "Invoices");
            migrationBuilder.DropColumn(name: "BuyerEmail", table: "Invoices");
            migrationBuilder.DropColumn(name: "BuyerAddress", table: "Invoices");
            migrationBuilder.DropColumn(name: "BuyerBudgetUnitCode", table: "Invoices");
            migrationBuilder.DropColumn(name: "BuyerTaxCode", table: "Invoices");
            migrationBuilder.DropColumn(name: "BuyerFullName", table: "Invoices");
            migrationBuilder.DropColumn(name: "BuyerLegalName", table: "Invoices");
            migrationBuilder.DropColumn(name: "BuyerType", table: "Invoices");
            migrationBuilder.DropColumn(name: "BusinessDate", table: "Invoices");
            migrationBuilder.DropColumn(name: "OrderNumber", table: "Invoices");
            migrationBuilder.DropColumn(name: "OrderId", table: "Invoices");
        }
    }
}
