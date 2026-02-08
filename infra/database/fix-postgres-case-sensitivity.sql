-- ========================================
-- PostgreSQL Case-Sensitivity Fix Script
-- Quang Huong Computer Database
-- ========================================
-- This script fixes PostgreSQL case-sensitivity issues
-- by ensuring all identifiers use snake_case convention
-- and proper case-insensitive collation
-- ========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For trigram matching (fuzzy search)

-- ========================================
-- FUNCTIONS FOR CASE-INSENSITIVE SEARCH
-- ========================================

-- Function to create case-insensitive LIKE index
CREATE OR REPLACE FUNCTION create_case_insensitive_index(
    table_name TEXT,
    column_name TEXT,
    index_name TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    idx_name TEXT;
BEGIN
    IF index_name IS NULL THEN
        idx_name := 'idx_' || table_name || '_lower_' || column_name;
    ELSE
        idx_name := index_name;
    END IF;
    
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON %I (LOWER(%I))',
        idx_name,
        table_name,
        column_name
    );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- CATALOG SCHEMA MIGRATIONS
-- ========================================

-- Rename tables to snake_case if needed
DO $$
BEGIN
    -- Products table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Products') THEN
        ALTER TABLE "Products" RENAME TO products;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Categories') THEN
        ALTER TABLE "Categories" RENAME TO categories;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Brands') THEN
        ALTER TABLE "Brands" RENAME TO brands;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ProductReviews') THEN
        ALTER TABLE "ProductReviews" RENAME TO product_reviews;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ProductAttributes') THEN
        ALTER TABLE "ProductAttributes" RENAME TO product_attributes;
    END IF;
END $$;

-- Rename columns to snake_case in products table
DO $$
BEGIN
    -- Check if table exists and has old column names
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        -- Rename columns from PascalCase to snake_case
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'Sku') THEN
            ALTER TABLE products RENAME COLUMN "Sku" TO sku;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'OldPrice') THEN
            ALTER TABLE products RENAME COLUMN "OldPrice" TO old_price;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'CategoryId') THEN
            ALTER TABLE products RENAME COLUMN "CategoryId" TO category_id;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'BrandId') THEN
            ALTER TABLE products RENAME COLUMN "BrandId" TO brand_id;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'StockQuantity') THEN
            ALTER TABLE products RENAME COLUMN "StockQuantity" TO stock_quantity;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'CostPrice') THEN
            ALTER TABLE products RENAME COLUMN "CostPrice" TO cost_price;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'LowStockThreshold') THEN
            ALTER TABLE products RENAME COLUMN "LowStockThreshold" TO low_stock_threshold;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'ViewCount') THEN
            ALTER TABLE products RENAME COLUMN "ViewCount" TO view_count;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'SoldCount') THEN
            ALTER TABLE products RENAME COLUMN "SoldCount" TO sold_count;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'AverageRating') THEN
            ALTER TABLE products RENAME COLUMN "AverageRating" TO average_rating;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'ReviewCount') THEN
            ALTER TABLE products RENAME COLUMN "ReviewCount" TO review_count;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'PublishedAt') THEN
            ALTER TABLE products RENAME COLUMN "PublishedAt" TO published_at;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'DiscontinuedAt') THEN
            ALTER TABLE products RENAME COLUMN "DiscontinuedAt" TO discontinued_at;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'CreatedByUserId') THEN
            ALTER TABLE products RENAME COLUMN "CreatedByUserId" TO created_by_user_id;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'UpdatedByUserId') THEN
            ALTER TABLE products RENAME COLUMN "UpdatedByUserId" TO updated_by_user_id;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'MetaTitle') THEN
            ALTER TABLE products RENAME COLUMN "MetaTitle" TO meta_title;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'MetaDescription') THEN
            ALTER TABLE products RENAME COLUMN "MetaDescription" TO meta_description;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'MetaKeywords') THEN
            ALTER TABLE products RENAME COLUMN "MetaKeywords" TO meta_keywords;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'CanonicalUrl') THEN
            ALTER TABLE products RENAME COLUMN "CanonicalUrl" TO canonical_url;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'WarrantyInfo') THEN
            ALTER TABLE products RENAME COLUMN "WarrantyInfo" TO warranty_info;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'Specifications') THEN
            ALTER TABLE products RENAME COLUMN "Specifications" TO specifications;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'GalleryImages') THEN
            ALTER TABLE products RENAME COLUMN "GalleryImages" TO gallery_images;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'ImageUrl') THEN
            ALTER TABLE products RENAME COLUMN "ImageUrl" TO image_url;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'IsActive') THEN
            ALTER TABLE products RENAME COLUMN "IsActive" TO is_active;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'CreatedAt') THEN
            ALTER TABLE products RENAME COLUMN "CreatedAt" TO created_at;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'UpdatedAt') THEN
            ALTER TABLE products RENAME COLUMN "UpdatedAt" TO updated_at;
        END IF;
    END IF;
END $$;

-- ========================================
-- CREATE CASE-INSENSITIVE INDEXES
-- ========================================

-- Products table indexes
SELECT create_case_insensitive_index('products', 'name', 'idx_products_name_lower');
SELECT create_case_insensitive_index('products', 'sku', 'idx_products_sku_lower');

-- Categories table indexes
SELECT create_case_insensitive_index('categories', 'name', 'idx_categories_name_lower');

-- Brands table indexes
SELECT create_case_insensitive_index('brands', 'name', 'idx_brands_name_lower');

-- ========================================
-- SALES SCHEMA MIGRATIONS
-- ========================================

DO $$
BEGIN
    -- Rename tables to snake_case
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Orders') THEN
        ALTER TABLE "Orders" RENAME TO orders;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Carts') THEN
        ALTER TABLE "Carts" RENAME TO carts;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'OrderHistories') THEN
        ALTER TABLE "OrderHistories" RENAME TO order_histories;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ReturnRequests') THEN
        ALTER TABLE "ReturnRequests" RENAME TO return_requests;
    END IF;
END $$;

-- Rename columns in orders table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'OrderNumber') THEN
            ALTER TABLE orders RENAME COLUMN "OrderNumber" TO order_number;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'CustomerId') THEN
            ALTER TABLE orders RENAME COLUMN "CustomerId" TO customer_id;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'OrderDate') THEN
            ALTER TABLE orders RENAME COLUMN "OrderDate" TO order_date;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'SubtotalAmount') THEN
            ALTER TABLE orders RENAME COLUMN "SubtotalAmount" TO subtotal_amount;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'DiscountAmount') THEN
            ALTER TABLE orders RENAME COLUMN "DiscountAmount" TO discount_amount;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'TaxAmount') THEN
            ALTER TABLE orders RENAME COLUMN "TaxAmount" TO tax_amount;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'TotalAmount') THEN
            ALTER TABLE orders RENAME COLUMN "TotalAmount" TO total_amount;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'ShippingAmount') THEN
            ALTER TABLE orders RENAME COLUMN "ShippingAmount" TO shipping_amount;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'TaxRate') THEN
            ALTER TABLE orders RENAME COLUMN "TaxRate" TO tax_rate;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'ShippingAddress') THEN
            ALTER TABLE orders RENAME COLUMN "ShippingAddress" TO shipping_address;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'ConfirmedAt') THEN
            ALTER TABLE orders RENAME COLUMN "ConfirmedAt" TO confirmed_at;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'ShippedAt') THEN
            ALTER TABLE orders RENAME COLUMN "ShippedAt" TO shipped_at;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'DeliveredAt') THEN
            ALTER TABLE orders RENAME COLUMN "DeliveredAt" TO delivered_at;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'CompletedAt') THEN
            ALTER TABLE orders RENAME COLUMN "CompletedAt" TO completed_at;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'CancelledAt') THEN
            ALTER TABLE orders RENAME COLUMN "CancelledAt" TO cancelled_at;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'CancellationReason') THEN
            ALTER TABLE orders RENAME COLUMN "CancellationReason" TO cancellation_reason;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'InternalNotes') THEN
            ALTER TABLE orders RENAME COLUMN "InternalNotes" TO internal_notes;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'CustomerIp') THEN
            ALTER TABLE orders RENAME COLUMN "CustomerIp" TO customer_ip;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'CustomerUserAgent') THEN
            ALTER TABLE orders RENAME COLUMN "CustomerUserAgent" TO customer_user_agent;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'SourceId') THEN
            ALTER TABLE orders RENAME COLUMN "SourceId" TO source_id;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'AffiliateId') THEN
            ALTER TABLE orders RENAME COLUMN "AffiliateId" TO affiliate_id;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'DeliveryTrackingNumber') THEN
            ALTER TABLE orders RENAME COLUMN "DeliveryTrackingNumber" TO delivery_tracking_number;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'DeliveryCarrier') THEN
            ALTER TABLE orders RENAME COLUMN "DeliveryCarrier" TO delivery_carrier;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'RetryCount') THEN
            ALTER TABLE orders RENAME COLUMN "RetryCount" TO retry_count;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'FailureReason') THEN
            ALTER TABLE orders RENAME COLUMN "FailureReason" TO failure_reason;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'PaidAt') THEN
            ALTER TABLE orders RENAME COLUMN "PaidAt" TO paid_at;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'FulfilledAt') THEN
            ALTER TABLE orders RENAME COLUMN "FulfilledAt" TO fulfilled_at;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'IsActive') THEN
            ALTER TABLE orders RENAME COLUMN "IsActive" TO is_active;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'CreatedAt') THEN
            ALTER TABLE orders RENAME COLUMN "CreatedAt" TO created_at;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'UpdatedAt') THEN
            ALTER TABLE orders RENAME COLUMN "UpdatedAt" TO updated_at;
        END IF;
    END IF;
END $$;

-- Case-insensitive indexes for orders
SELECT create_case_insensitive_index('orders', 'order_number', 'idx_orders_order_number_lower');

-- ========================================
-- INVENTORY SCHEMA MIGRATIONS
-- ========================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'InventoryItems') THEN
        ALTER TABLE "InventoryItems" RENAME TO inventory_items;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Suppliers') THEN
        ALTER TABLE "Suppliers" RENAME TO suppliers;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PurchaseOrders') THEN
        ALTER TABLE "PurchaseOrders" RENAME TO purchase_orders;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'StockTransfers') THEN
        ALTER TABLE "StockTransfers" RENAME TO stock_transfers;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'StockAdjustments') THEN
        ALTER TABLE "StockAdjustments" RENAME TO stock_adjustments;
    END IF;
END $$;

-- Rename columns in inventory_items
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_items') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'ProductId') THEN
            ALTER TABLE inventory_items RENAME COLUMN "ProductId" TO product_id;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'WarehouseId') THEN
            ALTER TABLE inventory_items RENAME COLUMN "WarehouseId" TO warehouse_id;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'QuantityOnHand') THEN
            ALTER TABLE inventory_items RENAME COLUMN "QuantityOnHand" TO quantity_on_hand;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'ReorderLevel') THEN
            ALTER TABLE inventory_items RENAME COLUMN "ReorderLevel" TO reorder_level;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'ReservedQuantity') THEN
            ALTER TABLE inventory_items RENAME COLUMN "ReservedQuantity" TO reserved_quantity;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'AverageCost') THEN
            ALTER TABLE inventory_items RENAME COLUMN "AverageCost" TO average_cost;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'LastStockUpdate') THEN
            ALTER TABLE inventory_items RENAME COLUMN "LastStockUpdate" TO last_stock_update;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'LowStockThreshold') THEN
            ALTER TABLE inventory_items RENAME COLUMN "LowStockThreshold" TO low_stock_threshold;
        END IF;
    END IF;
END $$;

-- ========================================
-- IDENTITY SCHEMA MIGRATIONS
-- ========================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'UserProfiles') THEN
        ALTER TABLE "UserProfiles" RENAME TO user_profiles;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'CustomerAddresses') THEN
        ALTER TABLE "CustomerAddresses" RENAME TO customer_addresses;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PasswordResetTokens') THEN
        ALTER TABLE "PasswordResetTokens" RENAME TO password_reset_tokens;
    END IF;
END $$;

-- ========================================
-- CONTENT SCHEMA MIGRATIONS
-- ========================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'CMSPages') THEN
        ALTER TABLE "CMSPages" RENAME TO cms_pages;
    END IF;
END $$;

-- ========================================
-- HR SCHEMA MIGRATIONS
-- ========================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ShiftAssignments') THEN
        ALTER TABLE "ShiftAssignments" RENAME TO shift_assignments;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'LeaveRequests') THEN
        ALTER TABLE "LeaveRequests" RENAME TO leave_requests;
    END IF;
END $$;

-- ========================================
-- CREATE TRIGRAM INDEXES FOR FUZZY SEARCH
-- ========================================

-- Products name trigram index (for LIKE searches)
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin(name gin_trgm_ops);

-- Categories name trigram index
CREATE INDEX IF NOT EXISTS idx_categories_name_trgm ON categories USING gin(name gin_trgm_ops);

-- ========================================
-- CREATE FULL-TEXT SEARCH INDEXES
-- ========================================

-- Products full-text search
CREATE INDEX IF NOT EXISTS idx_products_name_fts ON products USING gin(to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS idx_products_description_fts ON products USING gin(to_tsvector('simple', description));

-- ========================================
-- VERIFY MIGRATIONS
-- ========================================

-- Show all tables
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY tablename;

-- Show all indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY tablename, indexname;

-- ========================================
-- END OF SCRIPT
-- ========================================
