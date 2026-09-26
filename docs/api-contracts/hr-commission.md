# API contract — HR technician commission (hoa hồng kỹ thuật)

**Files:** `backend/Services/HR/Domain/commission-{entry,policy}.cs`, `Application/Commission/**`,
`Endpoints/commission-{endpoints,policy-endpoints}.cs`, migration `20260926120000_AddTechnicianCommission`.
Repair side (read-only, no schema change): `Repair/Application/Commission/repair-commission-source-query.cs`
implementing `BuildingBlocks/Contracts/repair-commission-source-query.cs`.
Money = integer VND (`numeric(18,0)`, `AwayFromZero`). Period = `yyyy-MM` in `Asia/Ho_Chi_Minh`.

## 1. Rules

| Rule | Detail |
|---|---|
| Source | A Repair work order that reaches **Paid** (then Delivered). Event `RepairWorkOrderSettlementChangedEvent` triggers it; `POST /sync` reconciles a whole period (the bus has no outbox). |
| Base | `WorkOrder.LaborCost + WorkOrder.ServiceFee`. **Parts are excluded.** |
| Amount | `round(base × LaborPercent / 100) + FixedAmountPerJob`. An amount of 0 creates no entry. |
| Rate | Newest `CommissionPolicy` row of the employee with `EffectiveFrom ≤ paid date (VN)`, else SystemConfig `HR_COMMISSION_LABOR_PERCENT` (seed 10) + `HR_COMMISSION_FIXED_PER_JOB` (seed 0). Rows are never edited: a new rate is a new row. |
| Technician → employee | `Technician.UserId` (Identity) = `Employee.UserId`. Unmapped work orders are listed by `sync` in `unmapped`, and no entry is written. |
| Idempotency | Unique `(SourceType, SourceId)`. A duplicate event or re-sync is a no-op; a concurrent insert that loses on `23505` also counts as already recorded. |
| Reversal | If the work order is cancelled after payment: a `Pending`/`Approved` entry that no approved payroll holds becomes `Reversed`. An entry that is already paid, or sits in an approved payroll, stays unchanged, and a `RepairWorkOrderClawback` entry for **−amount** is created in the current period. |
| Payroll | Payroll of month M takes every `Approved` entry with period ≤ M that is not linked elsewhere, so late approvals roll forward. It adds one `Bonus` line, "Hoa hồng kỹ thuật (n khoản…)", which is taxable for PIT and not insurable. If the net is ≤ 0, nothing is linked and the entries roll forward. Recalculating a payroll re-links from scratch. |
| Approve run | Refused (400) while a payroll of the run still links an entry that was reversed after calculation. Recalculate first. |
| Mark paid | In the same transaction, the linked entries become `Paid`. |

Statuses: `Pending → Approved → Paid`, `Pending|Approved → Reversed`.

## 2. Endpoints

| Method + route | Permission | Body / query → response |
|---|---|---|
| `GET /api/hr/commissions?period=&employeeId=&status=` | `HR.ViewPayroll` | `{ period, totals{pending,approved,paid,reversed,count}, byEmployee[{employeeId,employeeName,pending,approved,paid,reversed,count}], items[] }`. Totals ignore `status`, and `items` honours it. |
| `POST /api/hr/commissions/sync` | `HR.ManagePayroll` | `{ period }` → `{ period, scanned, created, alreadyRecorded, reversed, clawbacksCreated, unmapped[] }` |
| `POST /api/hr/commissions/approve` | `HR.ManagePayroll` | `{ ids[] }` → `{ approved, skipped }`. Only `Pending` entries are approved. |
| `POST /api/hr/commissions/{id}/reverse` | `HR.ManagePayroll` | `{ reason }` (required) → `{ status, payrollNeedsRecalculation }`. 400 if the entry is held by an approved or paid payroll. |
| `GET /api/hr/employees/{id}/commission-policies` | `HR.ViewPayroll` | `{ default{laborPercent,fixedAmountPerJob}, current{laborPercent,fixedAmountPerJob,isDefault}, history[] }` |
| `POST /api/hr/employees/{id}/commission-policies` | `HR.ManagePayroll` | `{ laborPercent (0..100), fixedAmountPerJob (≥0, integer), effectiveFrom (yyyy-MM-dd), note? }` → 201 |
| `GET /api/hr/commissions/mine?year=` | `SecurityPolicies.Staff` | Only the caller's own entries: `{ year, totals{pending,approved,paid}, items[] }` |

Item: `{ id, employeeId, employeeName, sourceType, sourceId, sourceReference, baseAmount, ratePercent,
fixedAmount, amount, period, earnedAt, status, approvedAt, approvedBy, reversedAt, reversalReason, payrollId, paidAt }`.

## 3. Not covered

- **Sales commission for POS staff:** not built. `Order.CashierId` exists on POS orders, but the cashier is
  not necessarily the salesperson, and there is no return or net-revenue rule yet. It can be added later through a Sales
  read contract in the same way.
