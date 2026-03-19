-- ============================================
-- Script: Update Suppliers Table Schema
-- Thêm các cột mới cho bảng Suppliers
-- ============================================

-- Thêm cột Code (nếu chưa có)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'Code') THEN
        ALTER TABLE "Suppliers" ADD COLUMN "Code" VARCHAR(20);

        -- Sinh mã cho các suppliers hiện có
        WITH numbered AS (
            SELECT "Id", ROW_NUMBER() OVER (ORDER BY "CreatedAt") as rn
            FROM "Suppliers"
        )
        UPDATE "Suppliers" s
        SET "Code" = 'NCC-' || LPAD(n.rn::text, 4, '0')
        FROM numbered n
        WHERE s."Id" = n."Id";

        -- Đặt NOT NULL và UNIQUE
        ALTER TABLE "Suppliers" ALTER COLUMN "Code" SET NOT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS "IX_Supplier_Code" ON "Suppliers" ("Code");
    END IF;
END $$;

-- Thêm các cột thông tin cơ bản
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'ShortName') THEN ALTER TABLE "Suppliers" ADD COLUMN "ShortName" VARCHAR(50); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'SupplierType') THEN ALTER TABLE "Suppliers" ADD COLUMN "SupplierType" INTEGER NOT NULL DEFAULT 1; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'Description') THEN ALTER TABLE "Suppliers" ADD COLUMN "Description" VARCHAR(1000); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'Website') THEN ALTER TABLE "Suppliers" ADD COLUMN "Website" VARCHAR(200); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'LogoUrl') THEN ALTER TABLE "Suppliers" ADD COLUMN "LogoUrl" VARCHAR(500); END IF; END $$;

-- Thêm các cột thông tin kinh doanh
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'TaxCode') THEN ALTER TABLE "Suppliers" ADD COLUMN "TaxCode" VARCHAR(20); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'BankAccount') THEN ALTER TABLE "Suppliers" ADD COLUMN "BankAccount" VARCHAR(30); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'BankName') THEN ALTER TABLE "Suppliers" ADD COLUMN "BankName" VARCHAR(100); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'BankBranch') THEN ALTER TABLE "Suppliers" ADD COLUMN "BankBranch" VARCHAR(100); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'PaymentTerms') THEN ALTER TABLE "Suppliers" ADD COLUMN "PaymentTerms" INTEGER NOT NULL DEFAULT 0; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'PaymentDays') THEN ALTER TABLE "Suppliers" ADD COLUMN "PaymentDays" INTEGER; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'CreditLimit') THEN ALTER TABLE "Suppliers" ADD COLUMN "CreditLimit" DECIMAL(18,2) NOT NULL DEFAULT 0; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'CurrentDebt') THEN ALTER TABLE "Suppliers" ADD COLUMN "CurrentDebt" DECIMAL(18,2) NOT NULL DEFAULT 0; END IF; END $$;

-- Thêm các cột liên hệ
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'ContactTitle') THEN ALTER TABLE "Suppliers" ADD COLUMN "ContactTitle" VARCHAR(50); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'Fax') THEN ALTER TABLE "Suppliers" ADD COLUMN "Fax" VARCHAR(20); END IF; END $$;

-- Thêm các cột địa chỉ chi tiết
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'Ward') THEN ALTER TABLE "Suppliers" ADD COLUMN "Ward" VARCHAR(100); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'District') THEN ALTER TABLE "Suppliers" ADD COLUMN "District" VARCHAR(100); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'City') THEN ALTER TABLE "Suppliers" ADD COLUMN "City" VARCHAR(100); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'Country') THEN ALTER TABLE "Suppliers" ADD COLUMN "Country" VARCHAR(100) DEFAULT 'Việt Nam'; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'PostalCode') THEN ALTER TABLE "Suppliers" ADD COLUMN "PostalCode" VARCHAR(20); END IF; END $$;

-- Thêm các cột ghi chú và đánh giá
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'Rating') THEN ALTER TABLE "Suppliers" ADD COLUMN "Rating" INTEGER NOT NULL DEFAULT 0; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'Notes') THEN ALTER TABLE "Suppliers" ADD COLUMN "Notes" VARCHAR(2000); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'Categories') THEN ALTER TABLE "Suppliers" ADD COLUMN "Categories" VARCHAR(500); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'Brands') THEN ALTER TABLE "Suppliers" ADD COLUMN "Brands" VARCHAR(500); END IF; END $$;

-- Thêm các cột thống kê
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'TotalOrders') THEN ALTER TABLE "Suppliers" ADD COLUMN "TotalOrders" INTEGER NOT NULL DEFAULT 0; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'TotalPurchaseAmount') THEN ALTER TABLE "Suppliers" ADD COLUMN "TotalPurchaseAmount" DECIMAL(18,2) NOT NULL DEFAULT 0; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'LastOrderDate') THEN ALTER TABLE "Suppliers" ADD COLUMN "LastOrderDate" TIMESTAMP WITH TIME ZONE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Suppliers' AND column_name = 'FirstOrderDate') THEN ALTER TABLE "Suppliers" ADD COLUMN "FirstOrderDate" TIMESTAMP WITH TIME ZONE; END IF; END $$;

-- Tạo indexes
CREATE INDEX IF NOT EXISTS "IX_Supplier_TaxCode" ON "Suppliers" ("TaxCode");
CREATE INDEX IF NOT EXISTS "IX_Supplier_Email" ON "Suppliers" ("Email");
CREATE INDEX IF NOT EXISTS "IX_Supplier_Type" ON "Suppliers" ("SupplierType");
CREATE INDEX IF NOT EXISTS "IX_Supplier_City" ON "Suppliers" ("City");

-- Thông báo hoàn thành
SELECT 'Schema update completed for Suppliers table!' as message;
