using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Payments.Migrations
{
    /// <summary>
    /// Repairs migration drift: <c>20260216160010_AddSePayTables</c> declares
    /// <c>DropTable("PaymentIntents")</c> in its Down() but never creates the table in its Up(),
    /// so <c>payments."PaymentIntents"</c> has never existed in any environment even though the
    /// model snapshot has always contained it. Every <c>/api/payments/*</c> write therefore died
    /// with <c>42P01 relation "payments.PaymentIntents" does not exist</c>.
    ///
    /// Written as raw idempotent DDL (<c>IF NOT EXISTS</c>) on purpose: environments that were
    /// hand-patched with the same DDL must stay applicable, and the column list is taken verbatim
    /// from <see cref="PaymentsDbContextModelSnapshot"/> so no follow-up model diff is produced.
    /// </summary>
    public partial class AddPaymentIntentsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                CREATE SCHEMA IF NOT EXISTS payments;

                CREATE TABLE IF NOT EXISTS payments.""PaymentIntents"" (
                    ""Id""              uuid           NOT NULL,
                    ""OrderId""         uuid           NOT NULL,
                    ""Amount""          numeric(18,2)  NOT NULL,
                    ""Currency""        character varying(3)   NOT NULL,
                    ""Provider""        integer        NOT NULL,
                    ""Status""          integer        NOT NULL,
                    ""ExternalId""      text           NULL,
                    ""ClientSecret""    text           NULL,
                    ""FailureReason""   text           NULL,
                    ""IdempotencyKey""  character varying(100) NOT NULL,
                    ""Version""         integer        NOT NULL,
                    ""IsActive""        boolean        NOT NULL,
                    ""CreatedAt""       timestamp without time zone NOT NULL,
                    ""UpdatedAt""       timestamp without time zone NULL,
                    ""CreatedBy""       text           NULL,
                    ""UpdatedBy""       text           NULL,
                    CONSTRAINT ""PK_PaymentIntents"" PRIMARY KEY (""Id"")
                );

                CREATE UNIQUE INDEX IF NOT EXISTS ""IX_PaymentIntents_IdempotencyKey""
                    ON payments.""PaymentIntents"" (""IdempotencyKey"");
                CREATE INDEX IF NOT EXISTS ""IX_PaymentIntents_OrderId""
                    ON payments.""PaymentIntents"" (""OrderId"");
                CREATE INDEX IF NOT EXISTS ""IX_PaymentIntents_ExternalId""
                    ON payments.""PaymentIntents"" (""ExternalId"");
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS payments.""PaymentIntents"";");
        }
    }
}
