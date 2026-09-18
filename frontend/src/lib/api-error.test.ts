import { describe, it, expect } from 'vitest';
import { normalizeApiError } from './api-error';

/** Minimal shape `normalizeApiError` actually reads off an AxiosError. */
function fakeError(opts: {
  status?: number;
  data?: unknown;
  headers?: Record<string, string>;
  noResponse?: boolean;
}) {
  if (opts.noResponse) return {} as never;
  return {
    response: { status: opts.status, data: opts.data, headers: opts.headers ?? {} },
  } as never;
}

describe('normalizeApiError', () => {
  it('has no response -> network error, status null', () => {
    const result = normalizeApiError(fakeError({ noResponse: true }));
    expect(result.status).toBeNull();
    expect(result.message).toContain('kết nối');
    expect(result.fieldErrors).toEqual({});
  });

  it('new contract: errors[{field, code, message}] -> fieldErrors keyed by field', () => {
    const result = normalizeApiError(
      fakeError({
        status: 400,
        data: {
          title: 'Bad Request',
          traceId: 'trace-1',
          errors: [{ field: 'email', code: 'required', message: 'Email là bắt buộc' }],
        },
      })
    );
    expect(result.status).toBe(400);
    expect(result.fieldErrors).toEqual({ email: 'Email là bắt buộc' });
    expect(result.traceId).toBe('trace-1');
  });

  it('legacy shape 1: { error }', () => {
    const result = normalizeApiError(fakeError({ status: 401, data: { error: 'Sai mật khẩu' } }));
    expect(result.message).toBe('Sai mật khẩu');
  });

  it('legacy shape 2: { message }', () => {
    const result = normalizeApiError(fakeError({ status: 400, data: { message: 'Không hợp lệ' } }));
    expect(result.message).toBe('Không hợp lệ');
  });

  it('legacy shape 3: ASP.NET ValidationProblemDetails errors as Record<field, string[]>', () => {
    const result = normalizeApiError(
      fakeError({
        status: 400,
        data: { title: 'One or more validation errors occurred.', errors: { Email: ['Email is required.'] } },
      })
    );
    expect(result.fieldErrors).toEqual({ Email: 'Email is required.' });
  });

  it('legacy shape 4: ASP.NET Identity errors as [{description}], no field', () => {
    const result = normalizeApiError(
      fakeError({ status: 400, data: { errors: [{ code: 'DuplicateEmail', description: 'Email đã tồn tại.' }] } })
    );
    expect(result.fieldErrors).toEqual({});
    expect(result.message).toBe('Email đã tồn tại.');
  });

  it('legacy shape 5: bare ProblemDetails, title/detail only', () => {
    const result = normalizeApiError(fakeError({ status: 404, data: { title: 'Not Found' } }));
    expect(result.message).toBe('Not Found');
  });

  it('legacy shape 6: bare IdentityError[] as the WHOLE body, no {errors:[...]} envelope (live shape of POST /api/auth/register on a weak password, confirmed against TEST :5050 2026-09-18)', () => {
    const result = normalizeApiError(
      fakeError({ status: 400, data: [{ code: 'PasswordTooShort', description: 'Passwords must be at least 6 characters.' }] })
    );
    expect(result.message).toBe('Passwords must be at least 6 characters.');
  });

  it('403 with no body -> the fixed Vietnamese permission message', () => {
    const result = normalizeApiError(fakeError({ status: 403, data: {} }));
    expect(result.message).toBe('Bạn không có quyền thực hiện thao tác này');
  });

  it('429 -> retryAfter parsed from the Retry-After header', () => {
    const result = normalizeApiError(fakeError({ status: 429, data: {}, headers: { 'retry-after': '30' } }));
    expect(result.retryAfter).toBe(30);
  });

  it('500 with no body -> generic Vietnamese message, never leaks a stack trace', () => {
    const result = normalizeApiError(fakeError({ status: 500, data: {} }));
    expect(result.message).toBe('Đã có lỗi xảy ra. Vui lòng thử lại sau.');
  });
});
