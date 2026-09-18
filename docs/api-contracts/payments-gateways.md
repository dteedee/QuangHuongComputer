# API contract — Payment gateways (VNPay)

**Owner:** W2-21 (`backend/Services/Payments/Application/Providers/VnPay/**`,
`backend/Services/Payments/Infrastructure/VNPay/**`).
Companion to `docs/api-contracts/payments.md` (W2-4), which owns `/methods`, `/initiate`,
`GET /payments/{id}`, refunds and the money rules. This document adds only the two VNPay
gateway routes and the provider behaviour behind them.
**Status:** written 2026-09-18. VNPay is **dark**: no `TmnCode`/`HashSecret` exists yet, so on the
launch database the provider is absent everywhere. See §5.

Error bodies follow `docs/api-conventions.md` §1 (RFC 9457). **Branch on `code`.**
The two routes below are the exception: VNPay is not an API client and does not read RFC 9457.

---

## 0. Who is allowed to write a payment result

| caller | route | writes state? |
|---|---|---|
| VNPay servers (server-to-server, HTTPS) | `GET /api/payments/v2/vnpay/ipn` | **yes — the only writer** |
| the customer's browser | `GET /api/payments/v2/vnpay/return` | **no, structurally** |
| reconciliation job (`querydr`) | none (internal) | yes, through the same handler |

The return handler takes no `PaymentsDbContext`, no `PaymentWebhookHandler` and no bus — it
*cannot* write. A customer who closes the tab, replays the return URL, or edits
`vnp_ResponseCode` changes nothing. The frontend learns the outcome by polling
`GET /api/payments/{id}` (W2-4's contract).

---

## 1. `GET /api/payments/v2/vnpay/ipn` — anonymous, called by VNPay only

**Verb is GET.** VNPay's IPN is a GET with the result in the query string; a POST-only route makes
every real notification 404 and payments silently never confirm. The URL registered with VNPay must
be **HTTPS**.

Query: the standard `vnp_*` set — `vnp_TmnCode`, `vnp_Amount`, `vnp_TxnRef`, `vnp_TransactionNo`,
`vnp_ResponseCode`, `vnp_TransactionStatus`, `vnp_PayDate`, `vnp_BankCode`, `vnp_SecureHash`.

Response: **always HTTP 200** with `{"RspCode":"..","Message":".."}` — VNPay reads `RspCode`, not the
HTTP status. The one exception is 503 (§5).

| `RspCode` | when | VNPay's reaction |
|---|---|---|
| `00` Confirm Success | signature + amount + order all valid, result recorded for the first time | **stops** |
| `02` Order already confirmed | the same `(vnp_TxnRef, vnp_TransactionNo)` was already processed | **stops** |
| `01` Order not found | `vnp_TxnRef` yields no intent id, or no such intent (also: a replay of an IPN whose first attempt found no intent) | retries |
| `04` Invalid amount | `vnp_Amount / 100` ≠ `intent.Amount`, or `vnp_Amount` unparseable. **Nothing is confirmed**; accounting reconciles by hand | retries |
| `97` Invalid Checksum | signature missing, wrong, or `HashSecret` not configured | retries |
| `99` Unknown error | any unexpected exception — deliberately retryable, so a notification is never swallowed | retries |

VNPay retries a non-terminal code up to **10 times, 5 minutes apart**.

Order of checks (no shortcuts): signature → `vnp_TxnRef` → amount → dedupe → record.
A transaction counts as paid only when **both** `vnp_ResponseCode` and `vnp_TransactionStatus`
are `00`.

**Dedupe key** is `{vnp_TxnRef}:{vnp_TransactionNo}`, not `vnp_TransactionNo` alone: VNPay returns
`vnp_TransactionNo=0` for every failed transaction, so the bare field would collide across unrelated
orders and the second one would be wrongly skipped.

---

## 2. `GET /api/payments/v2/vnpay/return` — anonymous, the customer's browser

Verifies the signature server-side, then **302**s to the frontend. Never writes.

| case | redirect |
|---|---|
| signature valid, `00/00` | `{frontend}/payment/result?paymentId={guid:N}&outcome=pending&code=00` |
| signature valid, anything else | `…&outcome=failed&code={vnp_ResponseCode}` |
| signature invalid/missing | `{frontend}/payment/result?error=INVALID_SIGNATURE` (no order data leaked) |
| `vnp_TxnRef` unparseable | `…?error=INVALID_TXN_REF` |
| gateway not configured | `…?error=PAYMENT_GATEWAY_NOT_CONFIGURED` |

`outcome=pending` is correct **even when VNPay says `00`** — only the IPN confirms. The frontend
polls `GET /api/payments/{id}` until a real status appears.

---

## 3. `vnp_TxnRef` layout

`{intentId:N}{yyMMddHHmmss}` — 32 hex chars + 12 digits, VN local time of creation.
- VNPay requires `vnp_TxnRef` to be unique per day, but one intent may be retried, hence the suffix.
- The first 32 chars always recover the intent id, so the IPN needs no lookup table.
- The suffix is exactly the `vnp_CreateDate` that was sent, so `querydr`/`refund` can supply the
  required `vnp_TransactionDate` without guessing.

`vnp_Amount` is the smallest unit (VND × 100). `vnp_OrderInfo` is ASCII-folded (Vietnamese
diacritics stripped, `Đ`/`đ` mapped to `D`/`d` — they are single code points and do *not* decompose
under NFD). `vnp_ExpireDate` = `Payment:VNPay:ExpireMinutes` (default **15**).

---

## 4. Internal: `querydr` reconciliation and `refund`

`VnPayReconciliationJob` (hosted service) asks `querydr` about intents still `Pending` after
`Payment:VNPay:QueryAfterMinutes` (default **20**), in batches of 50, every
`max(5, QueryAfterMinutes/2)` minutes. It confirms only when the gateway says paid **and** the
amount matches, and writes through the *same* `PaymentWebhookHandler` as the IPN — so a late IPN
cannot credit the money twice. Without this job a paid intent could sit at `Pending` until W2-4's
expiry job cancels an order the customer already paid for.

`RefundAsync` sends `transactionType` **02** (full) or **03** (partial), derived from
`intent.AmountRefunded + amount >= intent.Amount`. It feeds W2-4's `PaymentRefund`. On *any*
ambiguity — transport error, unverifiable response signature, gateway rejection, or a refund not yet
completed — it returns `GatewayRefundResult.Failed` with an explicit instruction to check the VNPay
portal **before** paying by hand. It never reports a refund it could not verify.

Signatures: query/callback params use HMAC-SHA512 over ordinal-sorted, URL-encoded `vnp_*=value`
pairs (empty values and the hash fields excluded). `merchant_webapi` uses a `|`-joined field list in
documented order, unencoded. Both compare with `CryptographicOperations.FixedTimeEquals`.
`WebUtility.UrlEncode` (uppercase hex) is required — `HttpUtility` emits lowercase hex and every
real IPN would be rejected with `97`.

---

## 5. Configuration, and what "dark" means

| key | required | default |
|---|---|---|
| `Payment:VNPay:TmnCode` | **yes** | — |
| `Payment:VNPay:HashSecret` | **yes**, environment only | — |
| `Payment:VNPay:PaymentUrl` | no | `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html` |
| `Payment:VNPay:ApiUrl` | no | `https://sandbox.vnpayment.vn/merchant_webapi/api/transaction` |
| `Payment:VNPay:ExpireMinutes` | no | 15 (clamped 5–1440) |
| `Payment:VNPay:QueryAfterMinutes` | no | 20 (clamped 5–1440) |
| `Payment:VNPay:PublicBaseUrl` | no | request host |

Secrets come from the environment only — the repo is public. They are never logged, never stored in
the database and never returned by any endpoint. A placeholder (`${VNPAY_HASH_SECRET}`, `DEMO…`,
empty) counts as **not configured**; there is no mock success path.

`PaymentConfigGuard` refuses a `sandbox.vnpayment.vn` host under
`ASPNETCORE_ENVIRONMENT=Production` unless `Payment:AllowSandbox=true`.

**While unconfigured** (today): `vnpay` is absent from `GET /api/payments/methods`;
`POST /api/payments/initiate` with `provider:"vnpay"` returns **400 `PAYMENT_METHOD_UNAVAILABLE`**
(the method gate runs before the order lookup, so this holds even for a non-existent order);
the IPN route returns **503 `PAYMENT_GATEWAY_NOT_CONFIGURED`**; the reconciliation job logs
"BỎ QUA" once and makes no network call.

The admin settings screen (W3-19) shows "configured / missing: …" and the IPN URL to register with
VNPay — **never** a secret input box.
