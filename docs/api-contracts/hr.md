# API contract — HR

**Owner:** W2-7 (`backend/Services/HR/**` EXCEPT statutory payroll, which is W2-25's —
`Domain/{StatutoryParameter,PublicHoliday}.cs`, `Application/{Statutory,Tax}/**`,
`Application/Payroll/{PayrollCalculationService,PayrollRunService}.cs`,
`Endpoints/Statutory/**`). See `docs/tax-payroll-kernel.md` / `docs/api-contracts/hr-statutory.md`
(W2-25) for PIT/insurance math, `PitMethod`, public holidays, statutory parameters.
**Status:** written 2026-09-18. Wave 3 (W3-6) rebuilds the HR back office from this document alone.

Error bodies: `{ "error": "<Vietnamese message>" }`, not yet the RFC 9457 platform contract
(`docs/api-conventions.md`) — pre-existing HR convention, not changed this track (flagged as a gap).
Paging where implemented: `?page=&pageSize=` (default 20, capped 100–200 depending on endpoint),
response `{ items, total, page, pageSize }`. Money is VND, integer-ish decimals.

## 0. What changed this track (W2-7)

- **Employee ↔ Identity link**: `Employee.UserId` (already existed) now has a real unique-filtered
  index (`IX_Employees_UserId_Unique`, migration `W207EmployeeUserLinkPayrollRunCreatedBy`) + a
  domain `LinkUser`/`UnlinkUser` + `POST /employees/{id}/link-user`. 8 staff employees seeded
  (idempotent, by AspNetUsers.Email) — see §1.
- **Attendance now compares VN wall-clock time**, not UTC (`IBusinessClock`, wired via
  `services.AddBusinessClock()` in HR's own `DependencyInjection.cs` — see Unresolved §A). Fixes
  ~7h Late/EarlyLeave miscalculation.
- **Legacy payroll and legacy Timesheet CRUD demolished** — old routes under `/api/hr/payroll/*`
  (bare) and `/api/hr/timesheets*` now return **410 Gone** with a message pointing at the real
  routes (`/api/hr/payroll/runs/*`, `/api/hr/attendance/*`, `/api/hr/timesheet/*`).
- **One leave approval path**: `LeaveApprovalService` — used by `/api/hr/leave/*` (self-service,
  singular, FE contract), `/api/hr/leaves/*` (admin, plural, legacy-shaped) and
  `/api/hr/approvals/{id}/approve|reject` when `Type=LeaveRequest`. Balance validated on submit
  AND approve against a fixed default policy (12 annual / 30 sick days/year) — see Unresolved §B.
- **17-route FE/BE contract drift** mostly closed — see §8 table.

## 1. Employees — `/api/hr/employees` (`Permissions.HR.{ViewEmployees,ManageEmployees}` via
`RequireModulePermissions(PermissionModules.HR)`)

| Method | Path | Notes |
|---|---|---|
| GET | `` | `?search=&department=&status=&page=&pageSize=&sortBy=(code\|hiredate\|salary\|name)&sortDesc=` |
| GET | `/{id}` | |
| POST | `` | `CreateEmployeeDto`; auto `EmployeeCode` (`NV0001`…) if omitted; `UserId` optional (link on create) |
| PUT | `/{id}` | `UpdateEmployeeDto` |
| DELETE | `/{id}` | soft — `Deactivate()`, not a real delete |
| POST | `/{id}/terminate` | `{ reason }` → `Employee.Terminate` |
| POST | `/{id}/link-user` | `{ userId }` — see §9 for how existence is checked |
| POST | `/{id}/unlink-user` | |

`CreateEmployeeDto`: `fullName, email, phone (VN format 0xxxxxxxxx or +84…), department, position,
baseSalary, hireDate?, employeeCode?, idCardNumber?, address?, hourlyRate?, dateOfBirth?, gender?,
taxCode?, socialInsuranceNumber?, idCardIssueDate?, idCardIssuePlace?, storeId?, bankAccount?,
bankName?, userId?`. 400 on missing/invalid fullName/email/phone/department/position/baseSalary
(Vietnamese messages), 409 on duplicate email/code.

**Seeded employees** (idempotent, `HRDbSeeder.SeedStaffEmployeesAsync`, matched by
`AspNetUsers.Email`): `admin@`, `hr@`, `accountant@`, `kho@`, `manager@`, `marketing@`, `sale@`,
`technician@quanghuong.com` → `NV0001..NV0008`, demo `Department`/`Position`/`BaseSalary`, phone
placeholder `0900000000` (HR should correct via PUT). Runs once per missing email; never overwrites
an admin-edited row.

## 2. Departments/Positions

**Not built this track** — `Employee.Department`/`Position` remain free-text columns, no master-data
table/FK. See Unresolved §C.

## 3. Contracts — `/api/hr/contracts` (`HR.*`)

GET ``/`{id}`/`expiring?days=30``, POST ``(create)`/{id}/activate`/{id}/terminate`, **new**:
PUT `/{id}` (`UpdateContractDto: endDate?, contractSalary, insurableSalary, documentUrl?` — blocked
once Terminated/Renewed), POST `/{id}/renew` (`RenewContractDto: newEndDate, newSalary?` — creates
`{number}-R{n}`, marks old `Renewed`), DELETE `/{id}` (only if not Active).

## 4. Salary structures / Allowances — `/api/hr/employees/{eid}/salary-structures`,
`/api/hr/employees/{eid}/allowances`, `/api/hr/allowance-types` (`Payroll.*`)

GET/POST/DELETE as before, **new**: PUT `/salary-structures/{id}` (same shape as create, does not
move `EffectiveDate` — moving the effective date means creating a new record, per domain rule).

## 5. Attendance — `/api/hr/attendance` (Staff, then per-route `HR.ViewAttendance`/`ManageAttendance`)

| Method | Path | Notes |
|---|---|---|
| POST | `/check-in` | `{ method, qrCode?, latitude?, longitude?, deviceId?, storeId? }`; `method` gated by `Hr:AllowedCheckInMethods` config (default: QR/GPS/WiFi/Manual, **no Web**) |
| POST | `/check-out` | |
| GET | `/qr-code?storeId=` | TOTP, 30s bucket |
| POST | `/manual` | manager check-in on behalf of employee, reason required |
| **GET** | `` | **new** — `?employeeId=&year=&month=&storeId=&page=&pageSize=` paged list |
| GET | `/today`, `/my-report?month=YYYY-MM`, `/report?month=YYYY-MM` | now use `IBusinessClock.TodayVn`, not `DateTime.UtcNow` |

**Attendance rules** moved to top-level `/api/hr/attendance-rules` (was nested under
`/attendance/rules`, which the FE never called — 404 before this track): GET, POST, **PUT `/{id}`
(new)**, **DELETE `/{id}` (new)**.

**Monthly timesheet**: group renamed `/api/hr/timesheet-monthly` → **`/api/hr/timesheet`** to match
`api/hr.ts timesheetApi`. `GET /{employeeId}?year=&month=` (IDOR-guarded: staff role or the
timesheet's own employee), `POST /{employeeId}/aggregate?year=&month=`, `POST /{id}/lock`.

## 6. Leave

### 6a. Self-service (singular) — `/api/hr/leave` (Staff; approve/reject/pending need `HR.ApproveLeave`)
`GET /mine`, `GET /pending`, `POST ""` (`{ type, startDate, endDate, reason? }` — **`days` is NOT
accepted from the client**, computed server-side as working days Mon–Sat minus VN holidays),
`POST /{id}/approve`, `POST /{id}/reject` (`{ reason }`), `POST /{id}/cancel` (owner only).

### 6b. Admin (plural, pre-existing shape) — `/api/hr/leaves` (`HR.*`)
Unchanged shape, now routes through the same `LeaveApprovalService` as §6a (was two independent
code paths before this track — a leave could be approved via `/leaves/{id}/approve` without any
balance check while `/approvals/{id}/approve` used a different, unsynced path).

### 6c. Generic approvals — `/api/hr/approvals` (`HR.*`)
`GET /pending`, `GET /my-requests` (**bug fixed**: was comparing `ApprovalRequest.RequesterId`
— an Employee id — against the caller's Identity user id; always empty. Now resolves the caller's
Employee first), `POST /{id}/approve|reject` — delegates to `LeaveApprovalService` when
`Type=LeaveRequest`.

**Balance rule (§0 note B)**: `LeaveApprovalService.SubmitAsync`/`ApproveAsync` reject when
`(already Pending+Approved days this year) + (this request's days) > cap`, cap = 12 (Annual) / 30
(Sick) / unlimited (other types). Checked again at approve time (another request may have consumed
the balance since submit).

## 7. Overtime — `/api/hr/overtime` (Staff; approve/reject/record-actual need `HR.ManageAttendance`)
`POST ""`, `GET /pending`, `GET /my` **and** `GET /mine` (alias — FE calls `mine`, BE only had `my`),
`POST /{id}/approve`, `POST /{id}/reject`, `POST /{id}/record-actual` (IDOR-fixed pre-track: manager/HR only).

## 8. Payroll — `/api/hr/payroll` (`Permissions.Payroll.*`)

**One workflow**: `PayrollRun` — `Draft → Calculated → Approved → Paid` (or `Cancelled` from
Draft/Calculated). Legacy endpoints that bypassed the tax engine (`GET /payroll`,
`POST /payroll/generate`, `PUT /payroll/{id}/pay`, `POST /payroll/{id}/{calculate,approve,process,
bonus,deduction}`, `PUT /payroll/{id}/notes`) now return **410 Gone**.

| Method | Path | Notes |
|---|---|---|
| POST | `/runs` | `{ year, month }`; records creator (`CreatedByUserId`) |
| POST | `/runs/{id}/calculate` | Draft → Calculated, all Active employees w/ Locked `MonthlyTimesheet` |
| GET | `/runs`, `/runs/{id}` | |
| POST | `/runs/{id}/approve` | Calculated → Approved; **segregation of duties**: 409-style 400 if approver == creator |
| POST | `/runs/{id}/mark-paid` | Approved → Paid; publishes `PayrollPaidIntegrationEvent` per employee |
| **POST** | `/runs/{id}/cancel` | **new** — `{ reason? }`, only from Draft/Calculated |
| GET | `/{payrollId}`, `/{payrollId}/payslip` | |
| **POST** | `/{payrollId}/recalculate` | **new** — re-runs `PayrollCalculationService.CalculateAsync` for that one employee/period (idempotent upsert); blocked once Approved+ |
| **GET** | `/mine?year=` | **new** — self-service, own `Employee.Id` only |
| GET | `/runs/{id}/bank-transfer-file` | requires `X-Reauth-Token` header — **still a presence check, not real re-auth**, see Unresolved §D |

`PayrollAdjustment` (bonus/commission/KPI/advance/penalty feeding `ComputeCore`) — **not built**, see
Unresolved §E. PIT/insurance figures inside `PayrollCalculationService` are pre-2026-law
(W2-25's job, in flight concurrently).

## 9. `link-user` / seeding and `IUserDirectory` (read this before wiring FE)

`BuildingBlocks.Contracts.IUserDirectory` (the correct, module-boundary-respecting contract W1-2 was
supposed to wire up) is **defined but never registered in DI anywhere** — only a duplicate
`Identity.Services.IUserDirectory` is registered, and HR cannot reference the Identity assembly.
`link-user` and the employee seeder therefore verify a `UserId` against `AspNetUsers` via a **direct
read-only SQL `SELECT 1 … LIMIT 1`** through `HRDbContext.Database.GetDbConnection()` — not a
`IUserDirectory` call. This is flagged, not hidden: see `integration-requests-w2.md`. "Create a new
login from HR" (the other half of step 1) is **not implemented** for the same reason — doing it via
raw SQL would recreate the exact broken-account anti-pattern `Identity.Services.UserDirectory.cs`'s
own doc-comment warns about (no password hash / security stamp / role).

## Unresolved (see also `w2-7-report.md`)
- **A.** `IBusinessClock` had no host registration anywhere (`AddPlatformKernel`/`AddBusinessClock`
  dead code). Fixed pragmatically by calling `AddBusinessClock()` from HR's own DI (idempotent,
  `TryAddSingleton`) — benefits every module, but the "real" fix belongs in
  `ApiGateway/Startup/ServiceRegistration.cs` (frozen this wave).
- **B.** Leave balance enforcement uses a fixed default policy (12 Annual / 30 Sick days/year), not
  a persisted `LeavePolicy`/`LeaveBalance` table with accrual/carry-over/seniority.
- **C.** Department/Position master data + FK not built; still free-text on `Employee`.
- **D.** Bank-transfer-file re-auth is still a header-presence check, not a real password/OTP re-auth.
- **E.** `PayrollAdjustment` entity not built (no consumer in `ComputeCore` to feed — that file is
  W2-25's; building the entity alone without wiring was judged low value this track).
