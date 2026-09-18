import type { AxiosError } from 'axios';

/**
 * `normalizeApiError` — one error shape for the whole app.
 *
 * Target contract (W1-3, `phase-12-w1-platform-kernel.md`): RFC 9457
 * ProblemDetails + `errors: [{ field, code, message }]` + `traceId`. W1-3 lands
 * in parallel with this track, so this also tolerates the shapes already live
 * in the API today, until wave 2 finishes migrating every endpoint:
 *   1. `{ error: string }` / `{ Error: string }`               (current GlobalExceptionHandlingMiddleware)
 *   2. `{ message: string }` / `{ Message: string }`
 *   3. `{ errors: Record<string, string[]> }`                  (ASP.NET Core default ValidationProblemDetails)
 *   4. `{ errors: [{ description, code? }] }`                  (ASP.NET Identity IdentityResult, wrapped)
 *   5. `{ title, detail }` with no `errors` field               (bare ProblemDetails)
 *   6. `[{ description, code? }]` — the SAME IdentityResult.Errors, but as the
 *      WHOLE response body with no `{ errors: [...] }` wrapper at all. This is
 *      what `POST /api/auth/register` actually returns today
 *      (`Results.BadRequest(result.Errors)`, confirmed live against TEST :5050,
 *      2026-09-18) — shape 4's envelope is aspirational for this endpoint, not
 *      real, so both are handled.
 */

export interface NormalizedApiError {
  /** HTTP status, or null for a network/timeout failure that never got a response. */
  status: number | null;
  /** Vietnamese, user-facing summary — safe to render directly. */
  message: string;
  /** Field name -> message, for wiring into a form (`applyServerErrors`, W1-9). */
  fieldErrors: Record<string, string>;
  /** Machine-readable error code, when the API sends one. */
  code?: string;
  /** Correlation id to quote back to support/logs; never log the raw response body. */
  traceId?: string;
  /** Seconds to wait before retrying, parsed from a 429's `Retry-After` header or body. */
  retryAfter?: number;
}

declare module 'axios' {
  interface AxiosError {
    /** Attached once by the response interceptor in `api/client.ts`. */
    normalized?: NormalizedApiError;
  }
}

const STATUS_FALLBACK_MESSAGES: Record<number, string> = {
  400: 'Dữ liệu gửi lên không hợp lệ.',
  401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác này',
  404: 'Không tìm thấy dữ liệu yêu cầu.',
  409: 'Dữ liệu đã bị thay đổi bởi thao tác khác. Vui lòng tải lại và thử lại.',
  422: 'Dữ liệu gửi lên không hợp lệ.',
  429: 'Bạn đang thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
};
const NETWORK_ERROR_MESSAGE = 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.';
const GENERIC_SERVER_ERROR_MESSAGE = 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';

/** New-contract field error: `{ field, code, message }` (W1-3). */
interface NewShapeFieldError {
  field?: unknown;
  code?: unknown;
  message?: unknown;
}

/** ASP.NET Identity `IdentityResult.Errors`: `{ code?, description }`, no field. */
interface IdentityShapeError {
  description?: unknown;
  code?: unknown;
}

interface KnownErrorBody {
  type?: string;
  title?: string;
  detail?: string;
  status?: number;
  traceId?: string;
  TraceId?: string;
  error?: string;
  Error?: string;
  message?: string;
  Message?: string;
  code?: string;
  retryAfter?: number;
  errors?: Record<string, string[]> | Array<NewShapeFieldError | IdentityShapeError>;
}

function extractFieldErrorsAndSummary(
  errors: KnownErrorBody['errors']
): { fieldErrors: Record<string, string>; summary?: string } {
  const fieldErrors: Record<string, string> = {};
  if (!errors) return { fieldErrors };

  if (Array.isArray(errors)) {
    const descriptions: string[] = [];
    for (const entry of errors) {
      const asNewShape = entry as NewShapeFieldError;
      if (typeof asNewShape.field === 'string' && typeof asNewShape.message === 'string') {
        // New contract: {field, code, message}.
        fieldErrors[asNewShape.field] = asNewShape.message;
        continue;
      }
      const asIdentityShape = entry as IdentityShapeError;
      if (typeof asIdentityShape.description === 'string') {
        // IdentityResult errors carry no field — they are form-level, not per-field.
        descriptions.push(asIdentityShape.description);
      }
    }
    return { fieldErrors, summary: descriptions.length > 0 ? descriptions.join('. ') : undefined };
  }

  // ASP.NET Core default ValidationProblemDetails: Record<field, string[]>.
  for (const [field, messages] of Object.entries(errors)) {
    if (Array.isArray(messages) && messages.length > 0) {
      fieldErrors[field] = messages.join('. ');
    }
  }
  return { fieldErrors };
}

function parseRetryAfter(error: AxiosError<KnownErrorBody>): number | undefined {
  const header = error.response?.headers?.['retry-after'];
  if (typeof header === 'string' && header.trim() !== '') {
    const seconds = Number(header);
    if (!Number.isNaN(seconds)) return seconds;
  }
  const bodyValue = error.response?.data?.retryAfter;
  return typeof bodyValue === 'number' ? bodyValue : undefined;
}

export function normalizeApiError(error: unknown): NormalizedApiError {
  const axiosError = error as AxiosError<KnownErrorBody>;
  const status = axiosError?.response?.status ?? null;
  const rawData: unknown = axiosError?.response?.data;

  if (status === null) {
    return { status: null, message: NETWORK_ERROR_MESSAGE, fieldErrors: {} };
  }

  // Shape 6: some endpoints hand back the IdentityError[]/field-error[] array
  // as the ENTIRE body, not wrapped in `{ errors: [...] }` — `data?.errors`
  // would be undefined for those (arrays have no `.errors` property), silently
  // dropping the real validation message. Detect that case before reading any
  // other field off `data`.
  const isBareErrorArray = Array.isArray(rawData);
  const data = isBareErrorArray ? undefined : (rawData as KnownErrorBody | undefined);
  const errorsSource = isBareErrorArray
    ? (rawData as Array<NewShapeFieldError | IdentityShapeError>)
    : data?.errors;

  const { fieldErrors, summary } = extractFieldErrorsAndSummary(errorsSource);

  const message =
    summary ||
    data?.message ||
    data?.Message ||
    data?.error ||
    data?.Error ||
    data?.title ||
    STATUS_FALLBACK_MESSAGES[status] ||
    (status >= 500 ? GENERIC_SERVER_ERROR_MESSAGE : GENERIC_SERVER_ERROR_MESSAGE);

  return {
    status,
    message,
    fieldErrors,
    code: data?.code,
    traceId: data?.traceId || data?.TraceId,
    retryAfter: status === 429 ? parseRetryAfter(axiosError) : undefined,
  };
}
