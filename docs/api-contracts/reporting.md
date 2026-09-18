# API contract — Reporting

**Owner:** W2-16 (`backend/Services/Reporting/**` EXCEPT `Endpoints/TaxReportEndpoints.cs`, which
moved to W2-25 — legal PIT settlement per D06). All routes below are `GET`/`POST`/`PUT`/`DELETE`
under `/api/reports`, permission-scoped per area via `RequirePermission` (W1-10), never role
strings. Money is VND. Dates `yyyy-MM-dd`; period params default per endpoint when omitted, are
resolved against `IBusinessClock.TodayVn` (VN business day, not UTC) and return `400 { error }`
when unparsable or `startDate >= endDate`.
**Status:** written 2026-09-18.

## 0. What changed this track (W2-16)

- **One revenue definition everywhere**: every endpoint that reports "doanh thu" now reads through
  `Reporting.Shared.RevenueQueries` or `IQueryable<Order>.Recognized()`, both thin wrappers over
  `Sales.Domain.RecognizedRevenue.Predicate` (Paid or Completed, not Cancelled/Refunded). Fixed in
  `sales-summary`, `top-products`, `top-customers`, `business-overview`, `profit-margin`,
  `customer-ltv`, `dashboard-kpis`, `comparison/revenue`, `comparison/inventory-turnover`,
  `revenue-expense`, and every `/export/*` sheet that shows a revenue figure. Locked by
  `RecognizedRevenueConsistencyTests` (`backend/Tests/UnitTests/Domain/Reporting/`).
- **Honest growth**: `dashboard-kpis` and `business-overview` now return
  `{ growthPercent: null, growthNoBaseline: true }` instead of a fabricated `100%` when there is no
  prior period (`Reporting.Shared.GrowthCalculator`).
- **COGS is flagged**: `profit-margin` has no per-sale cost snapshot to read (`OrderItem` carries
  none — see Unresolved), so cost is estimated from `InventoryItem.AverageCost` and the response
  carries `isEstimate: true` on every row and at the top level.
- **VAT output** in `revenue-expense` now reads `InvoiceLine.VatAmount` grouped by `VatRate`
  (D01), never recomputed from order totals. VAT input from `Expense.VatAmount`.
- **`GET /promotion-effectiveness` added** (D10): per-promotion orders/revenue/discount/redemption
  rate + a coupon breakdown, from `content.PromotionUsages` joined to recognized orders.
- **Dead code removed**: `Reporting/Pdf/**` (~400 LOC, never called) + `QuestPDF`/`ScottPlot`
  package refs. Excel (ClosedXML) remains the only real export path.

## 1. Sales — `Permissions.Reporting.ViewSales`

| Method | Path | Request | Response (shape) | Notes |
|---|---|---|---|---|
| GET | `/sales-summary` | `startDate?`, `endDate?` (default 12mo) | `{ totalOrders, totalRevenue, monthRevenue, todayRevenue, todayOrders, monthlyData[12], statusDistribution[] }` | revenue = `RecognizedRevenue` |
| GET | `/top-products` | `top=10`, `startDate?`, `endDate?` | `[{ productId, productName, totalQuantity, totalRevenue, orderCount }]` | |
| GET | `/top-customers` | `top=10` | `[{ customerId, customerName, email, totalSpent, orderCount, lastOrderDate }]` | name from `IdentityDbContext` join |
| GET | `/business-overview` | — | `{ sales:{thisMonthRevenue,lastMonthRevenue,growthPercent,growthNoBaseline,pendingOrders}, inventory, repairs, accounting }` | cross-module KPI strip |
| GET | `/profit-margin` | `startDate?`, `endDate?` | `{ period, products[{...,isEstimate:true}], totalRevenue, isEstimate:true }` | COGS estimate, see §0 |
| GET | `/customer-ltv` | `top=50` | `[{ customerId, customerName, totalSpent, orderCount, avgOrderValue, projectedClv, segment, daysSinceLast }]` | name via `IUserDirectory` |
| GET | `/dashboard-kpis` | — | `{ todayRevenue, todayOrders, monthRevenue, monthGrowth, monthGrowthNoBaseline, pendingOrders, lowStockAlerts }` | |
| GET | `/comparison/revenue` | `period1Start,period1End,period2Start,period2End` | `{ period1, period2, change }` | |
| GET | `/comparison/orders` | same | `{ period1, period2, change }` | not revenue-scoped (all statuses, for cancel-rate) |
| GET | `/comparison/inventory-turnover` | same | `{ period1, period2, change }` | COGS proxy = `SubtotalAmount` of recognized orders |
| GET | `/promotion-effectiveness` | `startDate?`, `endDate?` | `{ period, promotions[{promotionId,orderCount,revenue,discountGiven,usageCount,uniqueCustomers,redemptionRate}], coupons[{couponCode,orderCount,revenue,discountGiven}] }` | D10; revenue = recognized orders only |

## 2. Financial — `Permissions.Reporting.ViewFinancial`

| Method | Path | Request | Response | Notes |
|---|---|---|---|---|
| GET | `/cash-flow` | `startDate?`, `endDate?` | `{ period, totalInflows, totalOutflows, netCashFlow, breakdown, monthlyInflows[], monthlyOutflows[] }` | from paid AR/AP invoices + paid expenses (real, not heuristic) |
| GET | `/revenue-expense` | `startDate?`, `endDate?` | `{ period, summary, monthlyData[], expenseByCategory[], vat:{outputByRate[],inputTotal,netPayable} }` | revenue = `RecognizedRevenue`; VAT per §0 |
| GET | `/balance-overview` | — | `{ assets, liabilities, netPosition, arAgingBreakdown[], apAgingBreakdown[] }` | AR/AP = real `Invoice.OutstandingAmount` |
| GET | `/balance-sheet` `/income-statement` `/financial-notes` `/vat-declaration` `/pit-settlement` | — | — | **owned by W2-25** (`TaxReportEndpoints.cs`); see `docs/tax-payroll-kernel.md`. Not documented here — this track does not touch that file. |

## 3. Inventory — `Permissions.Reporting.ViewInventory`

| Method | Path | Response |
|---|---|---|
| GET | `/inventory-value` | stock value by category/warehouse |
| GET | `/ar-aging` | AR aging buckets |

## 4. Repair — `Permissions.Reporting.ViewRepair`

| Method | Path | Response |
|---|---|---|
| GET | `/tech-performance` | technician completion/SLA stats |
| GET | `/top-technicians` | `?top=10` ranking |
| GET | `/warranty/summary` `/warranty/by-brand` `/warranty/costs` `/warranty/trending` | warranty claim aggregates |

## 5. HR — `Permissions.Reporting.ViewHR`

| Method | Path |
|---|---|
| GET | `/hr/attendance-summary` `/hr/employee-performance` `/hr/leave-summary` `/hr/timesheet-overview` `/hr/payroll-summary` `/hr/employee-ranking` |

## 6. CRM — `Permissions.CRM.ViewAnalytics`

| Method | Path |
|---|---|
| GET | `/crm/overview` `/crm/campaign-performance` `/crm/customer-segments` `/crm/lead-funnel` |

## 7. Export — `Permissions.Reporting.ExportReports`

| Method | Path | Notes |
|---|---|---|
| GET | `/export/sales` | `startDate?`, `endDate?` — order listing (all statuses, audit sheet) + summary (recognized revenue) |
| GET | `/export/top-products` | `top=50`, recognized revenue |
| GET | `/export/technicians` | |
| GET | `/export/inventory` | |
| GET | `/export/full-report` | recognized revenue throughout |
| GET | `/export/financial` | `startDate?`, `endDate?`, recognized revenue |
| GET/POST/PUT/DELETE | `/definitions`, `/definitions/{code}`, `/{code}/presets*` | report definition/preset CRUD (`ReportCustomizationEndpoints`), unchanged this track |

## 8. System — `Permissions.System.ViewConfig`

| Method | Path |
|---|---|
| GET | `/system-health` |

## Error contract

Reporting predates `docs/api-conventions.md`'s RFC 9457 shape; endpoints here return
`400 { error: "<message>" }` on bad period input (new this track) and otherwise plain
`200 Results.Ok(...)` — **not yet migrated to the platform Problem+JSON envelope** (flagged as a
gap, not changed this track — out of the ~9.5h budget; see Unresolved in the phase report).

## Unresolved / known gaps

- **No order-item cost snapshot.** `Sales.Domain.OrderItem` has no `UnitCostSnapshot`; COGS in
  `/profit-margin` and `/comparison/inventory-turnover` is always today's `InventoryItem.AverageCost`,
  flagged `isEstimate: true`. Real fix is a W2-3-owned schema change — filed in
  `integration-requests-w2.md`.
- **Tax-report route path mismatch** (`frontend/src/api/tax-reports.ts` calls
  `/api/reporting/tax/*`; the actual routes are `/api/reports/*`, no `/tax` segment, owned by
  W2-25). Filed in `integration-requests-w2.md` — neither file is in this track's ownership.
- Error contract not migrated to RFC 9457 (see above).
