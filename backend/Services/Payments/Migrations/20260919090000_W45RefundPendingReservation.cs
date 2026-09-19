using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Payments.Migrations
{
    /// <summary>
    /// W4-5 / H2 — chỗ giữ cho phiếu hoàn ĐANG MỞ.
    ///
    /// Hoàn tiền là chuyển khoản TAY: tiền rời ngân hàng ở bước kế toán chuyển khoản, còn
    /// <c>AmountRefunded</c> chỉ tăng lúc bấm "đã trả". Chốt cũ chỉ so <c>AmountRefunded</c> nên
    /// N phiếu trọn giá trị cùng tồn tại ở trạng thái Approved được, mỗi phiếu chi một lần.
    ///
    /// Cột <c>AmountRefundPending</c> giữ tổng phiếu ở trạng thái Requested(0)/Approved(1)/Failed(4)
    /// và CHECK mới chốt <c>AmountRefunded + AmountRefundPending &lt;= Amount</c> ngay ở CSDL.
    /// Backfill kẹp bằng LEAST(...) để dữ liệu cũ đã lỡ vượt hạn mức không làm migration nổ.
    /// DDL thô idempotent, cùng lối với các migration trước của module này.
    /// </summary>
    public partial class W45RefundPendingReservation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE payments.""PaymentIntents""
                    ADD COLUMN IF NOT EXISTS ""AmountRefundPending"" numeric(18,2) NOT NULL DEFAULT 0;

                UPDATE payments.""PaymentIntents"" p
                SET ""AmountRefundPending"" = LEAST(
                        COALESCE((
                            SELECT SUM(r.""Amount"")
                            FROM payments.""PaymentRefunds"" r
                            WHERE r.""PaymentIntentId"" = p.""Id"" AND r.""Status"" IN (0, 1, 4)
                        ), 0),
                        GREATEST(p.""Amount"" - p.""AmountRefunded"", 0));

                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conname = 'CK_PaymentIntents_RefundPending_NotOverAmount'
                    ) THEN
                        ALTER TABLE payments.""PaymentIntents""
                            ADD CONSTRAINT ""CK_PaymentIntents_RefundPending_NotOverAmount""
                            CHECK (""AmountRefundPending"" >= 0
                                   AND ""AmountRefunded"" + ""AmountRefundPending"" <= ""Amount"");
                    END IF;
                END $$;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE payments.""PaymentIntents""
                    DROP CONSTRAINT IF EXISTS ""CK_PaymentIntents_RefundPending_NotOverAmount"";
                ALTER TABLE payments.""PaymentIntents""
                    DROP COLUMN IF EXISTS ""AmountRefundPending"";
            ");
        }
    }
}
