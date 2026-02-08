-- ================================================
-- DATABASE INITIALIZATION SCRIPT
-- Tạo tất cả schemas cho hệ thống Quang Hưởng
-- ================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For full-text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For indexing

-- ================================================
-- CREATE SCHEMAS
-- ================================================

-- Identity & Authentication
CREATE SCHEMA IF NOT EXISTS identity;
COMMENT ON SCHEMA identity IS 'User authentication, roles, permissions';

-- Catalog Management
CREATE SCHEMA IF NOT EXISTS catalog;
COMMENT ON SCHEMA catalog IS 'Products, categories, brands, attributes';

-- Sales & Orders
CREATE SCHEMA IF NOT EXISTS sales;
COMMENT ON SCHEMA sales IS 'Orders, carts, POS transactions';

-- Inventory Management
CREATE SCHEMA IF NOT EXISTS inventory;
COMMENT ON SCHEMA inventory IS 'Stock, warehouses, purchase orders, suppliers';

-- Repair Services
CREATE SCHEMA IF NOT EXISTS repair;
COMMENT ON SCHEMA repair IS 'Repair requests, technician assignments, job tracking';

-- Warranty Management
CREATE SCHEMA IF NOT EXISTS warranty;
COMMENT ON SCHEMA warranty IS 'Warranty policies, claims, product warranties';

-- Accounting & Finance
CREATE SCHEMA IF NOT EXISTS accounting;
COMMENT ON SCHEMA accounting IS 'Invoices, payments, financial transactions';

-- Human Resources
CREATE SCHEMA IF NOT EXISTS hr;
COMMENT ON SCHEMA hr IS 'Employees, timesheets, payroll, shifts';

-- Content Management
CREATE SCHEMA IF NOT EXISTS content;
COMMENT ON SCHEMA content IS 'CMS, banners, menus, pages, coupons';

-- Communication
CREATE SCHEMA IF NOT EXISTS communication;
COMMENT ON SCHEMA communication IS 'Chat, notifications, messages';

-- Payment Processing
CREATE SCHEMA IF NOT EXISTS payments;
COMMENT ON SCHEMA payments IS 'Payment transactions, gateways, methods';

-- System Configuration
CREATE SCHEMA IF NOT EXISTS system_config;
COMMENT ON SCHEMA system_config IS 'System settings, configurations';

-- AI & Analytics
CREATE SCHEMA IF NOT EXISTS ai;
COMMENT ON SCHEMA ai IS 'AI models, chatbot conversations, analytics';

-- ================================================
-- GRANT PERMISSIONS
-- ================================================

-- Grant usage on all schemas to postgres user
GRANT USAGE ON SCHEMA identity TO postgres;
GRANT USAGE ON SCHEMA catalog TO postgres;
GRANT USAGE ON SCHEMA sales TO postgres;
GRANT USAGE ON SCHEMA inventory TO postgres;
GRANT USAGE ON SCHEMA repair TO postgres;
GRANT USAGE ON SCHEMA warranty TO postgres;
GRANT USAGE ON SCHEMA accounting TO postgres;
GRANT USAGE ON SCHEMA hr TO postgres;
GRANT USAGE ON SCHEMA content TO postgres;
GRANT USAGE ON SCHEMA communication TO postgres;
GRANT USAGE ON SCHEMA payments TO postgres;
GRANT USAGE ON SCHEMA system_config TO postgres;
GRANT USAGE ON SCHEMA ai TO postgres;

-- Grant all privileges
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA identity TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA catalog TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA sales TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA inventory TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA repair TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA warranty TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA accounting TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA hr TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA content TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA communication TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA payments TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA system_config TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ai TO postgres;

-- ================================================
-- CREATE AUDIT TABLE (Shared across all schemas)
-- ================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    schema_name VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
    user_id VARCHAR(450),
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_schema_table (schema_name, table_name),
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_created (created_at DESC)
);

COMMENT ON TABLE public.audit_logs IS 'Centralized audit log for all schemas';

-- ================================================
-- UTILITY FUNCTIONS
-- ================================================

-- Function to get database stats
CREATE OR REPLACE FUNCTION public.get_database_stats()
RETURNS TABLE (
    schema_name TEXT,
    table_count BIGINT,
    total_rows BIGINT,
    total_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.nspname::TEXT as schema_name,
        COUNT(DISTINCT c.oid)::BIGINT as table_count,
        SUM(c.reltuples)::BIGINT as total_rows,
        pg_size_pretty(SUM(pg_total_relation_size(c.oid))) as total_size
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('identity', 'catalog', 'sales', 'inventory', 'repair',
                        'warranty', 'accounting', 'hr', 'content', 'communication',
                        'payments', 'system_config', 'ai')
      AND c.relkind = 'r'
    GROUP BY n.nspname
    ORDER BY total_rows DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_database_stats() IS 'Get statistics for all schemas';

-- ================================================
-- INITIALIZATION COMPLETE
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'Database initialization completed successfully!';
    RAISE NOTICE 'Created 13 schemas with proper permissions';
    RAISE NOTICE '==================================================';
END $$;
