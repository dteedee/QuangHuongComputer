# Business Requirements Implementation Plan
## Quang Huong Computer - ERP + eCommerce System

**Last Updated:** 2026-01-07  
**Status:** In Progress

---

## Executive Summary

This document outlines the comprehensive implementation plan for a production-grade ERP + eCommerce system for Quang Huong Computer, following enterprise business requirements for computer sales and repair services.

### Core Principles (MANDATORY)

1. **Single Source of Truth**
   - Order → Sales truth
   - Inventory Ledger → Stock truth
   - Invoice/VAT → Tax/Billing truth
   - AR/AP Ledger → Debt truth
   - Work Order → Repair/Warranty truth

2. **State + History for Everything**
   - No direct data overwriting
   - Status + Timeline + Audit Log (who, when, why)

3. **Idempotency & Consistency**
   - Event-driven architecture (RabbitMQ + Outbox pattern)
   - No double-trigger issues (payment webhooks, retry jobs)

4. **Permission & Risk Control**
   - View ≠ Edit ≠ Approve
   - Sensitive actions require approval workflow + audit

---

## Implementation Status

### ✅ Phase 1: Foundation (COMPLETED)
- [x] IAM + RBAC + Granular Permissions
- [x] Audit Logging Infrastructure
- [x] Base Entity with Soft Delete
- [x] Event-Driven Messaging (MassTransit + RabbitMQ)
- [x] Database Migrations Setup

### 🔄 Phase 2: Core Modules (IN PROGRESS)

#### A. Catalog Module
**Status:** 80% Complete

**Completed:**
- ✅ Category/Brand/Product management
- ✅ SKU uniqueness
- ✅ Product attributes (specs)
- ✅ Status flow: Draft → Active → Hidden → Discontinued
- ✅ Soft delete with IsActive

**Remaining:**
- [ ] Product Variants (RAM/SSD/Color) with separate SKUs
- [ ] BOM/Bundle support (combo products)
- [ ] Multi-branch price lists
- [ ] SEO meta fields

**Business Logic Enforced:**
- Discontinued products cannot be ordered (requires manager override)
- Price consistency across storefront, POS, invoice

---

#### B. Cart/Checkout/Order Module
**Status:** 60% Complete

**Completed:**
- ✅ Cart CRUD operations
- ✅ Order lifecycle: Draft → Confirmed → Paid → Fulfilled → Completed
- ✅ Order cancellation
- ✅ Price snapshot at order creation

**Remaining:**
- [ ] Stock reservation on order confirmation
- [ ] Return/Refund workflow (RMA)
- [ ] Partial shipment support
- [ ] POS (Point of Sale) interface

**Business Logic to Implement:**
```csharp
// Stock deduction ONLY via Shipment/Delivery/Issue Note
// Order.Completed = (Fulfilled + Payment/AR valid)
// Price snapshot prevents retroactive price changes
```

---

#### C. Payment Module
**Status:** 40% Complete

**Completed:**
- ✅ Payment intent creation
- ✅ Gateway integration structure

**Remaining:**
- [ ] Webhook idempotency (transaction deduplication)
- [ ] Reconciliation job (settlement matching)
- [ ] Refund workflow (full/partial) with approval
- [ ] Multiple payments per order (deposit + final payment)

**Critical Business Rules:**
```csharp
// Payment Success ≠ Order Complete (separate Paid vs Completed)
// Webhook state transitions must be unidirectional
// Same transaction ID → same result (idempotent)
```

---

#### D. Invoice & VAT / Accounting Module
**Status:** 50% Complete

**Completed:**
- ✅ Basic invoice structure
- ✅ VAT fields (buyer type, tax code, company info)

**Remaining:**
- [ ] Invoice adjustment/cancel workflow (no direct deletion)
- [ ] PDF/Excel export
- [ ] Profit reporting (COGS from inventory)
- [ ] Double-entry ledger journal
- [ ] Daily shift open/close with cash reconciliation

**Business Logic:**
```csharp
// Issued invoice = frozen data (adjustment via new document only)
// Daily revenue = cash + settled payments + AR created
// VAT rate snapshot at invoice issue time
```

---

#### E. AR/AP (Accounts Receivable/Payable) Module
**Status:** 30% Complete

**Completed:**
- ✅ Basic account structure

**Remaining:**

**AR (Receivables):**
- [ ] Customer types: Retail vs Organization
- [ ] Credit terms: NET 15/30/45
- [ ] Credit limit enforcement
- [ ] AR invoice states: Draft → Approved → Issued → PartiallyPaid → Paid → Overdue
- [ ] Partial payment application
- [ ] Aging buckets (0-30, 31-60, 61-90, 90+ days)
- [ ] Automated reminders & dunning
- [ ] Hold policy (block new orders if overdue)
- [ ] Write-off with approval

**AP (Payables):**
- [ ] Supplier invoice linking to PO/GRN
- [ ] Payment schedules
- [ ] Aging reports

**Critical Business Rules:**
```csharp
// AR created from: Order (sales) OR WorkOrder (repair) with PayLater terms
// Outstanding = Invoice Total - Sum(Applied Payments)
// Cannot apply payment > outstanding balance
// Overdue → block new orders (or require approval)
```

---

#### F. Inventory/Warehouse Module
**Status:** 50% Complete

**Completed:**
- ✅ Warehouse structure
- ✅ Stock on hand tracking
- ✅ Basic stock movements

**Remaining:**
- [ ] Stock movement types: IN, OUT, TRANSFER, ADJUST
- [ ] Stocktake (physical inventory count)
- [ ] Stock reservation by order
- [ ] Serial/IMEI tracking (MANDATORY for laptops/cameras)
- [ ] FIFO/Weighted Average cost calculation
- [ ] Low stock alerts
- [ ] Reorder suggestions

**Business Logic:**
```csharp
// Stock = Sum(Ledger Movements) - NO direct quantity updates
// Every OUT movement must have reason: Order Shipment / Parts Used / Return to Supplier
// Serial tracking:
//   - Serial → Purchase Lot
//   - Serial → Sales Order
//   - Serial → Repair/Warranty Work Order
```

---

#### G. Repairs/Service Module
**Status:** 40% Complete

**Completed:**
- ✅ Work order basic structure
- ✅ Device info + symptoms

**Remaining:**
- [ ] Booking: At-shop vs On-site
- [ ] Status flow: Requested → Assigned → Diagnosing → Quoted → Approved → Fixing → Done → Handover → Closed
- [ ] Quotation: Labor + Parts + Travel fee (on-site)
- [ ] Customer approval workflow
- [ ] SLA timers + escalation
- [ ] Check-in/out for on-site with proof
- [ ] Parts request from inventory with auto-issue
- [ ] Service warranty (X days post-repair)

**Business Logic:**
```csharp
// Cannot charge for parts without inventory issue
// On-site for organizations → AR invoice (pay later)
// Close work order ONLY when: Handover + (Payment OR AR invoice valid)
```

---

#### H. Warranty/RMA Module
**Status:** 20% Complete

**Remaining:**
- [ ] Warranty card auto-generation from invoice
- [ ] Serial/IMEI/Invoice lookup
- [ ] Warranty claim ticket: Received → Inspection → Decision → Resolved
- [ ] Policy rule engine (12 months, exclusions)
- [ ] Replacement workflow: Replace / Repair / Refund
- [ ] Supplier RMA linking (manufacturer defect)

**Business Logic:**
```csharp
// Warranty valid ONLY if serial is sold
// Decision requires evidence + approval for replace/refund
```

---

#### I. Promotions/Coupon Module
**Status:** 70% Complete

**Completed:**
- ✅ Coupon code (% or fixed)
- ✅ Basic conditions (min order, dates, usage limit)

**Remaining:**
- [ ] Scope: Category/Brand/SKU specific
- [ ] Customer segment targeting (retail vs org)
- [ ] Stacking rules (multiple coupons)

**Business Logic:**
```csharp
// Final Price = Subtotal - Discount + Tax + Shipping (consistent order)
// Coupon snapshot in order (audit + fraud prevention)
```

---

#### J. CMS/Marketing Module
**Status:** 60% Complete

**Completed:**
- ✅ Posts/Articles
- ✅ Basic content management

**Remaining:**
- [ ] Banner/Ads management
- [ ] Landing pages
- [ ] UTM tracking

---

#### K. HR/Payroll Module
**Status:** 10% Complete

**Remaining:**
- [ ] Employee profiles
- [ ] Role assignment
- [ ] Job assignment tracking
- [ ] Payroll: Base salary + Overtime + Bonus/Penalty
- [ ] Timesheet approvals
- [ ] KPI-based bonuses (tech SLA, sales targets)

**Business Logic:**
```csharp
// Payroll calculated from approved timesheets/jobs only
// No editing approved payroll (adjustment documents only)
```

---

#### L. Chatbox + AI Chatbot Module
**Status:** 0% Complete

**Remaining:**

**Chatbox:**
- [ ] Customer ↔ Sales real-time messaging
- [ ] Assignment & tags
- [ ] Canned responses
- [ ] Link conversation to order/lead

**AI Chatbot:**
- [ ] RAG (Retrieval-Augmented Generation) for:
  - Products
  - Posts
  - Policies (warranty, returns, repair pricing)
- [ ] Handoff to sales when:
  - Customer wants to purchase
  - Needs configuration advice
  - Bot uncertain
  
**Business Logic:**
```csharp
// Bot MUST NOT leak internal data (purchase price, salaries, debts)
// Bot must cite internal sources (SKU/ArticleId) when answering
```

---

## Cross-Module Business Logic (CRITICAL)

### 1. Order ↔ Inventory ↔ Accounting
```
Order Confirmed → Reserve Stock (optional policy)
Shipment/Issue Note → Stock OUT
Payment Success → Order.Paid
Invoice Issue → Revenue + VAT recognized
Return/Refund → Stock IN + Refund record + Invoice adjustment
```

### 2. Repair ↔ Inventory ↔ Accounting ↔ AR
```
Parts Used → Stock OUT (parts consumption)
WorkOrder Done → Invoice/Payment OR AR Invoice
On-site Organization → AR Ledger + Aging
```

### 3. Warranty ↔ Sales ↔ Supplier
```
Warranty Claim → Must link to sold serial
Decision (Replace/Refund) → Requires approval + accounting entries
Manufacturer defect → Supplier RMA workflow
```

### 4. Payment ↔ Webhook ↔ Idempotency
```
Webhook duplicate → Same result (idempotent)
Reconciliation job → Settlement matching
```

### 5. Permissions ↔ Audit
```
All sensitive actions → Audit record:
  - Price change
  - Discount override
  - Stock adjustment
  - Refund
  - Invoice cancel
  - Credit approval
```

---

## Enterprise Requirements (MANDATORY)

### Status Flows
- ✅ Order: Draft → Confirmed → Paid → Fulfilled → Completed | Cancelled
- ✅ Payment: Pending → Processing → Success | Failed | Refunded
- 🔄 Invoice: Draft → Approved → Issued → Paid
- 🔄 WorkOrder: Requested → Assigned → Diagnosing → Quoted → Approved → Fixing → Done → Handover → Closed
- 🔄 WarrantyClaim: Received → Inspection → Decision → Resolved
- 🔄 AR/AP: Draft → Approved → Issued → PartiallyPaid → Paid → Overdue

### Audit & Compliance
- ✅ Audit log infrastructure
- ✅ Soft delete (IsActive flag)
- 🔄 Approval workflows for sensitive actions
- ✅ Data snapshots (price, tax rate, coupon at transaction time)
- 🔄 Idempotency for webhooks + retry jobs
- 🔄 Export reports (Excel/PDF) for accounting/management

### Advanced Features
- [ ] Multi-branch + price lists
- [ ] Serial tracking + cost methods (FIFO/Avg)
- [ ] SLA + escalation
- [ ] Dunning policy (debt reminders)
- [ ] Fraud controls (coupon abuse, refund abuse)

---

## Implementation Priority Order

1. ✅ **IAM + RBAC + Permission + Audit** (COMPLETED)
2. ✅ **Catalog + Inventory Ledger** (80% COMPLETE)
3. 🔄 **Order + Pricing Engine** (60% COMPLETE)
4. 🔄 **Payment + Webhook Idempotency** (40% COMPLETE)
5. 🔄 **Invoice/VAT + Daily Close Shift** (50% COMPLETE)
6. 🔄 **Repairs + Parts Consumption + Quotation Approval** (40% COMPLETE)
7. ⏳ **Warranty + Serial Mapping** (20% COMPLETE)
8. ⏳ **AR/AP + Aging + Hold Policy** (30% COMPLETE)
9. ⏳ **Supplier Procurement (PO/GRN)** (NOT STARTED)
10. 🔄 **Promotions + CMS** (65% COMPLETE)
11. ⏳ **HR/Payroll** (10% COMPLETE)
12. ⏳ **Chatbox + AI Chatbot** (NOT STARTED)

---

## Next Steps (Immediate Actions)

### Week 1-2: Complete Core Sales Flow
1. Implement stock reservation logic
2. Add return/refund workflow with approval
3. Complete payment webhook idempotency
4. Implement invoice adjustment workflow

### Week 3-4: Inventory & Serial Tracking
1. Implement serial/IMEI tracking
2. Add FIFO/Weighted Average costing
3. Complete stock movement audit trail
4. Add low stock alerts

### Week 5-6: AR/AP & Credit Management
1. Implement credit terms & limits
2. Add aging buckets & reports
3. Implement hold policy for overdue accounts
4. Add payment application logic

### Week 7-8: Repair & Warranty
1. Complete work order status flow
2. Implement parts consumption from inventory
3. Add SLA timers & escalation
4. Implement warranty claim workflow

---

## Technical Architecture Notes

### Database Schema
- All entities inherit from `Entity<TId>` with audit fields
- Soft delete via `IsActive` flag
- Query filters applied at DbContext level

### Event-Driven Communication
- MassTransit + RabbitMQ for inter-module events
- Outbox pattern for guaranteed delivery
- Idempotent consumers

### Permission System
- Claims-based authorization
- Granular permissions per module
- Permission inheritance via roles

### Audit Trail
- All sensitive actions logged to `AuditLogs` table
- Includes: UserId, Action, EntityName, EntityId, Details, Timestamp

---

## Risk Mitigation

### Data Integrity
- ✅ Single source of truth enforced
- ✅ No direct quantity updates (ledger-based)
- 🔄 Snapshot critical data at transaction time

### Financial Accuracy
- 🔄 Invoice immutability (adjustment documents only)
- 🔄 Payment reconciliation
- 🔄 AR/AP balance validation

### Operational Control
- ✅ Approval workflows for sensitive actions
- ✅ Audit logging
- 🔄 SLA monitoring & escalation

---

## Success Criteria

1. **Zero data inconsistency** between modules
2. **100% audit coverage** for sensitive operations
3. **Idempotent** payment processing
4. **Accurate** inventory tracking with serial numbers
5. **Compliant** VAT/tax reporting
6. **Automated** AR aging & dunning
7. **SLA-driven** repair workflow

---

## Appendix: System Permissions

### Current Permission Structure
```csharp
// Users
Permissions.Users.View
Permissions.Users.Create
Permissions.Users.Edit
Permissions.Users.Delete
Permissions.Users.ManageRoles

// Roles
Permissions.Roles.View
Permissions.Roles.Create
Permissions.Roles.Edit
Permissions.Roles.Delete

// Catalog
Permissions.Catalog.View
Permissions.Catalog.Create
Permissions.Catalog.Edit
Permissions.Catalog.Delete

// Sales
Permissions.Sales.ViewOrders
Permissions.Sales.ManageOrders
Permissions.Sales.UpdateStatus

// Repairs
Permissions.Repairs.View
Permissions.Repairs.Create
Permissions.Repairs.Edit
Permissions.Repairs.Complete

// Inventory
Permissions.Inventory.View
Permissions.Inventory.Adjust
Permissions.Inventory.Stocktake

// Procurement
Permissions.Procurement.ViewPO
Permissions.Procurement.CreatePO
Permissions.Procurement.ApprovePO

// Accounting
Permissions.Accounting.View
Permissions.Accounting.ManageInvoices
Permissions.Accounting.ApproveDebt

// Marketing
Permissions.Marketing.Manage

// Reporting
Permissions.Reporting.View
Permissions.Reporting.ViewFinancial

// System
Permissions.System.Config
```

---

**Document Version:** 1.0  
**Author:** Development Team  
**Review Date:** 2026-01-07
