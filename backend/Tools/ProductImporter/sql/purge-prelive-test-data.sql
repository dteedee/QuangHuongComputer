-- ============================================================================
-- purge-prelive-test-data.sql   (decision D03, wave 0 / W0-6)
--
-- ONE guarded, pre-live hard purge of the demo catalogue and every test transaction,
-- so the real 68-SKU catalogue can be imported into a clean database.
--
-- Run:
--   docker exec -i quanghuong-postgres psql -U postgres -d <db> -v ON_ERROR_STOP=1 \
--     -v confirm_prelive=NO -v cutoff="'2026-09-18'" -f - < purge-prelive-test-data.sql
--
-- Any error aborts before COMMIT, so the whole thing rolls back.
--
-- The cut-off is INCLUSIVE of the cut-off day (`< DATE :cutoff + 1`). `< DATE :cutoff` was
-- wrong: a nightly job had already written 7 crm."CustomerAnalytics" rows at 02:00 on the day
-- of the run, the purge left them behind, and the section-7 assert caught it (once fixed).
--
-- Sections 1-3 are WHOLE-TABLE deletes behind a date cut-off AND behind confirm_prelive=YES.
-- They run exactly once, at the wave-0 gate. Without the date cut-off, re-running this after
-- go-live would silently delete real warranties / POs / GRNs that the guard does not look at
-- (the guard only inspects invoices, payments, ledger, orders and users).
-- Sections 4-6 only match the `AUDIT`/`GATE-`/`E2E-` prefixes, `@example.com`, a blank key and
-- rows belonging to the products those prefixes select, so they are harmless to re-run after
-- every later gate. Anything that is a WHOLE-TABLE delete stays inside a `confirm_prelive`
-- block, wherever it sits in the file - an ungated whole-table delete in section 5 would
-- destroy live customer data (saved PC builds, bundles, embeddings) on the next re-run.
--
-- Why "deactivate" was rejected: `uq_products_slug` covers inactive rows and two demo slugs
-- collide exactly with dataset slugs, and `CatalogDbSeeder` re-creates the demo products on the
-- next API start for any active category with no active product. Soft-deleting cannot work.
-- ============================================================================
BEGIN;

DO $$ BEGIN  -- GUARD, fail-closed: any sign of real business data stops the purge.
 IF (SELECT count(*) FROM "Invoices")+(SELECT count(*) FROM "InvoiceLine")+(SELECT count(*) FROM "Payment")
   +(SELECT count(*) FROM "PaymentApplications")+(SELECT count(*) FROM "LedgerEntry")+(SELECT count(*) FROM "Accounts")
   +(SELECT count(*) FROM "Expenses")+(SELECT count(*) FROM "LandedCosts")+(SELECT count(*) FROM "ShiftTransaction")
   +(SELECT count(*) FROM "DeliveryNotes")+(SELECT count(*) FROM content."PromotionUsages")
   +(SELECT count(*) FROM payments."SePayTransactions") > 0
 OR EXISTS (SELECT 1 FROM "Orders" WHERE "PaymentStatus"<>0 OR "PaidAt" IS NOT NULL OR (COALESCE("CustomerEmail",'')<>'' AND "CustomerEmail" NOT ILIKE '%@example.com'))
 -- A user outside the two dev domains only blocks the purge once it has BEHAVED like a real
 -- customer. A freshly created staff account must not lock the script out forever.
 OR EXISTS (SELECT 1 FROM "AspNetUsers" u
            WHERE COALESCE(u."Email",'') NOT ILIKE '%@example.com' AND COALESCE(u."Email",'') NOT ILIKE '%@quanghuong.com'
              -- Orders/Carts hold CustomerId as uuid while AspNetUsers.Id is text, and the
              -- loyalty column is UserId, not CustomerId. Both were wrong in the decision
              -- draft and made the guard abort with "operator does not exist: uuid = text".
              AND (EXISTS (SELECT 1 FROM "Orders" o WHERE o."CustomerId"::text = u."Id")
                OR EXISTS (SELECT 1 FROM "Carts" c WHERE c."CustomerId"::text = u."Id")
                OR EXISTS (SELECT 1 FROM "LoyaltyAccounts" l WHERE l."UserId" = u."Id")))
 THEN RAISE EXCEPTION 'D03 guard: DB co du lieu that - KHONG purge'; END IF; END $$;

-- ===== SECTIONS 1-3: once, at the gate; skipped entirely unless confirm_prelive is yes =====
\if :confirm_prelive
-- 1 Sales (children first: OrderItem->Orders and CartItem->Carts are RESTRICT)
DELETE FROM "OrderItem" WHERE "OrderId" IN (SELECT "Id" FROM "Orders" WHERE "CreatedAt" < DATE :cutoff + 1);
DELETE FROM "OrderHistories" WHERE "CreatedAt" < DATE :cutoff + 1;
DELETE FROM "ReturnRequests" WHERE "CreatedAt" < DATE :cutoff + 1;
DELETE FROM "Orders" WHERE "CreatedAt" < DATE :cutoff + 1;
DELETE FROM "CartItem" WHERE "CartId" IN (SELECT "Id" FROM "Carts" WHERE "CreatedAt" < DATE :cutoff + 1);  -- CartItem has no CreatedAt
DELETE FROM "Carts" WHERE "CreatedAt" < DATE :cutoff + 1;
DELETE FROM "CheckoutSessions" WHERE "CreatedAt" < DATE :cutoff + 1;
DELETE FROM "WishlistItems" WHERE "CreatedAt" < DATE :cutoff + 1;
DELETE FROM "LoyaltyTransactions" WHERE "CreatedAt" < DATE :cutoff + 1;
DELETE FROM "LoyaltyAccounts" WHERE "CreatedAt" < DATE :cutoff + 1;
-- 2 Warehouse / purchasing (GRNItems, PurchaseOrderItem, PurchaseRequisitionItems cascade)
DELETE FROM "StockReservations" WHERE "CreatedAt" < DATE :cutoff + 1;
DELETE FROM "StockMovements"    WHERE "CreatedAt" < DATE :cutoff + 1;
DELETE FROM "GoodsReceivedNotes" WHERE "CreatedAt" < DATE :cutoff + 1;
DELETE FROM "POApprovalRequests" WHERE "CreatedAt" < DATE :cutoff + 1;
DELETE FROM "PurchaseOrders"     WHERE "CreatedAt" < DATE :cutoff + 1;
DELETE FROM "PurchaseRequisitions" WHERE "CreatedAt" < DATE :cutoff + 1;
-- 3 Warranty / repair / CRM / chat (children of WorkOrders, Leads, CustomerAnalytics, Conversations cascade)
DELETE FROM "Claims" WHERE "CreatedAt" < DATE :cutoff + 1;
DELETE FROM "Rmas" WHERE "CreatedAt" < DATE :cutoff + 1;
DELETE FROM "ProductWarranties" WHERE "CreatedAt" < DATE :cutoff + 1;
DELETE FROM "ServiceBookings" WHERE "CreatedAt" < DATE :cutoff + 1;
DELETE FROM "WorkOrders" WHERE "CreatedAt" < DATE :cutoff + 1;
DELETE FROM crm."Leads" WHERE "CreatedAt" < DATE :cutoff + 1;
DELETE FROM crm."CustomerAnalytics" WHERE "CreatedAt" < DATE :cutoff + 1;
DELETE FROM communication."Conversations" WHERE "CreatedAt" < DATE :cutoff + 1;
DELETE FROM communication."NotificationLogs" WHERE "CreatedAt" < DATE :cutoff + 1;
\endif

-- ===== SECTIONS 4-6: prefix / @example.com only -> safe to re-run after every gate =====
-- 4 Junk master data, matched by prefix, so it stays safe once KHO-CHINH and real suppliers exist
DELETE FROM "Warehouses"      WHERE "Code" ~* '^(AUDIT|GATE-|E2E-)';
DELETE FROM "Suppliers"       WHERE "Name" ~* '^(AUDIT|GATE-|E2E-)';
DELETE FROM "Technicians"     WHERE "Name" ~* '^(AUDIT|GATE-|E2E-)';
DELETE FROM "ReturnPolicies"  WHERE "Name" ~* '^(AUDIT|GATE-|E2E-)';
DELETE FROM "POApprovalRules" WHERE "Name" ~* '^(AUDIT|GATE-|E2E-)';
DELETE FROM hr."AttendanceRecords" WHERE "EmployeeId" IN (SELECT "Id" FROM hr."Employees" WHERE "Email" ILIKE '%@example.com');
DELETE FROM hr."Employees" WHERE "Email" ILIKE '%@example.com';                       -- Payrolls cascade
DELETE FROM hr."PayrollRuns" r WHERE r."CreatedAt" < DATE :cutoff + 1 AND NOT EXISTS (SELECT 1 FROM hr."Payrolls" p WHERE p."PayrollRunId" = r."Id");
DELETE FROM config."Configurations" WHERE btrim(COALESCE("Key",'')) = '';

-- 5 Catalog. The auto-SKU pattern MUST carry the date cut-off: an admin creating a product
--   next year also gets a QH-<8hex> SKU, and this file must never delete that.
--   5a BEFORE Products: the only two RESTRICT foreign keys into "Products" from outside
--      Catalog-core (SavedPcBuildItems.ProductId, ProductBundleItems.ProductId - everything
--      else cascades). Both tables are empty today, but W2-9's PC builder and bundles write
--      here, and one row would abort the transaction with a raw FK error instead of a readable
--      message. SCOPED to the products this file is about to delete: a whole-table DELETE here
--      is NOT safe to re-run, because sections 4-6 run without confirm_prelive after every
--      later gate and would wipe live customer builds and live bundles.
DELETE FROM "SavedPcBuildItems" WHERE "ProductId" IN (
  SELECT "Id" FROM "Products" WHERE ("Sku" ~ '^QH-[0-9A-F]{8}$' AND "CreatedAt" < DATE :cutoff + 1) OR "Sku" ~* '^(AUDIT|GATE-|E2E-)');
DELETE FROM "ProductBundleItems" WHERE "ProductId" IN (
  SELECT "Id" FROM "Products" WHERE ("Sku" ~ '^QH-[0-9A-F]{8}$' AND "CreatedAt" < DATE :cutoff + 1) OR "Sku" ~* '^(AUDIT|GATE-|E2E-)');
\if :confirm_prelive
--      The empty parent rows and the derived AI caches belong to the ONE-TIME pre-live purge
--      only. ai."ProductEmbeddings" / ai."SearchEntries" have no foreign key to "Products", so
--      they never block the delete below - they are cleared because they are stale derived
--      data, and clearing them unconditionally would destroy live embeddings on a re-run.
DELETE FROM "SavedPcBuildItems"; DELETE FROM "SavedPcBuilds";
DELETE FROM "ProductBundleItems"; DELETE FROM "ProductBundles";
DELETE FROM ai."ProductEmbeddings"; DELETE FROM ai."SearchEntries";   -- derived caches; rebuilt after import
\endif
DELETE FROM "Products" WHERE ("Sku" ~ '^QH-[0-9A-F]{8}$' AND "CreatedAt" < DATE :cutoff + 1) OR "Sku" ~* '^(AUDIT|GATE-|E2E-)';
DELETE FROM "InventoryItems" i WHERE NOT EXISTS (SELECT 1 FROM "Products" p WHERE p."Id" = i."ProductId");   -- incl. the 0000... phantoms
--   5b Categories / brands: three relationships have NO foreign key (spec group, menu item,
--      and the UUIDs embedded in content."HomepageSections"."Configuration"), so each one is
--      re-checked by hand before a row is allowed to go.
DELETE FROM "Categories" c WHERE (btrim(c."Name")='' OR c."Name" ~* '^(test|audit|gate-|e2e-|category[0-9])')
  AND NOT EXISTS (SELECT 1 FROM "Products" p WHERE p."CategoryId"=c."Id")
  AND NOT EXISTS (SELECT 1 FROM "SpecificationGroups" g WHERE g."CategoryId"=c."Id")
  AND NOT EXISTS (SELECT 1 FROM content."MenuItem" m WHERE m."CategoryId"=c."Id")
  AND NOT EXISTS (SELECT 1 FROM content."HomepageSections" h WHERE h."Configuration" LIKE '%'||c."Id"::text||'%');
DELETE FROM "Brands" b     WHERE (btrim(b."Name")='' OR b."Name" ~* '^(test|audit|gate-|e2e-|brand[0-9])')
  AND NOT EXISTS (SELECT 1 FROM "Products" p WHERE p."BrandId"=b."Id")
  AND NOT EXISTS (SELECT 1 FROM content."HomepageSections" h WHERE h."Configuration" LIKE '%'||b."Id"::text||'%');

-- 6 Test users (roles, refresh/reset tokens, profile, addresses cascade). The demo storefront
--   account customer@example.com is kept on purpose.
DELETE FROM "AspNetUsers" WHERE "Email" ILIKE '%@example.com' AND lower("Email") <> 'customer@example.com';

-- 7 COMPLETION ASSERT, fail-closed: every table outside the keep-list must be empty.
--   It belongs to the ONE-TIME purge, so it is gated on confirm_prelive as well: once the
--   importer has run, Warehouses / InventoryItems / ProductMedias legitimately hold rows and
--   an ungated assert would fail every later re-run of sections 4-6.
\if :confirm_prelive
--   This turns "we forgot a table" (DeliveryNotes, ShiftSessions, SerialNumbers,
--   StockAdjustments, StockTransfers, InventoryCountSessions, PurchaseReturns,
--   SupplierQuotations, RequestForQuotations, RepairRequests, LoanerDevices,
--   InstallmentApplications, crm.*, UserSessions, TwoFactorConfigs, CustomerAddresses,
--   config.StoreEmployees/StoreWarehouses, hr.* - all zero rows today and none of them
--   protected by a foreign key) from a silent orphan into a rollback.
DO $$
DECLARE r record; bad text := ''; has_rows boolean;
BEGIN
  FOR r IN SELECT n.nspname AS s, c.relname AS t FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relkind='r' AND n.nspname IN ('public','hr','crm','config','content','communication','payments','ai')
      AND (n.nspname||'.'||c.relname) NOT IN (
        'public.AspNetUsers','public.AspNetRoles','public.AspNetRoleClaims','public.AspNetUserRoles',
        'public.AspNetUserClaims','public.AspNetUserLogins','public.AspNetUserTokens','public.RefreshTokens',
        'public.PasswordResetTokens','public.UserProfiles','public.IdentityCustomerAddresses',
        'public.AuditLogs','public.__EFMigrationsHistory',
        'public.Categories','public.Brands','public.Products','public.SpecificationGroups','public.SpecificationAttributes',
        'public.ProductOptionTypes','public.ProductOptionValues','public.ExpenseCategories','public.Policies','public.SlaPolicies',
        'config.Configurations','config.BackofficeMenuGroups','config.BackofficeMenuItems','config.ReportDefinitions',
        'config.TableViewDefinitions','config.Stores','config.CustomFieldDefinitions','config.FormDefinitions',
        'config.AutomationRules','config.SavedReportPresets',
        'content.Menus','content.MenuItem','content.Pages','content.posts','content.HomepageSections','content.Banners',
        'communication.NotificationTemplates','communication.NewsletterSubscriptions',
        'hr.JobListings','hr.AllowanceTypes','hr.AttendanceRules','hr.Shifts','crm.LeadPipelineStages')
  LOOP
    -- `EXECUTE ... ; IF FOUND` does NOT work: PL/pgSQL documents that EXECUTE leaves FOUND
    -- untouched, so the original form of this assert silently passed on every table and was
    -- no safety net at all. Verified on qh_w06_test 2026-09-18. Read the answer INTO instead.
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I.%I)', r.s, r.t) INTO has_rows;
    IF has_rows THEN bad := bad || r.s || '.' || r.t || ' '; END IF;
  END LOOP;
  IF bad <> '' THEN RAISE EXCEPTION 'D03: bang con du lieu chua duoc purge -> %', bad; END IF;
END $$;
\endif

COMMIT;
