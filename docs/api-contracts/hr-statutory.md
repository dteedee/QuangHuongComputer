# API contract — HR statutory payroll (lương / thuế TNCN / bảo hiểm)

**Owner:** W2-25. Files: `backend/Services/HR/Domain/{StatutoryParameter,PublicHoliday}.cs`,
`Application/{Statutory,Tax}/**`, `Application/Payroll/{PayrollCalculationService,PayrollRunService}.cs`,
`Endpoints/Statutory/**`, `backend/Services/Reporting/Endpoints/TaxReportEndpoints.cs`,
`backend/Services/Accounting/TaxReportingEndpoints.cs`.
**Decision:** `decisions/D06-tham-so-luong-thue-bao-hiem-2026.md` (binding). Math kernel:
`docs/tax-payroll-kernel.md` (W1-15). Everything else HR: `docs/api-contracts/hr.md` (W2-7).
**Status:** written 2026-09-18. W3-6 builds the parameter screen + payslip lines from this doc alone.

Errors: platform contract (`docs/api-conventions.md`) — RFC 9457 body
`{ type, title, status, code, instance, traceId, error, message }`. 400 validation, 401 anon,
403 wrong permission, 404 not found, **409 = the law milestone is locked by a paid payroll**.
Money = VND, `MidpointRounding.AwayFromZero` to the dong. Dates = `DateOnly`, `Asia/Ho_Chi_Minh`
via `IBusinessClock.TodayVn` — **never `DateTime.UtcNow`**: 7h of skew breaks exactly the two
2026 cliffs (01/01 and 01/07).

---

## 1. Why this module exists (read this before changing a number)

The law changes **by date, and each parameter on its own calendar**: PIT deductions and the
regional minimum wage moved on 01/01/2026; the base salary, the insurance caps and the meal
allowance move on 01/07/2026. One global setting cannot express that — the same 60M employee
pays 5.407.000 in contributions in September 2026 and 5.046.000 in June 2026 (D06 TV2a/TV2b).

So: one row per `(Code, EffectiveFrom)` in `hr."StatutoryParameters"`, no `EffectiveTo` (it is
implied by the next row, so gaps and overlaps are impossible). **Changing the law = adding a
row, never editing one, never a deployment.** Compiled defaults in
`BuildingBlocks/TaxEngine/VietnamStatutoryDefaults.cs` are the fallback when a row is missing
(logged as a warning), so an empty DB still computes correctly.

Each `Payroll` stores the whole parameter set it used (`StatutorySnapshotJson`), so a payslip
paid years ago re-renders identically during an inspection even after new rows are added.

## 2. `GET /api/hr/statutory-parameters` — `HR.ViewPayroll`

| Query | Meaning |
|---|---|
| `code` | filter to one code (e.g. `SI_REFERENCE_LEVEL`) |
| `asOf` | `yyyy-MM-dd` — only the rows in force on that date; omit for the full milestone history |

Response: `StatutoryParameterDto[]` —
`{ id, code, effectiveFrom, numberValue, jsonValue, unit, legalBasis, sourceUrl, note, isSeed, isVerified, isLocked }`.
`unit` ∈ `VND | RATE | HOURS | JSON | TEXT`. `isVerified=false` = D06 marked the figure
**CHƯA XÁC MINH** against a primary source (8 of the 30 codes resolved at 2026-09-01;
12 rows across the whole history); show it in the UI.
`isLocked=true` = already used by a paid payroll → `PUT`/`DELETE` return 409.

## 3. `GET /api/hr/statutory-parameters/resolved?asOf=` — `HR.ViewPayroll`

The resolved set actually used to compute a payslip. `asOf` defaults to `IBusinessClock.TodayVn`.

```
{ asOf, pitPersonalDeduction, pitDependentDeduction, pitBrackets[{upTo,rate,quickDeduction}],
  pitFlatRate, pitFlatThreshold, pitOvertimeExemptMode, pitMealTaxFreeCap,
  siReferenceLevel, socialInsuranceCap, companyWageRegion, unemploymentCap,
  regionalMinWage{monthlyWage,hourlyWage}, rates{...}, overtimeMultipliers{...},
  overtimeLimits{month,year}, probationMinRatio,
  legalBasis: { "<CODE>": { effectiveFrom, legalBasis, sourceUrl, isVerified } } }
```

Verified over HTTP on :5050 (2026-09-18):

| asOf | personal ded. | dependent | bands | SI cap | meal cap | min wage | OT exempt mode |
|---|---|---|---|---|---|---|---|
| 2025-12-01 | 11.000.000 | 4.400.000 | 7 | 46.800.000 | 730.000 | 4.960.000 | `PremiumOnly` |
| 2026-01-01 | 15.500.000 | 6.200.000 | 5 | 46.800.000 | 730.000 | 5.310.000 | `FullWithinLegalHours` |
| 2026-06-01 | 15.500.000 | 6.200.000 | 5 | 46.800.000 | 730.000 | 5.310.000 | `FullWithinLegalHours` |
| 2026-07-01 | 15.500.000 | 6.200.000 | 5 | **50.600.000** | **1.200.000** | 5.310.000 | `FullWithinLegalHours` |

`pitOvertimeExemptMode=FullWithinLegalHours` (Luật 109/2025 Đ.4.8 + NĐ 253/2026 Đ.26) is the
change most people miss: from the 2026 tax period **all** overtime and night pay inside the
legal hour limits is tax-free, not just the premium — but only if §7's schedule can be produced.

## 4. `GET /api/hr/statutory-parameters/codes` — `HR.ViewPayroll`

The 30 valid codes (`StatutoryParameterCodes.All`, frozen by W1-15). A set missing any of them
is invalid. Use it to populate the "Thêm mốc mới" code picker.

## 5. Writes — `HR.ManageStatutoryParameters` (Admin, Accountant only; HR can read, not write)

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/api/hr/statutory-parameters` | `CreateStatutoryParameterDto` | 201. `{code, effectiveFrom, numberValue?, jsonValue?, unit, legalBasis, sourceUrl, note?, isVerified=true, reason?}` |
| PUT | `/api/hr/statutory-parameters/{id}` | `UpdateStatutoryParameterDto` | `code`/`effectiveFrom` are immutable |
| DELETE | `/api/hr/statutory-parameters/{id}` | — | 204 |

Rules, all enforced server-side:
- exactly one of `numberValue` / `jsonValue` (DB CHECK + validation);
- `(code, effectiveFrom)` unique → **409** on a duplicate milestone;
- rate ∈ [0,1], VND ≥ 0, tax bands ascending with an open top band — else **400**;
- after any write the set at that milestone must still resolve, or the write is rejected (400)
  rather than exploding the next payroll run;
- deleting the last remaining milestone of a code → **409**;
- **lock**: `effectiveFrom <=` (pay date of the most recent `Paid` payroll run) → **409**
  "Đổi luật = THÊM mốc hiệu lực mới". Observed on :5050: `PUT PIT_PERSONAL_DEDUCTION@2020-07-01 -> 409`.
- every write is audited (actor, old/new value, `reason`).

## 6. `/api/hr/public-holidays` — read `HR.ViewAttendance`, write `HR.ManageAttendance`

| Method | Path | Notes |
|---|---|---|
| GET | `` | `?year=&unconfirmedOnly=` (both optional) → `PublicHolidayDto[]` ordered by date |
| POST | `` | `UpsertPublicHolidayDto`; duplicate date → 409 |
| PUT | `/{id}` | date is immutable |
| POST | `/{id}/confirm` | HR ticked it off against the official holiday announcement |
| DELETE | `/{id}` | |

Seeded 2025-2027 (35 rows). D06 corrections now in data:
**Giỗ Tổ Hùng Vương 26/04/2026** (the old `VNHolidayCalendar.cs:26` said 27/03/2026) and
**16/04/2027** (it said 15/04/2027); **24/11 "Ngày Văn hoá Việt Nam"** from 2026 (NQ 28/2026/QH16).
Both Giỗ Tổ rows ship `isConfirmed=false` — a lunar-calendar computation, not an official
announcement. **The UI must surface unconfirmed holidays each year.**

## 7. `/api/hr/payroll/overtime-schedule` — `HR.ViewPayroll`

The bảng kê required by NĐ 253/2026 Đ.26.1: without it the tax-free overtime of §3 is not
defensible.

| Method | Path | Notes |
|---|---|---|
| GET | `?year=&month=` | `OvertimeScheduleDto` — per employee: hourly rate, hours split weekday / rest day / holiday and the same three again at night, total hours, total pay, exempt hours, exempt pay, taxable pay; plus `monthlyLimitHours` (40), `yearlyLimitHours` (200) and `legalBasis` |
| GET | `/export?year=&month=` | same data as UTF-8-BOM CSV, `bang-ke-lam-them-YYYY-MM.csv`, fields neutralised against CSV injection |

## 8. `GET /api/reports/pit-settlement?year=` — form 05/KK-TNCN — `Reporting.ViewFinancial`

A **legal filing**. It used to carry `const personalDeduction = 11_000_000m`, its own seven-band
table, and **no dependant relief at all**. It now calls HR's `PitFinalizationService`, i.e. the
same `IStatutoryParameterProvider` and the same `PitCalculator` as the monthly payslips, with
parameters resolved at **31 December of the settlement year**; the local `CalculatePit` is gone.

Response: `{ reportType:"05/KK-TNCN", year, parametersAsOf, summary{...}, employees[...],
pitBrackets[{upToMonthly,upToAnnual,rate,rateLabel}], legalBasis }`. Per employee:
`taxCode, monthsWorked, totalTaxableIncome, insuranceDeduction, personalDeduction,
dependentDeduction, dependentMonthCount, assessableIncome, pitTax, pitWithheld,
pitOverpayment, pitShortfall`.

Observed on :5050: `year=2026 → asOf 2026-12-31, 15.500.000/mo = 186.000.000/yr, dependent
6.200.000, 5 bands`; `year=2025 → asOf 2025-12-31, 11.000.000/mo = 132.000.000/yr, 4.400.000,
7 bands`. D06 TV6 (30M × 12, 0 dependants, 2026) = annual PIT **7.620.000**.

## 9. Payroll engine surface that W3-6 must render

`PayrollRun` now always carries `PayDate` (default: day `PAYROLL_PAY_DAY`, 5, of the following
month). It is a legal input, not decoration: **insurance, the regional minimum and the overtime
multipliers resolve on the 1st of the payroll month; PIT resolves on the pay date** (Luật 109
Đ.8.3 — income is determined when it is paid). `POST /api/hr/payroll/runs` accepts `payDate`.

`Payroll` gains `StatutorySnapshotJson`, `PayDate`, `PitMethod`, `TaxableGrossIncome`.
`PitMethod` ∈ `Progressive | Flat10 | NonResident20`, decided per contract:

- **`IsStandaloneProbation = true`** (a separate probation contract, BLLĐ Đ.24) → no compulsory
  insurance at all (NĐ 158/2025 Đ.3.5, Luật 74/2025 Đ.31.2) **and** `Flat10`, only when the
  payment reaches `PIT_FLAT_THRESHOLD` (5.000.000 from 2026); with a `HasPitCommitment` → 0.
- Probation terms written **inside** a normal employment contract → **full insurance**, and a
  contract of ≥ 3 months is **progressive**. `ContractType.Probation` alone decides nothing.
- `Employee.IsTaxResident=false` → `NonResident20` (20% of gross, no relief).

Payslip lines W3-6 must show: `"Làm thêm Xh (miễn thuế Yh = Z đ)"`, the 10% withholding when
`Flat10`, and the insurance cap basis. Guards that return 400 on save: a full-time contract
below the regional minimum wage, probation pay below `PROBATION_MIN_RATIO` (85%) of the
official salary.

## 10. Known gaps (do not assume these work)

- `AttendanceAggregationService` (W2-7's file) still derives standard work days and the OT day
  type from the **old `VNHolidayCalendar`** — so the corrected Giỗ Tổ dates and 24/11 do not yet
  reach timesheet aggregation — and it treats Sunday as the weekly rest day instead of reading
  the shift calendar, and never calls `MonthlyTimesheet.SetNightOvertimeBreakdown`. The domain
  and the engine accept the three-way night split; the producer does not fill it yet.
  Filed as integration requests to W2-7 (see `reports/integration-requests-w2.md`).
- 8 of the 30 codes in force resolve to `isVerified=false` (12 rows in total) (D06 CHƯA XÁC MINH): the meal cap 730.000, the old
  10% threshold 2.000.000, the 2024 regional minimums, union dues, the health/unemployment
  suspension at 14 unpaid days, the OT hour limits, the 85% probation ratio, and both Giỗ Tổ
  dates. None of them is branched in code — the accountant changes a row.
