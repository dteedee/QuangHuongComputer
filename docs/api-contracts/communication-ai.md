# API contract — Communication + AI

**Owner:** W2-15 (`backend/Services/Communication/**`, `backend/Services/Ai/**`, incl. their
DbContexts + migrations). **Status:** written 2026-09-18. Core notification-read-state and AI
guardrail bugs fixed this track; chat close/reopen/transfer/read-receipts added; templates CRUD +
Scriban rendering, guest sessions and a named `ai` rate-limit policy are NOT done (see §6
Unresolved). Error bodies: `{ "error": "<message>" }` (pre-existing convention, unchanged).

## 0. What changed this track (W2-15)

- **Notification read state is per-user now.** Before: `NotificationLog.IsRead` lived on the row
  itself; a role-targeted notification (`TargetRoles` set, `UserId = Guid.Empty`) is ONE row shared
  by every caller whose role matches, so one Sale user reading it marked it read for every other
  Sale/Admin/Manager. New table `communication.NotificationReads(NotificationLogId, UserId,
  ReadAt)`, unique on `(NotificationLogId, UserId)`. `GET /api/notifications` also used to return
  every role-targeted row to every caller regardless of role (`n.UserId == userGuid || n.UserId ==
  Guid.Empty`, no role check at all) - now filtered by `TargetRoles` ∩ caller's roles.
  `POST /api/notifications/{id}/read` now 404s (returns `false`) if the notification is not the
  caller's own and does not match one of their roles - previously it had no ownership check.
- **Customer-facing notification consumers exist.** Before: only 3 staff-facing consumers
  (`NotificationConsumers.cs`: OrderCreated, PaymentSucceeded, PaymentFailed - all staff-only).
  New `Consumers/CustomerLifecycleNotificationConsumers.cs`: `OrderShippedEvent`,
  `OrderDeliveredEvent`, `OrderCancelledEvent`, `RepairCompletedEvent`,
  `WarrantyClaimUpdatedEvent` -> in-app notification (`SendToUserAsync`) + e-mail via
  `IEmailSender.QueueAsync` (resolves the customer's e-mail through
  `Identity.Services.IUserDirectory`, not `BuildingBlocks.Contracts.IUserDirectory` - see §6).
  `LowStockEvent` -> staff-only (Admin/Manager), in-app. `OrderShippedEvent`/`OrderDeliveredEvent`/
  `OrderCancelledEvent` are genuinely published by Sales already (checked
  `Sales/Application/Orders/OrderEventPublisher.cs`, `OrderLifecycleService.cs:185`).
  `RepairCompletedEvent`/`WarrantyClaimUpdatedEvent` are contracts only - Repair/Warranty do not
  publish them yet (pre-existing, not this track's scope), so those two consumers are wired but
  currently never fire.
- **AI chatbot false-block fixed.** Before: a flat keyword blocklist (`_disallowedTopics`
  including `"admin"`, `"nhân viên"`, `"database"`, ...) refused any question containing one of
  those substrings - "Tư vấn laptop cho nhân viên văn phòng tầm 15 triệu" (this phase's own
  Success Criteria example) was blocked. `Ai/Application/AiGuardrails.cs` replaces it with a
  narrow regex set that only matches explicit prompt-injection / credential-exfiltration intent
  (e.g. "bỏ qua chỉ dẫn", "mật khẩu của admin", "dump database schema").
- **Configured-key detection.** `AiGuardrails.IsConfiguredApiKey` treats empty, an unresolved
  `${...}` placeholder, `your-...`, `changeme`/`changeit`, or anything under 8 chars as "not
  configured" and returns the graceful fallback message + product-search results instead of
  calling Gemini and failing.
- **Product retrieval is SQL-side.** `Ai/Application/ProductRetrievalService.cs` replaces the old
  `SELECT "Id","Name" FROM "Products" WHERE "IsActive"=true` (no LIMIT - every active product
  loaded into C# memory, then scored in a loop) with parameterized ILIKE + `qh_unaccent_immutable`
  queries scored and `LIMIT`-ed in Postgres (max 5 rows fetched).
- **`POST /api/ai/search` accepts `query` OR `message`.** FE has two call sites
  (`frontend/src/api/ai.ts:33` sends `{message}`, `:51` sends `{query}`) - the first 400'd on every
  call. Endpoint is unchanged otherwise: ILIKE keyword search, `AllowAnonymous`.
- **Chat: in-process AI, real read receipts, close/reopen/transfer.**
  `Communication/Application/AiChatService.cs` called `Ai`'s own HTTP endpoint over loopback
  (`http://localhost:5000/api/ai/chat`) from inside the same process, had no access check, and
  only persisted the AI's reply (never the customer's question). Now calls `Ai.Application.
  IAiService` in-process, persists both messages, and checks `Conversation.CanBeAccessedBy`.
  `ChatHub.MarkAsRead(messageId)` was a no-op stub (echoed `"MessageRead"` without persisting
  anything) - now persists `ChatMessage.IsRead`/`ReadAt` and broadcasts to the conversation room.
  Added hub methods `CloseConversation`, `ReopenConversation`, `TransferConversation` (the domain
  already had `Conversation.Close()/Reopen()`, unused until now) - staff/Admin only.
- **Dead code removed**: `Ai/Infrastructure/EmbeddingService.cs` (`SimpleEmbeddingService`),
  `Ai/Domain/ProductEmbedding.cs`, `Ai/Domain/SearchEntry.cs` + their tables (migration
  `W2_15_DropDeadEmbeddingTables`) - confirmed nothing ever wrote a row to either table.
- **Both DbContexts now call `PostgreSQLConfig.ConfigureCommonColumnProperties`** (they were the
  only 2 of 13 contexts not calling it per `w1-11-report.md`) - without it, the first
  `dotnet ef migrations add` here scaffolded an unrelated mass `timestamptz` ALTER across every
  column in both schemas; stripped once this call was added.

## 1. Notifications — `/api/notifications` (`SecurityPolicies.Authenticated`)

| Method | Path | Notes |
|---|---|---|
| GET | `/?page=&pageSize=` | own notifications + role-targeted rows whose `TargetRoles` ∩ caller's roles. `IsRead` is per-caller. |
| GET | `/unread-count` | same visibility rule as above |
| POST | `/{id}/read` | 404 if not visible to caller (ownership/role check); idempotent |
| POST | `/read-all` | marks all visible-to-caller unread notifications read, for that caller only |

Visibility/read-state scan is bounded to the most recent 1000 candidate rows
(`NotificationService.BroadcastCandidateWindow`) - a caller's own notifications are never capped,
only the shared role-targeted pool. Documented limitation, not a silent truncation: acceptable at
current notification volume, flagged for a proper SQL-side `TargetRoles` predicate later.

## 2. Chat — `/api/chat` (`SecurityPolicies.Authenticated`) + SignalR `ChatHub`

REST: `GET /conversations`, `GET /conversations/{id}`, `GET /conversations/unassigned`
(`CRM.ViewCustomers`), `POST /ai/ask` (body `{conversationId, question}`, 400 if empty/>1000
chars, 403 if caller cannot access the conversation, 404 if conversation not found).

SignalR hub methods (all require `SecurityPolicies.Authenticated`; support-staff-only ones need
`CRM.ViewCustomers` or Admin): `SendMessage(conversationId, text)` (400 if empty/>4000 chars, 403
if closed or no access), `StartConversation()` (Customer role only), `AssignConversation(id)`,
`MarkAsRead(messageId)` (persists, broadcasts `MessageRead(messageId, readerId)` to the room),
`CloseConversation(id)` / `ReopenConversation(id)` (broadcast `ConversationClosed`/
`ConversationReopened`), `TransferConversation(id, toUserId, toUserName)` (broadcast
`ConversationTransferred`), `UserTyping(id)`.

**Not done**: message paging (`GET /conversations/{id}` still returns the full message list),
signed guest/visitor sessions for anonymous chat.

## 3. AI — `/api/ai` (mostly `AllowAnonymous`)

| Method | Path | Notes |
|---|---|---|
| POST | `/chat` | body `{message}`, 400 if empty/>1000 chars. `AllowAnonymous`. |
| POST | `/search` | keyword (ILIKE+unaccent) search, body `{query}` or `{message}` (alias), 400 if both empty. `AllowAnonymous`. Name kept for URL compatibility - NOT semantic/vector search. |
| GET | `/recommendations/{productId}` | hybrid collaborative+content-based |
| GET | `/recommendations/trending` | public |
| GET | `/recommendations/personalized` | requires auth |

`AiGuardrails.MaxQuestionLength = 1000`. No named `ai` rate-limit policy exists yet (§6).

## 4. Domain notes

- `NotificationLog.TargetRoles`: comma-separated role names, no spaces added by
  `SendToRolesAsync`. Matched via `Split(',').Any(callerRoles.Contains)`, case-insensitive.
- `Conversation.CanBeAccessedBy(userId, roles)`: customer owns their own; Admin sees all; Sale
  sees unassigned + their own assignments; every other role is default-deny (own conversations
  only, i.e. never - staff roles other than Sale/Admin only reach conversations via
  `CRM.ViewCustomers`-gated endpoints, not this check).

## 5. Security

- Notification/chat visibility is default-deny + explicit ownership/role checks on every read and
  write path listed above (Security Considerations in the phase file).
- The AI assistant has no tools and no write access; guardrails are a narrow injection/
  exfiltration regex (§0) plus the system prompt instructing Gemini to ignore attempts to change
  its own rules.

## 6. Unresolved / not done this track

- **Templates CRUD + Scriban rendering (Implementation Step 3)**: not started. Notification/e-mail
  bodies in the new consumers are plain interpolated strings, not rendered from
  `NotificationTemplate` rows.
- **Named `ai` rate-limit policy (W0-2)**: not wired. `/api/ai/*` and `/api/chat/ai/ask` have no
  rate limiting beyond whatever global policy already applies.
- **Guest/visitor chat sessions** (signed visitor id for anonymous chat): not implemented -
  `StartConversation` still requires the `Customer` role.
- **D08** (order-confirmation email carries a link to the exact policy version agreed to; delivery
  email carries an "add invoice details" link): **not implemented, not faked**. Neither a
  policy-version store nor an invoice-details FE route exists anywhere in the codebase (checked
  `frontend/src` for `bao-hanh-doi-tra`/`hoa-don` routes - none). Inventing a URL to put in a real
  customer e-mail would be a fabricated link, which the phase's own D12 §7 forbids. New consumer
  e-mails omit these links; filed for whichever track owns policy versioning / the invoice FE flow.
- **`BuildingBlocks.Contracts.IUserDirectory` has zero DI registrations** (pre-existing, blocks
  TEST API boot entirely as of 2026-09-18 - see `integration-requests-w2.md` #21 and this track's
  report). New consumers here use `Identity.Services.IUserDirectory` instead (the one actually
  registered), so they are not blocked by this, but full runtime HTTP verification of this
  track's endpoints was blocked by it (API never reaches "healthy" on :5050).
- **Message paging, per-user unread badge push on connect**: not implemented.
