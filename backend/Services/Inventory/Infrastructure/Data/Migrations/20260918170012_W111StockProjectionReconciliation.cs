using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Inventory.Infrastructure.Data.Migrations
{
    /// <summary>
    /// W1-11 bước 9 - đối soát tồn kho một lần (audit db-schema-migrations-05).
    ///
    /// Quy tắc đã chốt: <c>InventoryItems</c> là NGUỒN SỰ THẬT của tồn kho;
    /// <c>Products.StockQuantity</c> chỉ là BẢN CHIẾU (projection) để hiển thị nhanh.
    /// Từ nay chỉ consumer của W2-1 được ghi vào cột đó; mọi nơi khác chỉ đọc.
    ///
    /// Migration này KHÔNG có model change nào (không đụng snapshot) - nó chỉ sửa dữ liệu,
    /// và được viết idempotent để chạy lại nhiều lần vẫn cho cùng kết quả.
    ///
    /// CÓ CHỦ ĐÍCH: chỉ đối soát những sản phẩm ĐÃ CÓ ít nhất một dòng InventoryItems.
    /// Trên CSDL dev hôm nay chỉ 6/28 sản phẩm có dòng tồn kho; nếu đặt 22 sản phẩm còn lại về 0
    /// thì gần như toàn bộ cửa hàng sẽ hiện "hết hàng". Sản phẩm chưa được theo dõi tồn kho
    /// KHÁC với sản phẩm tồn bằng 0 - phiếu nhập mở đầu (W1-4 / W2-5) sẽ tạo dòng cho chúng,
    /// và lúc đó lần chạy sau của truy vấn này sẽ tự đưa về đúng.
    /// </summary>
    public partial class W111StockProjectionReconciliation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Trả lại số đang giữ chỗ bị rò rỉ: ReservedQuantity phải bằng đúng tổng số
            //    lượng của các StockReservation còn Active (Status = 0). Trên CSDL dev có 2 dòng
            //    giữ chỗ vĩnh viễn vì đơn đã huỷ/giải phóng nhưng ReservedQuantity không được trừ.
            migrationBuilder.Sql(@"
                UPDATE public.""InventoryItems"" i
                   SET ""ReservedQuantity"" = COALESCE(a.qty, 0)
                  FROM (SELECT id, qty FROM (
                          SELECT i2.""Id"" AS id,
                                 COALESCE((SELECT sum(r.""Quantity"")
                                             FROM public.""StockReservations"" r
                                            WHERE r.""InventoryItemId"" = i2.""Id""
                                              AND r.""Status"" = 0), 0) AS qty
                            FROM public.""InventoryItems"" i2) t
                        ) a
                 WHERE i.""Id"" = a.id
                   AND i.""ReservedQuantity"" <> COALESCE(a.qty, 0);");

            // 2. Không bao giờ giữ chỗ nhiều hơn số đang có (ràng buộc
            //    CK_InventoryItems_Reserved_LteOnHand đã có từ migration 20260918170004).
            migrationBuilder.Sql(@"
                UPDATE public.""InventoryItems""
                   SET ""ReservedQuantity"" = ""QuantityOnHand""
                 WHERE ""ReservedQuantity"" > ""QuantityOnHand"";");

            // 3. Dựng lại bản chiếu Products.StockQuantity = tổng (tồn - giữ chỗ) của mọi kho,
            //    CHỈ cho sản phẩm đã có dòng tồn kho (xem phần mô tả ở trên).
            //    GREATEST(...,0) để không vi phạm CK_Products_StockQuantity_NonNegative.
            migrationBuilder.Sql(@"
                UPDATE public.""Products"" p
                   SET ""StockQuantity"" = GREATEST(s.available, 0)
                  FROM (SELECT ""ProductId"" AS pid,
                               sum(""QuantityOnHand"" - ""ReservedQuantity"") AS available
                          FROM public.""InventoryItems""
                         GROUP BY ""ProductId"") s
                 WHERE p.""Id"" = s.pid
                   AND p.""StockQuantity"" <> GREATEST(s.available, 0);");

            // 4. Ghi chú ngay trong CSDL: người đọc schema bằng psql cũng thấy quy tắc.
            migrationBuilder.Sql(@"
                COMMENT ON COLUMN public.""Products"".""StockQuantity"" IS
                    'BẢN CHIẾU (projection) của Inventory. Nguồn sự thật là InventoryItems.QuantityOnHand - ReservedQuantity. Chỉ consumer StockChanged (W2-1) được ghi cột này.';
                COMMENT ON COLUMN public.""InventoryItems"".""QuantityOnHand"" IS
                    'Nguồn sự thật của tồn kho theo (sản phẩm, biến thể, kho).';
                COMMENT ON COLUMN public.""InventoryItems"".""ReservedQuantity"" IS
                    'Tổng số lượng của các StockReservation đang Active (Status = 0). Luôn <= QuantityOnHand.';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Không hoàn tác được: giá trị cũ là dữ liệu sai, không có bản sao để khôi phục.
            // Chỉ gỡ phần chú thích.
            migrationBuilder.Sql(@"
                COMMENT ON COLUMN public.""Products"".""StockQuantity"" IS NULL;
                COMMENT ON COLUMN public.""InventoryItems"".""QuantityOnHand"" IS NULL;
                COMMENT ON COLUMN public.""InventoryItems"".""ReservedQuantity"" IS NULL;");
        }
    }
}
