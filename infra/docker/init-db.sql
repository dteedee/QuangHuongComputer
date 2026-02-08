-- ========================================
-- PostgreSQL Database Initialization Script
-- Quang Huong Computer
-- ========================================
-- This script runs automatically when database is created
-- Sets up proper collation and extensions
-- ========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- Trigram matching for fuzzy search
CREATE EXTENSION IF NOT EXISTS "unaccent";      -- Remove accents for search
CREATE EXTENSION IF NOT EXISTS "btree_gin";     -- GIN index for btree
CREATE EXTENSION IF NOT EXISTS "btree_gist";    -- GiST index for btree

-- ========================================
-- CREATE CASE-INSENSITIVE COLLATION
-- ========================================

-- Create a collation that ignores case for Vietnamese
CREATE COLLATION IF NOT EXISTS vietnamese_case_insensitive (
    provider = icu,
    locale = 'vi-VN@colStrength=primary',
    deterministic = false
);

-- Create a collation for case-insensitive English
CREATE COLLATION IF NOT EXISTS english_case_insensitive (
    provider = icu,
    locale = 'en-US@colStrength=primary',
    deterministic = false
);

-- ========================================
-- USEFUL FUNCTIONS
-- ========================================

-- Function to normalize Vietnamese text for search
CREATE OR REPLACE FUNCTION normalize_vietnamese(text TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN unaccent(lower(text));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function for case-insensitive comparison
CREATE OR REPLACE FUNCTION case_insensitive_equals(a TEXT, b TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN lower(a) = lower(b);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to create trigram index for fuzzy search
CREATE OR REPLACE FUNCTION create_trigram_index(
    table_name TEXT,
    column_name TEXT
) RETURNS VOID AS $$
DECLARE
    index_name TEXT;
BEGIN
    index_name := 'idx_' || table_name || '_' || column_name || '_trgm';
    
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON %I USING gin(%I gin_trgm_ops)',
        index_name,
        table_name,
        column_name
    );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- CREATE DATABASE SCHEMAS
-- ========================================

-- Create schemas for different services if they don't exist
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS sales;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS content;
CREATE SCHEMA IF NOT EXISTS communication;
CREATE SCHEMA IF NOT EXISTS accounting;
CREATE SCHEMA IF NOT EXISTS hr;
CREATE SCHEMA IF NOT EXISTS repair;
CREATE SCHEMA IF NOT EXISTS warranty;
CREATE SCHEMA IF NOT EXISTS payments;
CREATE SCHEMA IF NOT EXISTS ai;

-- Grant usage on all schemas to public
GRANT USAGE ON SCHEMA catalog TO PUBLIC;
GRANT USAGE ON SCHEMA sales TO PUBLIC;
GRANT USAGE ON SCHEMA inventory TO PUBLIC;
GRANT USAGE ON SCHEMA identity TO PUBLIC;
GRANT USAGE ON SCHEMA content TO PUBLIC;
GRANT USAGE ON SCHEMA communication TO PUBLIC;
GRANT USAGE ON SCHEMA accounting TO PUBLIC;
GRANT USAGE ON SCHEMA hr TO PUBLIC;
GRANT USAGE ON SCHEMA repair TO PUBLIC;
GRANT USAGE ON SCHEMA warranty TO PUBLIC;
GRANT USAGE ON SCHEMA payments TO PUBLIC;
GRANT USAGE ON SCHEMA ai TO PUBLIC;

-- ========================================
-- PERFORMANCE TUNING
-- ========================================

-- Increase work memory for complex queries
ALTER DATABASE quanghuong SET work_mem = '16MB';

-- Set maintenance work memory for index creation
ALTER DATABASE quanghuong SET maintenance_work_mem = '256MB';

-- Enable query logging (disable in production)
-- ALTER DATABASE quanghuong SET log_min_duration_statement = 1000;

-- ========================================
-- CREATE USEFUL VIEWS (deferred – tables created by EF migrations)
-- ========================================
-- Note: Views referencing application tables are created after migrations run.

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

-- Grant all permissions on all tables to admin
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA catalog TO admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA sales TO admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA inventory TO admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA identity TO admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA content TO admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA communication TO admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA accounting TO admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA hr TO admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA repair TO admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA warranty TO admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA payments TO admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ai TO admin;

-- Grant usage on all sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO admin;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA catalog TO admin;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA sales TO admin;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA inventory TO admin;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA identity TO admin;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA content TO admin;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA communication TO admin;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA accounting TO admin;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA hr TO admin;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA repair TO admin;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA warranty TO admin;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA payments TO admin;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA ai TO admin;

-- ========================================
-- CASE-INSENSITIVE SEARCH FUNCTIONS
-- ========================================
-- Note: Product-specific search functions are created after migrations run.

-- ========================================
-- END OF INIT SCRIPT
-- ========================================
