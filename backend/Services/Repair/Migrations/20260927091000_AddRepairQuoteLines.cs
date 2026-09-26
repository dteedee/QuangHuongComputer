using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Repair.Infrastructure;

#nullable disable

namespace Repair.Migrations
{
    /// <inheritdoc />
    /// <summary>
    /// Báo giá sửa chữa chi tiết theo dòng: bảng <c>RepairQuoteLines</c> + các cột snapshot tính tiền
    /// trên <c>RepairQuotes</c> (tạm tính, giảm giá dòng, giảm giá cả phiếu, tiền trước thuế, VAT).
    ///
    /// Dữ liệu cũ: mỗi báo giá chỉ có 3 con số (PartsCost/LaborCost/ServiceFee) được tách thành tối đa
    /// 3 dòng (Linh kiện / Công sửa chữa / Phí dịch vụ), SL 1, đơn giá = con số cũ làm tròn đồng; báo
    /// giá toàn số 0 nhận một dòng "Khác" 0 ₫ để không có phiếu rỗng. Số cũ coi là ĐÃ gồm VAT; thuế
    /// suất = 8% nếu ngày tạo (giờ VN) nằm trong cửa sổ giảm NQ 204/2025 (01/07/2025–31/12/2026), còn
    /// lại 10%; VAT tách theo đúng công thức ExtractVat (net = round(gross/(1+r)), vat = phần dư).
    /// [Migration]/[DbContext] gắn trực tiếp (không Designer.cs) như 20260926090000_AddUrlRedirects;
    /// model snapshot cập nhật tay.
    /// </summary>
    [DbContext(typeof(RepairDbContext))]
    [Migration("20260927091000_AddRepairQuoteLines")]
    public partial class AddRepairQuoteLines : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var column in new[] { "SubtotalAmount", "LineDiscountTotal", "DiscountAmount", "NetAmount", "VatAmount" })
            {
                migrationBuilder.AddColumn<decimal>(
                    name: column, table: "RepairQuotes", type: "numeric(18,2)",
                    precision: 18, scale: 2, nullable: false, defaultValue: 0m);
            }

            migrationBuilder.AddColumn<decimal>(
                name: "VatRate", table: "RepairQuotes", type: "numeric(5,4)",
                precision: 5, scale: 4, nullable: false, defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "RepairQuoteLines",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    QuoteId = table.Column<Guid>(type: "uuid", nullable: false),
                    Sequence = table.Column<int>(type: "integer", nullable: false),
                    Kind = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    InventoryItemId = table.Column<Guid>(type: "uuid", nullable: true),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: true),
                    ServiceTypeId = table.Column<Guid>(type: "uuid", nullable: true),
                    Quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    LineDiscount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    GrossAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    AllocatedDiscount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    LineTotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    VatRate = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false),
                    NetAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    VatAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RepairQuoteLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RepairQuoteLines_RepairQuotes_QuoteId",
                        column: x => x.QuoteId,
                        principalTable: "RepairQuotes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.CheckConstraint("CK_RepairQuoteLines_Quantity_Positive", "\"Quantity\" > 0");
                    table.CheckConstraint("CK_RepairQuoteLines_UnitPrice_NonNegative", "\"UnitPrice\" >= 0");
                    table.CheckConstraint("CK_RepairQuoteLines_LineDiscount_NonNegative", "\"LineDiscount\" >= 0");
                    table.CheckConstraint("CK_RepairQuoteLines_LineTotal_NonNegative", "\"LineTotal\" >= 0");
                });

            migrationBuilder.CreateIndex(
                name: "IX_RepairQuoteLines_QuoteId_Sequence",
                table: "RepairQuoteLines",
                columns: new[] { "QuoteId", "Sequence" },
                unique: true);

            migrationBuilder.Sql(BackfillSql);

            migrationBuilder.AddCheckConstraint(
                name: "CK_RepairQuotes_DiscountAmount_NonNegative",
                table: "RepairQuotes",
                sql: "\"DiscountAmount\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RepairQuotes_Totals_NonNegative",
                table: "RepairQuotes",
                sql: "\"PartsCost\" >= 0 AND \"LaborCost\" >= 0 AND \"ServiceFee\" >= 0");
        }

        /// <summary>Tách 3 con số cũ thành dòng rồi chụp lại snapshot tổng trên từng báo giá.</summary>
        private const string BackfillSql = @"
            INSERT INTO ""RepairQuoteLines"" (""Id"", ""QuoteId"", ""Sequence"", ""Kind"", ""Description"",
                ""Quantity"", ""UnitPrice"", ""LineDiscount"", ""GrossAmount"", ""AllocatedDiscount"", ""LineTotal"",
                ""VatRate"", ""NetAmount"", ""VatAmount"", ""IsActive"", ""CreatedAt"", ""CreatedBy"")
            SELECT gen_random_uuid(), q.""Id"",
                   row_number() OVER (PARTITION BY q.""Id"" ORDER BY v.kind),
                   v.kind, v.descr, 1, v.amount, 0, v.amount, 0, v.amount,
                   r.rate, round(v.amount / (1 + r.rate)), v.amount - round(v.amount / (1 + r.rate)),
                   true, q.""CreatedAt"", 'migration:AddRepairQuoteLines'
            FROM ""RepairQuotes"" q
            CROSS JOIN LATERAL (SELECT CASE
                WHEN (q.""CreatedAt"" AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN DATE '2025-07-01' AND DATE '2026-12-31'
                THEN 0.08 ELSE 0.10 END::numeric(5,4) AS rate) r
            CROSS JOIN LATERAL (VALUES
                (0, 'Linh kiện', round(q.""PartsCost"")),
                (1, 'Công sửa chữa', round(q.""LaborCost"")),
                (2, 'Phí dịch vụ', round(q.""ServiceFee""))) v(kind, descr, amount)
            WHERE v.amount > 0;

            INSERT INTO ""RepairQuoteLines"" (""Id"", ""QuoteId"", ""Sequence"", ""Kind"", ""Description"",
                ""Quantity"", ""UnitPrice"", ""LineDiscount"", ""GrossAmount"", ""AllocatedDiscount"", ""LineTotal"",
                ""VatRate"", ""NetAmount"", ""VatAmount"", ""IsActive"", ""CreatedAt"", ""CreatedBy"")
            SELECT gen_random_uuid(), q.""Id"", 1, 3, 'Báo giá chuyển đổi (không có số tiền)',
                   1, 0, 0, 0, 0, 0, 0, 0, 0, true, q.""CreatedAt"", 'migration:AddRepairQuoteLines'
            FROM ""RepairQuotes"" q
            WHERE NOT EXISTS (SELECT 1 FROM ""RepairQuoteLines"" l WHERE l.""QuoteId"" = q.""Id"");

            UPDATE ""RepairQuotes"" q SET
                ""PartsCost"" = round(q.""PartsCost""),
                ""LaborCost"" = round(q.""LaborCost""),
                ""ServiceFee"" = round(q.""ServiceFee""),
                ""SubtotalAmount"" = s.total,
                ""NetAmount"" = s.net,
                ""VatAmount"" = s.vat,
                ""VatRate"" = s.rate
            FROM (SELECT ""QuoteId"", sum(""LineTotal"") AS total, sum(""NetAmount"") AS net,
                         sum(""VatAmount"") AS vat, max(""VatRate"") AS rate
                  FROM ""RepairQuoteLines"" GROUP BY ""QuoteId"") s
            WHERE s.""QuoteId"" = q.""Id"";";

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(name: "CK_RepairQuotes_DiscountAmount_NonNegative", table: "RepairQuotes");
            migrationBuilder.DropCheckConstraint(name: "CK_RepairQuotes_Totals_NonNegative", table: "RepairQuotes");
            migrationBuilder.DropTable(name: "RepairQuoteLines");

            foreach (var column in new[] { "SubtotalAmount", "LineDiscountTotal", "DiscountAmount", "NetAmount", "VatAmount", "VatRate" })
                migrationBuilder.DropColumn(name: column, table: "RepairQuotes");
        }
    }
}
