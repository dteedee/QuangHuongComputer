-- ============================================================================
-- Database initialisation for Quang Huong Computer.
--
-- This file runs ONCE, by the PostgreSQL image's docker-entrypoint-initdb.d
-- hook, against a brand-new data directory. It must therefore do the one thing
-- that EF Core migrations cannot do for themselves: install the extensions the
-- migrations and the storefront queries depend on.
--
-- Everything else - schemas, tables, indexes, grants - belongs to migrations.
-- Run them with:
--     dotnet ApiGateway.dll db migrate
--     dotnet ApiGateway.dll db seed --profile reference
-- See docs/deployment-guide.md.
--
-- History (W1-4, 2026-09-18): the previous version of this file had never run
-- successfully. It declared INDEX clauses inside a CREATE TABLE body, which is
-- MySQL syntax, and PostgreSQL aborted on
--     ERROR: syntax error at or near "DESC"
--     LINE 14:     INDEX idx_audit_created (created_at DESC)
-- Because the entrypoint stops at the first failing statement, the 13 CREATE
-- SCHEMA statements after it never ran either. They were never needed: every
-- module's DbContext creates its own schema through EF Core, and the schema
-- names in the old file (identity, catalog, sales, ...) do not even match the
-- ones the application actually uses (config, content, crm, communication,
-- payments, hr, ai). The audit table it tried to create is also a duplicate -
-- public."AuditLogs" is owned by a migration.
-- ============================================================================

-- Trigram index support for product name / SKU search.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Accent-insensitive matching, so "man hinh" finds "Màn Hình".
CREATE EXTENSION IF NOT EXISTS unaccent;
