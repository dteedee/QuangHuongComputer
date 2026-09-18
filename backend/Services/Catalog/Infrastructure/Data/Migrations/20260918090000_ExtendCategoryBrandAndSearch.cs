using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Catalog.Infrastructure.Data.Migrations
{
    /// <summary>
    /// W0-5: mở rộng Categories/Brands cho một cửa hàng máy tính (cây danh mục, slug, logo)
    /// và bật tìm kiếm không phân biệt hoa/thường + không phân biệt dấu.
    ///
    /// TOÀN BỘ DDL ở đây là IDEMPOTENT và CHỈ THÊM (additive):
    ///  - API đang chạy BẢN CŨ trên schema mới, nên mọi cột mới phải NULL được hoặc có DEFAULT
    ///    (INSERT của bản cũ không liệt kê cột mới vẫn phải thành công);
    ///  - không đổi tên, không xoá cột nào;
    ///  - script có thể chạy lại sau khi đã áp thủ công bằng psql mà không lỗi.
    /// </summary>
    [DbContext(typeof(Catalog.Infrastructure.CatalogDbContext))]
    [Migration("20260918090000_ExtendCategoryBrandAndSearch")]
    public partial class ExtendCategoryBrandAndSearch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ---------------------------------------------------------------- extensions
            migrationBuilder.Sql(@"CREATE EXTENSION IF NOT EXISTS unaccent;");
            migrationBuilder.Sql(@"CREATE EXTENSION IF NOT EXISTS pg_trgm;");

            // `unaccent(text)` chỉ STABLE nên không dùng được trong index. Bản hai tham số
            // `unaccent(regdictionary, text)` là IMMUTABLE - bọc lại để vừa gọi được từ EF
            // (HasDbFunction) vừa index được bằng GIN trigram.
            migrationBuilder.Sql(@"
                CREATE OR REPLACE FUNCTION public.qh_unaccent_immutable(text)
                RETURNS text
                LANGUAGE sql
                IMMUTABLE
                PARALLEL SAFE
                STRICT
                AS $func$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $func$;");

            // ---------------------------------------------------------------- Categories
            migrationBuilder.Sql(@"
                ALTER TABLE public.""Categories""
                    ADD COLUMN IF NOT EXISTS ""ParentId""             uuid NULL,
                    ADD COLUMN IF NOT EXISTS ""ImageUrl""             character varying(1024) NULL,
                    ADD COLUMN IF NOT EXISTS ""Icon""                 character varying(100) NULL,
                    ADD COLUMN IF NOT EXISTS ""DisplayOrder""         integer NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS ""MetaTitle""            character varying(200) NULL,
                    ADD COLUMN IF NOT EXISTS ""MetaDescription""      character varying(500) NULL,
                    ADD COLUMN IF NOT EXISTS ""IsSerialTracked""      boolean NOT NULL DEFAULT false,
                    ADD COLUMN IF NOT EXISTS ""VatReductionEligible"" boolean NOT NULL DEFAULT true;");

            // FK tự tham chiếu. Restrict: xoá danh mục cha không được kéo theo cả nhánh con.
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conname = 'fk_categories_parent_id'
                          AND conrelid = 'public.""Categories""'::regclass
                    ) THEN
                        ALTER TABLE public.""Categories""
                            ADD CONSTRAINT fk_categories_parent_id
                            FOREIGN KEY (""ParentId"") REFERENCES public.""Categories"" (""Id"")
                            ON DELETE RESTRICT;
                    END IF;
                END $$;");

            migrationBuilder.Sql(@"
                CREATE INDEX IF NOT EXISTS ix_categories_parent_id_display_order
                    ON public.""Categories"" (""ParentId"", ""DisplayOrder"");");

            // ---------------------------------------------------------------- Brands
            migrationBuilder.Sql(@"
                ALTER TABLE public.""Brands""
                    ADD COLUMN IF NOT EXISTS ""Slug""         character varying(300) NULL,
                    ADD COLUMN IF NOT EXISTS ""LogoUrl""      character varying(1024) NULL,
                    ADD COLUMN IF NOT EXISTS ""Website""      character varying(500) NULL,
                    ADD COLUMN IF NOT EXISTS ""DisplayOrder"" integer NOT NULL DEFAULT 0;");

            // ---------------------------------------------------------------- Products (D08)
            migrationBuilder.Sql(@"
                ALTER TABLE public.""Products""
                    ADD COLUMN IF NOT EXISTS ""WarrantyMonths""   integer NULL,
                    ADD COLUMN IF NOT EXISTS ""IsReturnExcluded"" boolean NOT NULL DEFAULT false;");

            // ---------------------------------------------------------------- slug backfill
            // Chỉ các hàng ĐANG HOẠT ĐỘNG (10 danh mục thật + 10 thương hiệu thật). 8 hàng rác
            // bị xoá cứng ở W0-6 chứ không đặt lại tên (D03) nên không đụng tới ở đây.
            // Quy tắc chuẩn hoá khớp SlugGenerator.Generate: lower -> đ->d -> bỏ dấu ->
            // bỏ ký tự ngoài [a-z0-9 -] -> gộp khoảng trắng/gạch -> trim gạch.
            migrationBuilder.Sql(@"
                DO $$
                DECLARE
                    r          RECORD;
                    base_slug  text;
                    candidate  text;
                    n          integer;
                BEGIN
                    FOR r IN
                        SELECT ""Id"", ""Name""
                        FROM public.""Categories""
                        WHERE ""IsActive"" = TRUE AND coalesce(""Slug"", '') = ''
                        ORDER BY ""Name""
                    LOOP
                        base_slug := btrim(
                            regexp_replace(
                                regexp_replace(
                                    public.qh_unaccent_immutable(replace(lower(r.""Name""), 'đ', 'd')),
                                    '[^a-z0-9[:space:]-]', '', 'g'),
                                '[[:space:]-]+', '-', 'g'),
                            '-');
                        CONTINUE WHEN base_slug = '';

                        candidate := base_slug;
                        n := 1;
                        WHILE EXISTS (
                            SELECT 1 FROM public.""Categories""
                            WHERE ""Slug"" = candidate AND ""Id"" <> r.""Id""
                        ) LOOP
                            n := n + 1;
                            candidate := base_slug || '-' || n;
                        END LOOP;

                        UPDATE public.""Categories""
                        SET ""Slug"" = candidate, ""UpdatedAt"" = (now() AT TIME ZONE 'utc')
                        WHERE ""Id"" = r.""Id"";
                    END LOOP;
                END $$;");

            migrationBuilder.Sql(@"
                DO $$
                DECLARE
                    r          RECORD;
                    base_slug  text;
                    candidate  text;
                    n          integer;
                BEGIN
                    FOR r IN
                        SELECT ""Id"", ""Name""
                        FROM public.""Brands""
                        WHERE ""IsActive"" = TRUE AND coalesce(""Slug"", '') = ''
                        ORDER BY ""Name""
                    LOOP
                        base_slug := btrim(
                            regexp_replace(
                                regexp_replace(
                                    public.qh_unaccent_immutable(replace(lower(r.""Name""), 'đ', 'd')),
                                    '[^a-z0-9[:space:]-]', '', 'g'),
                                '[[:space:]-]+', '-', 'g'),
                            '-');
                        CONTINUE WHEN base_slug = '';

                        candidate := base_slug;
                        n := 1;
                        WHILE EXISTS (
                            SELECT 1 FROM public.""Brands""
                            WHERE ""Slug"" = candidate AND ""Id"" <> r.""Id""
                        ) LOOP
                            n := n + 1;
                            candidate := base_slug || '-' || n;
                        END LOOP;

                        UPDATE public.""Brands""
                        SET ""Slug"" = candidate, ""UpdatedAt"" = (now() AT TIME ZONE 'utc')
                        WHERE ""Id"" = r.""Id"";
                    END LOOP;
                END $$;");

            // Unique có filter: các hàng rác (Slug NULL/rỗng) không chặn nhau.
            // Đặt SAU backfill để không có nguy cơ vướng dữ liệu cũ.
            migrationBuilder.Sql(@"
                CREATE UNIQUE INDEX IF NOT EXISTS uq_brands_slug
                    ON public.""Brands"" (""Slug"")
                    WHERE ""Slug"" IS NOT NULL AND ""Slug"" <> '';");

            migrationBuilder.Sql(@"
                CREATE INDEX IF NOT EXISTS ix_brands_display_order
                    ON public.""Brands"" (""DisplayOrder"");");

            // ---------------------------------------------------------------- search indexes
            // GIN trigram trên CHÍNH biểu thức mà ApplySearch sinh ra
            // (ILIKE '%...%' trên qh_unaccent_immutable(cột)), nếu không thì index vô dụng.
            migrationBuilder.Sql(@"
                CREATE INDEX IF NOT EXISTS ix_products_name_trgm
                    ON public.""Products"" USING gin (public.qh_unaccent_immutable(""Name"") gin_trgm_ops);");

            migrationBuilder.Sql(@"
                CREATE INDEX IF NOT EXISTS ix_products_sku_trgm
                    ON public.""Products"" USING gin (public.qh_unaccent_immutable(""Sku"") gin_trgm_ops);");

            migrationBuilder.Sql(@"
                CREATE INDEX IF NOT EXISTS ix_products_description_trgm
                    ON public.""Products"" USING gin (public.qh_unaccent_immutable(""Description"") gin_trgm_ops);");

            // D03: importer khớp danh mục/thương hiệu trên unaccent(lower(Name)) trước, slug sau.
            migrationBuilder.Sql(@"
                CREATE INDEX IF NOT EXISTS ix_categories_name_unaccent
                    ON public.""Categories"" (public.qh_unaccent_immutable(lower(""Name"")));");

            migrationBuilder.Sql(@"
                CREATE INDEX IF NOT EXISTS ix_brands_name_unaccent
                    ON public.""Brands"" (public.qh_unaccent_immutable(lower(""Name"")));");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS public.ix_brands_name_unaccent;");
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS public.ix_categories_name_unaccent;");
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS public.ix_products_description_trgm;");
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS public.ix_products_sku_trgm;");
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS public.ix_products_name_trgm;");
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS public.ix_brands_display_order;");
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS public.uq_brands_slug;");
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS public.ix_categories_parent_id_display_order;");

            migrationBuilder.Sql(@"
                ALTER TABLE public.""Categories"" DROP CONSTRAINT IF EXISTS fk_categories_parent_id;");

            migrationBuilder.Sql(@"
                ALTER TABLE public.""Products""
                    DROP COLUMN IF EXISTS ""WarrantyMonths"",
                    DROP COLUMN IF EXISTS ""IsReturnExcluded"";");

            migrationBuilder.Sql(@"
                ALTER TABLE public.""Brands""
                    DROP COLUMN IF EXISTS ""Slug"",
                    DROP COLUMN IF EXISTS ""LogoUrl"",
                    DROP COLUMN IF EXISTS ""Website"",
                    DROP COLUMN IF EXISTS ""DisplayOrder"";");

            migrationBuilder.Sql(@"
                ALTER TABLE public.""Categories""
                    DROP COLUMN IF EXISTS ""ParentId"",
                    DROP COLUMN IF EXISTS ""ImageUrl"",
                    DROP COLUMN IF EXISTS ""Icon"",
                    DROP COLUMN IF EXISTS ""DisplayOrder"",
                    DROP COLUMN IF EXISTS ""MetaTitle"",
                    DROP COLUMN IF EXISTS ""MetaDescription"",
                    DROP COLUMN IF EXISTS ""IsSerialTracked"",
                    DROP COLUMN IF EXISTS ""VatReductionEligible"";");

            migrationBuilder.Sql(@"DROP FUNCTION IF EXISTS public.qh_unaccent_immutable(text);");
            // Không DROP EXTENSION: module khác có thể đang dùng unaccent/pg_trgm.
        }
    }
}
