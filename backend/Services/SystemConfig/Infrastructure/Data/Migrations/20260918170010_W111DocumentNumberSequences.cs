using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SystemConfig.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class W111DocumentNumberSequences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // W1-11 / hợp đồng cố định của W1-3 (phase-12) + D10 (loại `bg`):
            // 13 sequence sinh số chứng từ, ĐẶT TRONG SCHEMA `public`.
            // `DocumentNumberService` gọi `SELECT nextval('docnum_<type>_seq')` KHÔNG kèm schema,
            // nên chúng phải nằm trên search_path mặc định của kết nối ứng dụng ("$user", public) -
            // schema mặc định `config` của SystemConfig sẽ KHÔNG được tìm thấy.
            //
            // Vì sao là sequence chứ không phải bộ đếm tĩnh: bộ đếm cũ
            // (Inventory/Domain/DocumentNumberGenerator.cs) khởi động lại từ 0 sau mỗi lần deploy và
            // sinh ra số trùng - nhật ký PostgreSQL có lỗi trùng khoá trên IX_Rmas_RmaNumber.
            // Khoảng trống số là CHẤP NHẬN ĐƯỢC: số để định danh chứng từ, không để đếm.
            migrationBuilder.Sql(@"
                CREATE SEQUENCE IF NOT EXISTS public.docnum_po_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE CACHE 1;  -- PO-yyyyMM-#####
                CREATE SEQUENCE IF NOT EXISTS public.docnum_grn_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE CACHE 1;  -- GRN-yyyyMM-#####
                CREATE SEQUENCE IF NOT EXISTS public.docnum_dn_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE CACHE 1;  -- DN-yyyyMM-#####
                CREATE SEQUENCE IF NOT EXISTS public.docnum_rma_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE CACHE 1;  -- RMA-yyyyMM-#####
                CREATE SEQUENCE IF NOT EXISTS public.docnum_inv_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE CACHE 1;  -- INV-yyyyMM-#####
                CREATE SEQUENCE IF NOT EXISTS public.docnum_wo_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE CACHE 1;  -- WO-yyyyMM-#####
                CREATE SEQUENCE IF NOT EXISTS public.docnum_tr_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE CACHE 1;  -- TR-yyyyMM-#####
                CREATE SEQUENCE IF NOT EXISTS public.docnum_pr_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE CACHE 1;  -- PR-yyyyMM-#####
                CREATE SEQUENCE IF NOT EXISTS public.docnum_rfq_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE CACHE 1;  -- RFQ-yyyyMM-#####
                CREATE SEQUENCE IF NOT EXISTS public.docnum_ret_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE CACHE 1;  -- RET-yyyyMM-#####
                CREATE SEQUENCE IF NOT EXISTS public.docnum_pay_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE CACHE 1;  -- PAY-yyyyMM-#####
                CREATE SEQUENCE IF NOT EXISTS public.docnum_so_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE CACHE 1;  -- SO-yyyyMM-#####
                CREATE SEQUENCE IF NOT EXISTS public.docnum_bg_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE CACHE 1;  -- BG-yyyyMM-#####");

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DROP SEQUENCE IF EXISTS public.docnum_po_seq;
                DROP SEQUENCE IF EXISTS public.docnum_grn_seq;
                DROP SEQUENCE IF EXISTS public.docnum_dn_seq;
                DROP SEQUENCE IF EXISTS public.docnum_rma_seq;
                DROP SEQUENCE IF EXISTS public.docnum_inv_seq;
                DROP SEQUENCE IF EXISTS public.docnum_wo_seq;
                DROP SEQUENCE IF EXISTS public.docnum_tr_seq;
                DROP SEQUENCE IF EXISTS public.docnum_pr_seq;
                DROP SEQUENCE IF EXISTS public.docnum_rfq_seq;
                DROP SEQUENCE IF EXISTS public.docnum_ret_seq;
                DROP SEQUENCE IF EXISTS public.docnum_pay_seq;
                DROP SEQUENCE IF EXISTS public.docnum_so_seq;
                DROP SEQUENCE IF EXISTS public.docnum_bg_seq;");

        }
    }
}
