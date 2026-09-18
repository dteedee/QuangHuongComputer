using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Payments.Migrations
{
    /// <summary>
    /// W2-4 / D04 mục 4 — hai thứ:
    ///  1. cột mới trên <c>payments."PaymentIntents"</c>: mã thanh toán VietQR (<c>PaymentCode</c>),
    ///     cửa sổ giữ đơn (<c>ExpiresAt</c>), tổng đã hoàn (<c>AmountRefunded</c>), mã tham chiếu
    ///     ngân hàng khi kế toán xác nhận tay, mốc xác nhận, và trạng thái nộp quỹ COD;
    ///  2. bảng <c>payments."PaymentRefunds"</c>.
    ///
    /// Viết bằng DDL thô idempotent (<c>IF NOT EXISTS</c>) giống
    /// <c>20260918100000_AddPaymentIntentsTable</c>: môi trường TEST được vá tay bằng đúng DDL này
    /// trong lúc phát triển, nên migration phải áp lại được mà không nổ.
    ///
    /// <c>AmountRefunded</c> mặc định 0 và có CHECK không vượt quá <c>Amount</c> — "không bao giờ
    /// hoàn quá số đã thu" là ràng buộc tiền, phải nằm ở CSDL chứ không chỉ trong code.
    /// </summary>
    public partial class W24PaymentRefundsAndVietQr : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE payments.""PaymentIntents""
                    ADD COLUMN IF NOT EXISTS ""PaymentCode""             character varying(20)  NULL,
                    ADD COLUMN IF NOT EXISTS ""ExpiresAt""               timestamp without time zone NULL,
                    ADD COLUMN IF NOT EXISTS ""AmountRefunded""          numeric(18,2)          NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS ""ReconciliationReference"" character varying(100) NULL,
                    ADD COLUMN IF NOT EXISTS ""ConfirmedAt""             timestamp without time zone NULL,
                    ADD COLUMN IF NOT EXISTS ""Settlement""              integer                NOT NULL DEFAULT 0;

                CREATE UNIQUE INDEX IF NOT EXISTS ""IX_PaymentIntents_PaymentCode""
                    ON payments.""PaymentIntents"" (""PaymentCode"")
                    WHERE ""PaymentCode"" IS NOT NULL;

                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conname = 'CK_PaymentIntents_Refund_NotOverAmount'
                    ) THEN
                        ALTER TABLE payments.""PaymentIntents""
                            ADD CONSTRAINT ""CK_PaymentIntents_Refund_NotOverAmount""
                            CHECK (""AmountRefunded"" >= 0 AND ""AmountRefunded"" <= ""Amount"");
                    END IF;
                END $$;

                CREATE TABLE IF NOT EXISTS payments.""PaymentRefunds"" (
                    ""Id""              uuid           NOT NULL,
                    ""PaymentIntentId"" uuid           NOT NULL,
                    ""OrderId""         uuid           NOT NULL,
                    ""Amount""          numeric(18,2)  NOT NULL,
                    ""Channel""         integer        NOT NULL,
                    ""Status""          integer        NOT NULL,
                    ""Reason""          character varying(500)  NOT NULL,
                    ""Reference""       character varying(100)  NULL,
                    ""RequestedBy""     uuid           NULL,
                    ""RequestedAt""     timestamp without time zone NOT NULL,
                    ""ApprovedBy""      uuid           NULL,
                    ""ApprovedAt""      timestamp without time zone NULL,
                    ""CompletedAt""     timestamp without time zone NULL,
                    ""FailureReason""   character varying(500)  NULL,
                    ""IdempotencyKey""  character varying(100)  NOT NULL,
                    ""IsActive""        boolean        NOT NULL DEFAULT TRUE,
                    ""CreatedAt""       timestamp without time zone NOT NULL,
                    ""UpdatedAt""       timestamp without time zone NULL,
                    ""CreatedBy""       text           NULL,
                    ""UpdatedBy""       text           NULL,
                    CONSTRAINT ""PK_PaymentRefunds"" PRIMARY KEY (""Id""),
                    CONSTRAINT ""CK_PaymentRefunds_Amount_Positive"" CHECK (""Amount"" > 0)
                );

                CREATE UNIQUE INDEX IF NOT EXISTS ""IX_PaymentRefunds_IdempotencyKey""
                    ON payments.""PaymentRefunds"" (""IdempotencyKey"");
                CREATE INDEX IF NOT EXISTS ""IX_PaymentRefunds_PaymentIntentId""
                    ON payments.""PaymentRefunds"" (""PaymentIntentId"");
                CREATE INDEX IF NOT EXISTS ""IX_PaymentRefunds_OrderId""
                    ON payments.""PaymentRefunds"" (""OrderId"");
                CREATE INDEX IF NOT EXISTS ""IX_PaymentRefunds_Status_RequestedAt""
                    ON payments.""PaymentRefunds"" (""Status"", ""RequestedAt"");
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DROP TABLE IF EXISTS payments.""PaymentRefunds"";

                ALTER TABLE payments.""PaymentIntents""
                    DROP CONSTRAINT IF EXISTS ""CK_PaymentIntents_Refund_NotOverAmount"";
                DROP INDEX IF EXISTS payments.""IX_PaymentIntents_PaymentCode"";

                ALTER TABLE payments.""PaymentIntents""
                    DROP COLUMN IF EXISTS ""PaymentCode"",
                    DROP COLUMN IF EXISTS ""ExpiresAt"",
                    DROP COLUMN IF EXISTS ""AmountRefunded"",
                    DROP COLUMN IF EXISTS ""ReconciliationReference"",
                    DROP COLUMN IF EXISTS ""ConfirmedAt"",
                    DROP COLUMN IF EXISTS ""Settlement"";
            ");
        }
    }
}
