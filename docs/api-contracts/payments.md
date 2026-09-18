# API contract — Payments

**Owner:** W2-4 (`backend/Services/Payments/**`). VNPay routes are added by W2-21 into the same
`/api/payments/v2/*` group; nothing else in this document changes when they land.
**Status:** written 2026-09-18. Wave 3 rebuilds the payment UI from this document alone.

Error bodies are the platform contract (`docs/api-conventions.md` §1, RFC 9457
`application/problem+json`). **Branch on `code`, never on the Vietnamese sentence.**
Paging is the platform contract (§3): `?page=&pageSize=&search=&sortBy=&sortDir=`.

## 0. Money rules that the API enforces (not the caller)

| rule | where |
|---|---|
| The amount is **always** `order.TotalAmount` read server-side. `InitiatePaymentDto.Amount` is accepted for backward compatibility and **ignored**. | `PaymentInitiationService` |
| A gateway-reported amount is **compared**, never trusted. Mismatch ⇒ 409, no state change, `ProcessedWebhooks.Result='AmountMismatch'`. | `PaymentWebhookHandler` |
| A provider with no real config is absent from `/methods`, 400 on `/initiate`, 503 on its webhook. There is no mock success path. | `PaymentConfigGuard` + `PaymentProviderRegistry` |
| `Succeeded` is terminal; only refunds move it on. `AmountRefunded <= Amount` is a DB check constraint. | `PaymentIntent`, migration `20260918190000` |
| An incoming transfer is auto-confirmed **only** on payment-code **and** exact amount. Amount alone is a *suggestion* for a human. | `SePayPaymentMatcher` |

## 1. Public

### `GET /api/payments/methods` — anonymous, `Cache-Control: public, max-age=60`
The single source of truth for checkout, footer, PDP, policy pages and POS. Never hardcode a list.

```json
[{ "code":"cod", "name":"Thanh toán khi nhận hàng", "description":"…",
   "requiresRedirect":false, "direct":true, "sortOrder":10 }]
```

| `code` | enabled by | `direct` |
|---|---|---|
| `cod` | `Payment:Cod:Enabled` (default **true**) | true |
| `bank_transfer` | `Payment:BankTransfer:{Enabled,BankBin,AccountNumber,AccountName}` (legacy aliases `Payment:SePay:{BankCode,AccountNumber}` still accepted) | true |
| `vnpay` | real `Payment:VNPay:{TmnCode,HashSecret}` **and** a registered `IPaymentProvider` (W2-21) | true |
| `installment` | `Sales:Installment:Partners` non-empty (D10/W2-20) | **false** |

`direct:false` means the storefront must send the customer to the installment application flow;
`/initiate` answers `400 PAYMENT_METHOD_NOT_DIRECT`. On the current dev/launch data the response is
exactly `[cod]`.

## 2. Customer

Group `/api/payments` requires authentication; ownership is checked inside each handler.

### `POST /api/payments/initiate`
Body `{ orderId, amount (ignored), provider (enum int), bankCode? }`.
Access: order owner, or staff with `Payments.View` / `Sales.ViewAll`.

```json
{ "paymentId":"…", "status":"Pending", "amount":10000000, "reused":false,
  "kind":"bank_transfer", "paymentUrl":"", "paymentCode":"QH7K3MQD9A",
  "expiresAt":"2026-09-19T12:00:00Z",
  "transfer":{ "bankBin":"970422","bankName":"MB Bank","accountNumber":"…","accountName":"…",
               "amount":10000000,"paymentCode":"QH7K3MQD9A","qrPayload":"000201010212…",
               "qrImageUrl":"/api/payments/{id}/qr.png","expiresAt":"…","notice":"Bắt buộc ghi đúng…" },
  "message":null }
```

`kind` is `none` (COD), `bank_transfer` (VietQR) or `redirect` (gateway → use `paymentUrl`).
**D04 §3b:** the screen must always show account number, account name, bank, amount and the payment
code with a copy button *beside* the QR — some banking apps drop the amount and the memo when
scanning. An existing `Pending` intent for the same (order, provider) is reused (`reused:true`).

Errors: `PAYMENT_METHOD_UNAVAILABLE` 400 · `PAYMENT_METHOD_NOT_DIRECT` 400 · `NOT_FOUND` 404 ·
`FORBIDDEN` 403 · `ORDER_CANCELLED` / `ORDER_ALREADY_PAID` / `INVALID_ORDER_AMOUNT` /
`COD_LIMIT_EXCEEDED` 400 · `PAYMENT_PROVIDER_MISCONFIGURED` 503.

### `GET /api/payments/{id}`
Owner or staff, otherwise **404** (never 403 — it would confirm the id exists).
`{ id, orderId, amount, amountRefunded, currency, status, provider, externalId, paymentCode,
expiresAt, confirmedAt, settlement, createdAt }`. Never returns `clientSecret`.
This is the endpoint the result page **polls**; never trust gateway query parameters.

### `GET /api/payments/{id}/qr.png`
PNG of the VietQR payload, rendered in-process by QRCoder. Requires the same access as above, so a
bare `<img src>` gets 401 — fetch it with the token and use a blob URL, or draw `qrPayload` client-side.
404 when the intent is not a bank transfer or the bank BIN is not configured.

### `POST /api/payments/cod/confirm/{orderId}` — `Payments.CollectCod`
Marks the COD intent paid, sets `settlement=AwaitingRemittance`, publishes `PaymentSucceededEvent`.
404 `NO_PENDING_COD` when there is nothing to collect.

## 3. Guest — `/api/payments/guest/*`, anonymous + signed token

The token is `base64url(orderId|exp).base64url(HMAC-SHA256)` signed with `Payment:GuestToken:Secret`
(**not** the JWT key). It opens exactly one order and expires (default 48h). Minted by Sales at guest
checkout; `Payments.Application.Guest.GuestOrderTokenService.Issue(orderId, ttl)`.

- `POST /api/payments/guest/initiate` — body `{ orderId, token, provider, bankCode? }`, same response as §2.
- `GET /api/payments/guest/{id}?token=…`
- `GET /api/payments/guest/{id}/qr.png?token=…`

Secret unset ⇒ **503 `GUEST_PAYMENT_DISABLED`**. Bad/expired token or a token for another order ⇒
**401 `INVALID_GUEST_TOKEN`**.

## 4. Webhooks — `/api/payments/v2/*`, anonymous, fail-closed

The v1 routes (`/api/payments/{vnpay/callback,sepay/webhook,momo/callback}`, `/api/payments/webhook/mock`)
are deleted and must stay deleted.

| route | verb | auth | notes |
|---|---|---|---|
| `/api/payments/v2/sepay/webhook` | POST | `X-SePay-Signature: sha256=<hex>` over `{timestamp}.{raw body bytes}` + `X-SePay-Timestamp` within ±300s, **or** `Authorization: Apikey <KEY>` compared with `FixedTimeEquals` | only `transferType="in"`; always 200 so SePay stops retrying |
| `/api/payments/v2/vnpay/callback` | GET | HMAC-SHA512 `vnp_SecureHash` | W2-21 adds the IPN (**GET**) |
| `/api/payments/v2/momo/callback` | POST | HMAC-SHA256 `signature` | MoMo is backlog; route stays 503 until keyed |

Every route: secret missing ⇒ **503 `PAYMENT_GATEWAY_NOT_CONFIGURED`** · missing/bad signature ⇒
**401** · gateway amount ≠ intent amount ⇒ **409**, no state change · replay ⇒ handled once
(unique `(Provider, TransactionId)`), second call is a no-op 200.

## 5. Admin — `/api/payments/admin/*`

| route | permission |
|---|---|
| `GET /payments`, `GET /payments/{id}` | `Payments.View` |
| `GET /reconciliation/unassigned`, `POST /reconciliation/assign`, `POST /reconciliation/confirm/{paymentId}`, `POST /reconciliation/cod/settle` | `Payments.Reconcile` |
| `GET /refunds`, `POST /refunds`, `POST /refunds/{id}/{approve,complete,reject}` | `Payments.Refund` |
| `GET /status`, `GET /webhook-urls`, `GET|POST /config`, `GET /sepay-transactions`, `GET /sepay-stats` | `Payments.Configure` |

- `GET /payments` — filters `status`, `provider`, `from`, `to`, plus `search` over payment code /
  external id / bank reference. Returns the platform `PagedResult`.
- `GET /payments/{id}` — `{ payment, webhookTrail[], refunds[] }`. The trail is every
  `ProcessedWebhooks` row for the intent or its order, including `AmountMismatch` and `Ignored`.
- `GET /reconciliation/unassigned` — incoming transfers with no order, each with at most one
  `suggestion` (same amount, still inside the hold window, exactly one candidate).
  **The API never accepts a suggestion by itself** — a human posts `/reconciliation/assign`.
- `POST /reconciliation/assign` `{ transactionId, paymentId }` — 409 when the intent is not `Pending`
  or the amounts differ.
- `POST /reconciliation/confirm/{paymentId}` `{ bankReference }` — manual "money arrived" for the
  no-webhook tier. `bankReference` is mandatory: it is the audit evidence.
- `POST /reconciliation/cod/settle` `{ paymentIds: [] }` — accountant ticks a batch of collected COD
  as remitted.
- Refunds: `POST /refunds` `{ paymentId, amount, reason, channel?, idempotencyKey? }` →
  `Requested`; `approve` (mandatory — `complete` on a `Requested` refund is 409) calls the gateway when one supports it (none at launch) and otherwise leaves
  a manual task; `complete` `{ reference, channel? }` requires a reference and moves the intent to
  `PartiallyRefunded` / `Refunded`.
- `GET /status` and `GET /config` **never** return a secret value: `status` lists missing key *names*
  only, `config` masks any `isSecret` row to `****<last 4>`.
- `GET /webhook-urls` returns the URLs to register with SePay / VNPay.

## 6. Configuration

| key | default | meaning |
|---|---|---|
| `Payment:Cod:Enabled` | `true` | COD on/off |
| `Payment:Cod:MaxOrderAmount` | `0` | COD ceiling; `0` = off, and it is ignored unless another direct method is enabled |
| `Payment:BankTransfer:{Enabled,BankBin,AccountNumber,AccountName,BankName}` | — | BIN is the **6-digit NAPAS code** (VCB 970436, BIDV 970418, MB 970422); anything else is refused and logged |
| `Payment:BankTransfer:HoldHours` | `24` | intent expiry; the hourly job then cancels it and publishes `PaymentFailedEvent` |
| `Payment:SePay:{WebhookSecret,ApiKey}` | — | auto-confirmation tier; absent ⇒ manual reconciliation only |
| `Payment:SePay:{ApiToken,ApiBaseUrl}` | —, `https://my.sepay.vn` | ledger pull for reconciliation |
| `Payment:Reconciliation:{IntervalMinutes,StaleAfterMinutes}` | `60`, `15` | job cadence |
| `Payment:GuestToken:Secret` | — | guest payment; absent ⇒ 503 |
| `Payment:AllowSandbox` | `false` | sandbox hosts are refused under `ASPNETCORE_ENVIRONMENT=Production` unless true |

Secrets come from the environment only (D04 R5) — never the database, never an API response.
At startup the module logs one `ENABLED` / `DISABLED (thiếu: <key names>)` line per provider and
never logs a value.

## 7. Events

| event | direction |
|---|---|
| `PaymentSucceededEvent` | published on webhook success, COD collection and manual confirmation |
| `PaymentFailedEvent` | published on webhook failure and on hold expiry (Sales cancels the order and releases stock) |
| `RefundRequestedEvent` | consumed by `RefundRequestedConsumer` → creates a `PaymentRefund` |
| `PaymentRefundedEvent` | **not published yet** — the contract does not exist in `BuildingBlocks`; see the W2-4 integration request |
